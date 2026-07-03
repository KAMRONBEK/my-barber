/**
 * Minimal in-memory Firestore mock for Jest (subset of Admin SDK behavior used by this API).
 */

export type DocData = Record<string, unknown>;

/** firebase-admin FieldValue.delete() sentinel */
function isFieldDeleteSentinel(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { constructor?: { name?: string } }).constructor?.name ===
      'DeleteTransform'
  );
}

class MockDocSnapshot {
  constructor(
    public readonly id: string,
    public readonly exists: boolean,
    private readonly _data?: DocData
  ) {}

  data(): DocData | undefined {
    return this._data;
  }
}

class MockTransaction {
  constructor(private readonly store: MemoryStore) {}

  async get(ref: MockDocumentReference): Promise<MockDocSnapshot> {
    return ref.get();
  }

  set(
    ref: MockDocumentReference,
    data: DocData,
    options?: { merge?: boolean }
  ): void {
    ref._set(data, options);
  }

  update(ref: MockDocumentReference, data: DocData): void {
    ref._update(data);
  }
}

class MockWriteBatch {
  private ops: Array<() => void> = [];

  constructor(private readonly store: MemoryStore) {}

  set(ref: MockDocumentReference, data: DocData): void {
    this.ops.push(() => ref._set(data, { merge: true }));
  }

  update(ref: MockDocumentReference, data: DocData): void {
    this.ops.push(() => ref._update(data));
  }

  delete(ref: MockDocumentReference): void {
    this.ops.push(() => ref._deleteSync());
  }

  async commit(): Promise<void> {
    this.ops.forEach(fn => fn());
    this.ops = [];
  }
}

class MockDocumentReference {
  constructor(
    private readonly store: MemoryStore,
    public readonly id: string,
    private readonly collectionId: string
  ) {}

  async get(): Promise<MockDocSnapshot> {
    const data = this.store.getDoc(this.collectionId, this.id);
    return new MockDocSnapshot(this.id, data !== undefined, data);
  }

  _set(data: DocData, options?: { merge?: boolean }): void {
    this.store.setDoc(this.collectionId, this.id, data, options?.merge);
  }

  async set(data: DocData, options?: { merge?: boolean }): Promise<void> {
    this._set(data, options);
  }

  async update(data: DocData): Promise<void> {
    this._update(data);
  }

  _update(data: DocData): void {
    this.store.updateDoc(this.collectionId, this.id, data);
  }

  _deleteSync(): void {
    this.store.deleteDoc(this.collectionId, this.id);
  }

  async delete(): Promise<void> {
    this._deleteSync();
  }
}

/** Query snapshot document with Firestore-compatible shape */
export type MockQueryDoc = {
  id: string;
  data: () => DocData;
  ref: MockDocumentReference;
};

class MockQuerySnapshot {
  constructor(public readonly docs: MockQueryDoc[]) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }

  get size(): number {
    return this.docs.length;
  }
}

export interface WhereClause {
  field: string;
  op: string;
  value: unknown;
}

class MockQuery {
  private wheres: WhereClause[] = [];
  private _sortFieldPath?: string;
  private _sortDir: 'asc' | 'desc' = 'asc';
  private _limit?: number;
  private _offset?: number;
  private _startAfterSnap?: MockDocSnapshot;

  constructor(
    private readonly store: MemoryStore,
    private readonly collectionId: string
  ) {}

  where(field: string, op: string, value: unknown): this {
    if (!['==', '>=', '<=', '<', 'in'].includes(op)) {
      throw new Error(`Mock Firestore: unsupported op ${op}`);
    }
    this.wheres.push({ field, op, value });
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this._sortFieldPath = field;
    this._sortDir = direction;
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  startAfter(snapshot: MockDocSnapshot): this {
    this._startAfterSnap = snapshot;
    return this;
  }

  count(): { get: () => Promise<{ data: () => { count: number } }> } {
    const filtered = this.filterDocs();
    return {
      get: async () => ({
        data: () => ({ count: filtered.length }),
      }),
    };
  }

  private rowMatches(data: DocData): boolean {
    for (const w of this.wheres) {
      const v = data[w.field];
      if (w.op === '==') {
        if (v !== w.value) return false;
      } else if (w.op === '>=') {
        if (!(String(v) >= String(w.value))) return false;
      } else if (w.op === '<=') {
        if (!(String(v) <= String(w.value))) return false;
      } else if (w.op === '<') {
        if (!(String(v) < String(w.value))) return false;
      } else if (w.op === 'in') {
        if (!Array.isArray(w.value) || !w.value.includes(v)) return false;
      }
    }
    return true;
  }

  private filterDocs(): Array<{ id: string; data: DocData }> {
    let rows = this.store
      .listCollection(this.collectionId)
      .filter(r => this.rowMatches(r.data));
    if (this._sortFieldPath) {
      rows.sort((a, b) => {
        const av = a.data[this._sortFieldPath!];
        const bv = b.data[this._sortFieldPath!];
        let cmp: number;
        if (av instanceof Date && bv instanceof Date) {
          cmp = av.getTime() - bv.getTime();
        } else {
          const sa = av instanceof Date ? av.toISOString() : String(av ?? '');
          const sb = bv instanceof Date ? bv.toISOString() : String(bv ?? '');
          cmp = sa === sb ? 0 : sa < sb ? -1 : 1;
        }
        return this._sortDir === 'asc' ? cmp : -cmp;
      });
    }
    if (
      this._startAfterSnap &&
      this._sortFieldPath &&
      this._startAfterSnap.exists
    ) {
      const sortFieldPath = this._sortFieldPath;
      const pivot = this._startAfterSnap.data()?.[sortFieldPath] as
        | string
        | Date
        | undefined;
      const pivotId = this._startAfterSnap.id;
      rows = rows.filter(r => {
        const v = r.data[sortFieldPath] as string | Date;
        if (v !== pivot) {
          return this._sortDir === 'desc' ? v < pivot! : v > pivot!;
        }
        return r.id > pivotId;
      });
    }
    if (this._offset != null && this._offset > 0) {
      rows = rows.slice(this._offset);
    }
    if (this._limit != null) {
      rows = rows.slice(0, this._limit);
    }
    return rows;
  }

  async get(): Promise<MockQuerySnapshot> {
    const rows = this.filterDocs();
    const docs: MockQueryDoc[] = rows.map(r => {
      const ref = new MockDocumentReference(
        this.store,
        r.id,
        this.collectionId
      );
      return {
        id: r.id,
        ref,
        data: () => r.data,
      };
    });
    return new MockQuerySnapshot(docs);
  }
}

class MemoryStore {
  private collections = new Map<string, Map<string, DocData>>();

