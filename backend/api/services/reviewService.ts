import { db, COLLECTIONS } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { bookingService } from './bookingService';
import { normalizeBookingStatus } from '../utils/bookingContract';

export interface ReviewDoc {
  id: string;
  bookingId: string;
  barberId: string;
  clientId: string;
  rating: number;
  comment: string;
  serviceIds: string[];
  createdAt: Date;
}

function encodeCursor(iso: string, id: string): string {
  return Buffer.from(`${iso}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { iso: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const pipe = raw.indexOf('|');
    if (pipe < 0) return null;
    return { iso: raw.slice(0, pipe), id: raw.slice(pipe + 1) };
  } catch {
    return null;
  }
}

export class ReviewServiceClass {
  private firestore = db.getFirestore();

  async createReview(
    clientId: string,
    bookingId: string,
    input: { rating: number; comment: string; service_ids: string[] }
  ): Promise<{
    review: {
      id: string;
      booking_id: string;
      barber_id: string;
      client_id: string;
      rating: number;
      comment: string;
      created_at: string;
    };
    barber_rating: { average: number; count: number };
  } | null> {
    const bookingRow = await bookingService.getBookingById(bookingId);
    if (!bookingRow || bookingRow.clientId !== clientId) return null;

    const st = normalizeBookingStatus(bookingRow.status);
    if (st !== 'completed') {
      throw new Error('INVALID_STATE');
    }

    const existing = await this.firestore
      .collection(COLLECTIONS.REVIEWS)
      .where('bookingId', '==', bookingId)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new Error('DUPLICATE');
    }

    const reviewId = uuidv4();
    const barberRef = this.firestore
      .collection(COLLECTIONS.BARBERS)
      .doc(bookingRow.barberId);

    await this.firestore.runTransaction(async tx => {
      const barberSnap = await tx.get(barberRef);
      if (!barberSnap.exists) throw new Error('BARBER_NOT_FOUND');

      const b = barberSnap.data() as {
        ratingAverage?: number;
        ratingCount?: number;
      };

      const prevCount = b.ratingCount ?? 0;
      const prevAvg = b.ratingAverage ?? 0;
      const newCount = prevCount + 1;
      const newAvg =
        newCount === 0 ? 0 : (prevAvg * prevCount + input.rating) / newCount;

      tx.set(this.firestore.collection(COLLECTIONS.REVIEWS).doc(reviewId), {
        id: reviewId,
        bookingId,
        barberId: bookingRow.barberId,
        clientId,
        rating: input.rating,
        comment: input.comment,
        serviceIds: input.service_ids ?? [],
        createdAt: new Date(),
      });

      tx.update(barberRef, {
        ratingAverage: Math.round(newAvg * 10) / 10,
        ratingCount: newCount,
        updatedAt: new Date(),
      });
    });

    const created = await this.firestore
      .collection(COLLECTIONS.REVIEWS)
      .doc(reviewId)
      .get();

    const barberAfter = await barberRef.get();
    const ba = barberAfter.data() as {
      ratingAverage?: number;
      ratingCount?: number;
    };

    const data = created.data() as ReviewDoc;
    const createdAt =
      data.createdAt instanceof Date
        ? data.createdAt.toISOString()
        : new Date(data.createdAt as unknown as string).toISOString();

    return {
      review: {
        id: data.id,
        booking_id: data.bookingId,
        barber_id: data.barberId,
        client_id: data.clientId,
        rating: data.rating,
        comment: data.comment,
        created_at: createdAt,
      },
      barber_rating: {
        average: ba.ratingAverage ?? 0,
        count: ba.ratingCount ?? 0,
      },
    };
  }

  async listReviewsForBarber(
    barberId: string,
    cursor: string | undefined,
    limit: number
  ): Promise<{
    items: Array<{
      id: string;
      booking_id: string;
      barber_id: string;
      client_id: string;
      rating: number;
      comment: string;
      created_at: string;
    }>;
    next_cursor: string | null;
  }> {
    let q = this.firestore
      .collection(COLLECTIONS.REVIEWS)
      .where('barberId', '==', barberId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1);

    if (cursor) {
      const dec = decodeCursor(cursor);
      if (dec) {
        const docRef = this.firestore
          .collection(COLLECTIONS.REVIEWS)
          .doc(dec.id);
        const snap = await docRef.get();
        if (snap.exists) {
          q = q.startAfter(snap);
        }
      }
    }

    const snapshot = await q.get();
    const docs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    const items = docs.map(d => {
      const x = d.data() as ReviewDoc;
      const created =
        x.createdAt instanceof Date
          ? x.createdAt.toISOString()
          : new Date(x.createdAt as unknown as string).toISOString();
      return {
        id: x.id,
        booking_id: x.bookingId,
        barber_id: x.barberId,
        client_id: x.clientId,
        rating: x.rating,
        comment: x.comment,
        created_at: created,
      };
    });

    let next_cursor: string | null = null;
    if (hasMore && docs.length > 0) {
      const last = docs[docs.length - 1].data() as ReviewDoc;
      const created =
        last.createdAt instanceof Date
          ? last.createdAt.toISOString()
          : new Date(last.createdAt as unknown as string).toISOString();
      next_cursor = encodeCursor(created, last.id);
    }

    return {
      items,
      next_cursor,
    };
  }
}

export const reviewService = new ReviewServiceClass();
