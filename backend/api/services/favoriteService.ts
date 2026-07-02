import { db, COLLECTIONS } from '../config/database';
import { logger } from '../utils/logger';

function favoriteDocId(clientId: string, barberId: string): string {
  return `${clientId}_${barberId}`;
}

export class FavoriteServiceClass {
  private firestore = db.getFirestore();

  // Deterministic doc id makes this a plain idempotent set — no need to
  // check for an existing favorite first.
  async addFavorite(clientId: string, barberId: string): Promise<void> {
    try {
      await this.firestore
        .collection(COLLECTIONS.FAVORITES)
        .doc(favoriteDocId(clientId, barberId))
        .set({ clientId, barberId, createdAt: new Date() });
    } catch (error) {
      logger.error('Error adding favorite:', error);
      throw error;
    }
  }

  async removeFavorite(clientId: string, barberId: string): Promise<void> {
    try {
      await this.firestore
        .collection(COLLECTIONS.FAVORITES)
        .doc(favoriteDocId(clientId, barberId))
        .delete();
    } catch (error) {
      logger.error('Error removing favorite:', error);
      throw error;
    }
  }

  async isFavorite(clientId: string, barberId: string): Promise<boolean> {
    try {
      const doc = await this.firestore
        .collection(COLLECTIONS.FAVORITES)
        .doc(favoriteDocId(clientId, barberId))
        .get();
      return doc.exists;
    } catch (error) {
      logger.error('Error checking favorite:', error);
      throw error;
    }
  }

  // No orderBy here on purpose — an equality filter plus orderBy on a
  // different field needs a Firestore composite index; sorting the (small)
  // in-memory result avoids requiring one.
  async listFavoriteBarberIds(clientId: string): Promise<string[]> {
    try {
      const snapshot = await this.firestore
        .collection(COLLECTIONS.FAVORITES)
        .where('clientId', '==', clientId)
        .get();

      return snapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() ?? new Date(0);
          const bTime = b.createdAt?.toDate?.() ?? new Date(0);
          return bTime.getTime() - aTime.getTime();
        })
        .map(data => data.barberId as string);
    } catch (error) {
      logger.error('Error listing favorites:', error);
      throw error;
    }
  }
}

export const favoriteService = new FavoriteServiceClass();
