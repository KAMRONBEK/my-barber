import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { db, COLLECTIONS } from '../config/database';

export const USERNAME_TAKEN = 'USERNAME_TAKEN';

export type UserKind = 'client' | 'barber';

const USER_COLLECTION: Record<UserKind, string> = {
  client: COLLECTIONS.CLIENTS,
  barber: COLLECTIONS.BARBERS,
};

/**
 * Write a user document under a username nobody else holds.
 *
 * Firestore has no unique constraint, and a "query, then write" check lets two
 * simultaneous requests both pass. Each username therefore has a lock document
 * with a deterministic id which the transaction reads and writes, so competing
 * transactions conflict. The query still covers accounts created before the
 * lock documents existed.
 *
 * `write` receives the transaction after all reads are done.
 */
export async function writeWithUniqueUsername(options: {
  kind: UserKind;
  userId: string;
  username: string;
  write: (tx: Transaction, userRef: DocumentReference) => void;
}): Promise<void> {
  const { kind, userId, username, write } = options;
  const firestore = db.getFirestore();
  const users = firestore.collection(USER_COLLECTION[kind]);
  const locks = firestore.collection(COLLECTIONS.USERNAMES);
  const lockId = (name: string) => `${kind}:${encodeURIComponent(name)}`;

  await firestore.runTransaction(async tx => {
    const userRef = users.doc(userId);
    const lockRef = locks.doc(lockId(username));

    const lock = await tx.get(lockRef);
    const sameName = await tx.get(
      users.where('username', '==', username).limit(2)
    );
    if (sameName.docs.some(d => d.id !== userId)) {
      throw new Error(USERNAME_TAKEN);
    }

    const ownerId = lock.exists ? (lock.data()?.userId as string) : undefined;
    if (ownerId && ownerId !== userId) {
      // A lock whose owner no longer uses the name is stale and can be reused.
      const owner = await tx.get(users.doc(ownerId));
      if (owner.exists && owner.data()?.username === username) {
        throw new Error(USERNAME_TAKEN);
      }
    }

    const current = await tx.get(userRef);
    const previousName = current.data()?.username as string | undefined;

    tx.set(lockRef, { userId, kind, updatedAt: new Date() });
    if (previousName && previousName !== username) {
      tx.delete(locks.doc(lockId(previousName)));
    }
    write(tx, userRef);
  });
}
