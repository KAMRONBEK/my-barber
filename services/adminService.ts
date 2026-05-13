import { db, COLLECTIONS } from '../config/database';

/** Firestore doc id under `cms` collection */
export const CMS_BANNER_DOC_ID = 'banner';

export interface CmsBannerDoc {
  title?: string;
  body?: string;
  imageRef?: string;
  active?: boolean;
  updatedAt?: Date;
}

export interface AdminStatsSummary {
  barbersByApprovalStatus: {
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    unknown: number;
  };
  /** Bookings with `timestamp` in the rolling window (ISO string compared). */
  bookingsLast7Days: number;
  bookingsLast30Days: number;
}

/**
 * Admin-only CMS and metrics. Barber CRUD goes through `barberService` from routes.
 *
 * `getAdminStatsSummary` reads barbers once and buckets by status; for bookings it uses
 * range queries. At high volume, replace with rollups / Cloud Functions counters.
 */
export class AdminServiceClass {
  private firestore = db.getFirestore();

  async getCmsBanner(): Promise<CmsBannerDoc | null> {
    const doc = await this.firestore
      .collection(COLLECTIONS.CMS)
      .doc(CMS_BANNER_DOC_ID)
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as CmsBannerDoc;
  }

  async setCmsBanner(data: Partial<CmsBannerDoc>): Promise<CmsBannerDoc> {
    const payload: CmsBannerDoc = {
      ...data,
      updatedAt: new Date(),
    };

    await this.firestore
      .collection(COLLECTIONS.CMS)
      .doc(CMS_BANNER_DOC_ID)
      .set(payload, { merge: true });

    const out = await this.getCmsBanner();
    return out ?? payload;
  }

  async getAdminStatsSummary(): Promise<AdminStatsSummary> {
    const barbersSnap = await this.firestore
      .collection(COLLECTIONS.BARBERS)
      .get();

    const barbersByApprovalStatus: AdminStatsSummary['barbersByApprovalStatus'] =
      {
        pending: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
        unknown: 0,
      };

    for (const d of barbersSnap.docs) {
      const s = d.data().approvalStatus;
      if (s === 'pending') barbersByApprovalStatus.pending++;
      else if (s === 'approved') barbersByApprovalStatus.approved++;
      else if (s === 'rejected') barbersByApprovalStatus.rejected++;
      else if (s === 'suspended') barbersByApprovalStatus.suspended++;
      else barbersByApprovalStatus.unknown++;
    }

    const now = Date.now();
    const cut7 = new Date(now - 7 * 86400000).toISOString();
    const cut30 = new Date(now - 30 * 86400000).toISOString();

    const base = this.firestore.collection(COLLECTIONS.BOOKINGS);
    const bookingsLast7Days = (
      await base.where('timestamp', '>=', cut7).count().get()
    ).data().count;
    const bookingsLast30Days = (
      await base.where('timestamp', '>=', cut30).count().get()
    ).data().count;

    return {
      barbersByApprovalStatus,
      bookingsLast7Days,
      bookingsLast30Days,
    };
  }
}

export const adminService = new AdminServiceClass();