  getDoc(coll: string, id: string): DocData | undefined {
    return this.collections.get(coll)?.get(id);
  }

  setDoc(coll: string, id: string, data: DocData, merge?: boolean): void {
    if (!this.collections.has(coll)) {
      this.collections.set(coll, new Map());
    }
    const m = this.collections.get(coll)!;
    const prev = m.get(id);
    const next =
      merge && prev
        ? {
            ...prev,
            ...data,
            id,
          }
        : { ...data, id };
    m.set(id, next);
  }

  updateDoc(coll: string, id: string, patch: DocData): void {
    const m = this.collections.get(coll);
    if (!m?.has(id)) return;
    const prev = { ...m.get(id)! };
    const next = { ...prev };
    for (const [key, raw] of Object.entries(patch)) {
      if (isFieldDeleteSentinel(raw)) {
        delete next[key];
      } else {
        next[key] = raw;
      }
    }
    m.set(id, next as DocData);
  }

  deleteDoc(coll: string, id: string): void {
    this.collections.get(coll)?.delete(id);
  }

  listCollection(coll: string): Array<{ id: string; data: DocData }> {
    const m = this.collections.get(coll);
    if (!m) return [];
    return [...m.entries()].map(([id, data]) => ({ id, data }));
  }

  clear(): void {
    this.collections.clear();
  }
}

const globalStore = new MemoryStore();

export function resetMockFirestoreData(): void {
  globalStore.clear();
}

export function seedDoc(collection: string, id: string, data: DocData): void {
  globalStore.setDoc(collection, id, { ...data, id }, false);
}

function createCollectionRef(store: MemoryStore, collectionId: string) {
  return {
    doc: (id: string) => new MockDocumentReference(store, id, collectionId),
    where: (field: string, op: string, value: unknown) =>
      new MockQuery(store, collectionId).where(field, op, value),
    limit: (n: number) => new MockQuery(store, collectionId).limit(n),
    offset: (n: number) => new MockQuery(store, collectionId).offset(n),
    count: () => new MockQuery(store, collectionId).count(),
    add: async (data: DocData) => {
      const id =
        (typeof data.id === 'string' && data.id) ||
        `auto_${Math.random().toString(36).slice(2)}`;
      store.setDoc(collectionId, id, { ...data, id }, false);
      return { id };
    },
    get: async () => {
      const rows = store.listCollection(collectionId);
      const docs: MockQueryDoc[] = rows.map(r => {
        const ref = new MockDocumentReference(store, r.id, collectionId);
        return {
          id: r.id,
          ref,
          data: () => r.data,
        };
      });
      return new MockQuerySnapshot(docs);
    },
  };
}

export function createMockFirestore() {
  const store = globalStore;

  return {
    settings: (_opts: unknown): void => {
      void _opts;
    },
    collection: (name: string) => createCollectionRef(store, name),
    batch: () => new MockWriteBatch(store),
    runTransaction: async <T>(
      fn: (tx: MockTransaction) => Promise<T>
    ): Promise<T> => {
      const tx = new MockTransaction(store);
      return fn(tx);
    },
    listCollections: async (): Promise<unknown[]> => {
      return [];
    },
  };
}

export class MockDatabaseInstance {
  private firestoreImpl = createMockFirestore();

  getFirestore(): ReturnType<typeof createMockFirestore> {
    return this.firestoreImpl;
  }

  getStorage(): {
    bucket: () => {
      getMetadata: () => Promise<unknown>;
      file: (_path: string) => {
        delete: () => Promise<void>;
      };
    };
  } {
    return {
      bucket: () => ({
        getMetadata: async () => ({}),
        file: (_path: string) => ({
          delete: async (): Promise<void> => {},
        }),
      }),
    };
  }

  async testConnection(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    return;
  }
}
