import { db, COLLECTIONS } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class BlockServiceClass {
  private firestore = db.getFirestore();

  async isBlockedBetween(userA: string, userB: string): Promise<boolean> {
    const q1 = await this.firestore
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', userA)
      .where('blockedId', '==', userB)
      .limit(1)
      .get();

    if (!q1.empty) return true;

    const q2 = await this.firestore
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', userB)
      .where('blockedId', '==', userA)
      .limit(1)
      .get();

    return !q2.empty;
  }

  async addBlock(blockerId: string, blockedId: string): Promise<string> {
    if (blockerId === blockedId) {
      throw new Error('INVALID');
    }

    const existing = await this.firestore
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .where('blockedId', '==', blockedId)
      .limit(1)
      .get();

    if (!existing.empty) {
      return existing.docs[0].id;
    }

    const id = uuidv4();
    await this.firestore.collection(COLLECTIONS.BLOCKS).doc(id).set({
      id,
      blockerId,
      blockedId,
      createdAt: new Date(),
    });
    return id;
  }

  async removeBlock(
    blockerId: string,
    blockedUserId: string
  ): Promise<boolean> {
    const snap = await this.firestore
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .where('blockedId', '==', blockedUserId)
      .get();

    if (snap.empty) return false;

    const batch = this.firestore.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  }
}

export const blockService = new BlockServiceClass();
