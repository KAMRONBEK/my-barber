import {
  MockDatabaseInstance,
  resetMockFirestoreData,
} from '../../tests/support/mockFirestore';

const mockDb = new MockDatabaseInstance();

export async function connectDatabase(): Promise<void> {
  return;
}

export { mockDb as db };

export { COLLECTIONS } from '../collections';

/** Call between tests to clear seeded docs */
export { resetMockFirestoreData };
