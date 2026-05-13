import { db, COLLECTIONS } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type ReportTargetType = 'barber' | 'client' | 'booking' | 'review';

export class TrustServiceClass {
  private firestore = db.getFirestore();

  async createReport(input: {
    reporterId: string;
    reporterType: 'barber' | 'client';
    target_type: ReportTargetType;
    target_id: string;
    reason: string;
    description: string;
    attachments: string[];
  }) {
    const id = uuidv4();
    await this.firestore
      .collection(COLLECTIONS.REPORTS)
      .doc(id)
      .set({
        id,
        reporterId: input.reporterId,
        reporterType: input.reporterType,
        targetType: input.target_type,
        targetId: input.target_id,
        reason: input.reason,
        description: input.description,
        attachments: input.attachments ?? [],
        status: 'submitted',
        createdAt: new Date(),
      });

    return {
      id,
      status: 'submitted',
      target_type: input.target_type,
      target_id: input.target_id,
      created_at: new Date().toISOString(),
    };
  }
}

export const trustService = new TrustServiceClass();
