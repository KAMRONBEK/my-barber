import { db, COLLECTIONS } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import {
  getBookingLifecycleDeliveries,
  BookingLifecycleSnapshot,
} from './bookingLifecycleNotifications';
import { firestoreDateToIso } from '../utils/firestoreDates';

export type RecipientType = 'barber' | 'client';

export interface NotificationDoc {
  id: string;
  recipientId: string;
  recipientType: RecipientType;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(
  cursor: string
): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const pipe = raw.indexOf('|');
    if (pipe < 0) return null;
    return { createdAt: raw.slice(0, pipe), id: raw.slice(pipe + 1) };
  } catch {
    return null;
  }
}

export class NotificationInboxService {
  private firestore = db.getFirestore();

  async createNotification(input: {
    recipientId: string;
    recipientType: RecipientType;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = uuidv4();
    const ref = this.firestore.collection(COLLECTIONS.NOTIFICATIONS).doc(id);
    await ref.set({
      id,
      recipientId: input.recipientId,
      recipientType: input.recipientType,
      type: input.type,
      title: input.title,
      body: input.body,
      readAt: null,
      createdAt: new Date(),
      metadata: input.metadata ?? {},
    });
    return id;
  }

  /**
   * Write inbox docs for a booking lifecycle event (shared copy with Expo push layer).
   */
  async applyLifecycleToInbox(
    kind: string,
    booking: BookingLifecycleSnapshot,
    extra?: Record<string, unknown>
  ): Promise<void> {
    const meta = { booking_id: booking.id, ...(extra ?? {}) };

    const deliveries = getBookingLifecycleDeliveries(kind, booking, extra);
    for (const d of deliveries) {
      const recipientId =
        d.recipientType === 'barber' ? booking.barberId : booking.clientId;
      await this.createNotification({
        recipientId,
        recipientType: d.recipientType as RecipientType,
        type: d.notificationType,
        title: d.title,
        body: d.body,
        metadata: meta,
      });
    }
  }

  /**
   * Load booking via BookingService then apply inbox writes.
   */
  async onBookingLifecycleEvent(
    kind: string,
    bookingId: string,
    extra?: Record<string, unknown>
  ): Promise<void> {
    const { bookingService } = await import('./bookingService');
    const bookingRow = await bookingService.getBookingById(bookingId);
    if (!bookingRow) return;

    await this.applyLifecycleToInbox(
      kind,
      {
        id: bookingRow.id,
        barberId: bookingRow.barberId,
        clientId: bookingRow.clientId,
        timestamp: bookingRow.timestamp,
      },
      extra
    );
  }

  async listForUser(
    recipientId: string,
    recipientType: RecipientType,
    cursor: string | undefined,
    limit: number
  ): Promise<{
    items: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      read_at: string | null;
      created_at: string;
      metadata: Record<string, unknown>;
    }>;
    next_cursor: string | null;
    unread_count: number;
  }> {
    let q = this.firestore
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('recipientId', '==', recipientId)
      .where('recipientType', '==', recipientType)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1);

    if (cursor) {
      const dec = decodeCursor(cursor);
      if (dec) {
        const snap = await this.firestore
          .collection(COLLECTIONS.NOTIFICATIONS)
          .doc(dec.id)
          .get();
        if (snap.exists) {
          q = q.startAfter(snap);
        }
      }
    }

    const snapshot = await q.get();
    const docs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    const unreadSnap = await this.firestore
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('recipientId', '==', recipientId)
      .where('recipientType', '==', recipientType)
      .where('readAt', '==', null)
      .count()
      .get();

    const items = docs.map(d => {
      const x = d.data() as NotificationDoc;
      const created = firestoreDateToIso(x.createdAt);
      return {
        id: x.id,
        type: x.type,
        title: x.title,
        body: x.body,
        read_at: x.readAt,
        created_at: created,
        metadata: x.metadata ?? {},
      };
    });

    let next_cursor: string | null = null;
    if (hasMore && docs.length > 0) {
      const last = docs[docs.length - 1].data() as NotificationDoc;
      const created = firestoreDateToIso(last.createdAt);
      next_cursor = encodeCursor(created, last.id);
    }

    return {
      items,
      next_cursor,
      unread_count: unreadSnap.data().count,
    };
  }

  async markRead(
    recipientId: string,
    recipientType: RecipientType,
    notificationId: string
  ): Promise<boolean> {
    const ref = this.firestore
      .collection(COLLECTIONS.NOTIFICATIONS)
      .doc(notificationId);
    const doc = await ref.get();
    if (!doc.exists) return false;
    const data = doc.data() as NotificationDoc;
    if (
      data.recipientId !== recipientId ||
      data.recipientType !== recipientType
    ) {
      return false;
    }
    await ref.update({ readAt: new Date().toISOString() });
    return true;
  }

  async markAllRead(
    recipientId: string,
    recipientType: RecipientType
  ): Promise<void> {
    const snapshot = await this.firestore
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('recipientId', '==', recipientId)
      .where('recipientType', '==', recipientType)
      .where('readAt', '==', null)
      .get();

    const batch = this.firestore.batch();
    const now = new Date().toISOString();
    snapshot.docs.forEach(d => {
      batch.update(d.ref, { readAt: now });
    });
    await batch.commit();
  }
}

export const notificationInboxService = new NotificationInboxService();
