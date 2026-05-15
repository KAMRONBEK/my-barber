import { db, COLLECTIONS } from '../config/database';
import {
  CancellationParty,
  Booking,
  BookingContract,
  BookingCreateRequest,
  BookingResponse,
  BookingStatus,
} from '../models/booking';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { blockService } from './blockService';
import {
  bookingResponseToContract,
  normalizeBookingStatus,
} from '../utils/bookingContract';
import { resolveMediaRefForApi } from './fileStorage';

export class BookingServiceClass {
  private firestore = db.getFirestore();

  private async computeServiceTotal(bookingId: string): Promise<number> {
    const servicesSnapshot = await this.firestore
      .collection(COLLECTIONS.BOOKING_SERVICES)
      .where('bookingId', '==', bookingId)
      .get();

    let total = 0;
    for (const serviceDoc of servicesSnapshot.docs) {
      const row = serviceDoc.data();
      const serviceDetails = await this.firestore
        .collection(COLLECTIONS.BARBER_SERVICES)
        .doc(row.serviceId)
        .get();
      if (serviceDetails.exists) {
        const p = serviceDetails.data()?.price;
        if (typeof p === 'number') total += p;
      }
    }
    return total;
  }

  async createBooking(bookingData: BookingCreateRequest): Promise<string> {
    try {
      const blocked = await blockService.isBlockedBetween(
        bookingData.clientId,
        bookingData.barberId
      );
      if (blocked) {
        throw new Error('BLOCKED');
      }

      const bookingId = uuidv4();

      const booking: Booking = {
        id: bookingId,
        barberId: bookingData.barberId,
        clientId: bookingData.clientId,
        timestamp: bookingData.timestamp,
        status: 'pending_confirmation',
        declineReason: null,
        cancellationReason: null,
        previousTimestamp: null,
        cancelledBy: null,
        completedAt: null,
        serviceTotal: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.firestore
        .collection(COLLECTIONS.BOOKINGS)
        .doc(bookingId)
        .set(booking);

      const batch = this.firestore.batch();
      bookingData.serviceIds.forEach(serviceId => {
        const joinId = uuidv4();
        const joinRef = this.firestore
          .collection(COLLECTIONS.BOOKING_SERVICES)
          .doc(joinId);

        batch.set(joinRef, {
          id: joinId,
          bookingId,
          serviceId,
        });
      });

      await batch.commit();

      void this.dispatchBookingLifecycleNotifications(
        'booking_created',
        bookingId
      ).catch(() => {});

      logger.info('Booking created successfully', {
        bookingId,
        serviceCount: bookingData.serviceIds.length,
      });
      return bookingId;
    } catch (error) {
      logger.error('Error creating booking:', error);
      throw error;
    }
  }

  private async dispatchBookingLifecycleNotifications(
    kind: string,
    bookingId: string,
    extra?: Record<string, unknown>
  ): Promise<void> {
    try {
      const bookingRow = await this.getBookingById(bookingId);
      if (!bookingRow) return;
      const snap = {
        id: bookingRow.id,
        barberId: bookingRow.barberId,
        clientId: bookingRow.clientId,
        timestamp: bookingRow.timestamp,
      };
      const { notificationInboxService } = await import(
        './notificationInboxService'
      );
      const { notificationService } = await import('./notificationService');
      await notificationInboxService.applyLifecycleToInbox(kind, snap, extra);
      await notificationService.notifyBookingLifecyclePush(kind, snap, extra);
    } catch (e) {
      logger.warn('Booking lifecycle notifications skipped', {
        kind,
        bookingId,
        e,
      });
    }
  }

  async getBookingById(id: string): Promise<BookingResponse | null> {
    try {
      const doc = await this.firestore
        .collection(COLLECTIONS.BOOKINGS)
        .doc(id)
        .get();

      if (!doc.exists) {
        return null;
      }

      const bookingData = { id: doc.id, ...doc.data() } as Booking;

      const clientDoc = await this.firestore
        .collection(COLLECTIONS.CLIENTS)
        .doc(bookingData.clientId)
        .get();
      const clientData = clientDoc.data();

      const servicesSnapshot = await this.firestore
        .collection(COLLECTIONS.BOOKING_SERVICES)
        .where('bookingId', '==', id)
        .get();

      const services = [];
      for (const serviceDoc of servicesSnapshot.docs) {
        const row = serviceDoc.data();
        const serviceDetails = await this.firestore
          .collection(COLLECTIONS.BARBER_SERVICES)
          .doc(row.serviceId)
          .get();

        if (serviceDetails.exists) {
          const service = serviceDetails.data();
          services.push({
            id: service?.id,
            barberId: service?.barberId,
            name: service?.name,
            price: service?.price,
          });
        }
      }

      const status = normalizeBookingStatus(bookingData.status);

      const clientAvatar = clientData
        ? await resolveMediaRefForApi(clientData.avatar)
        : undefined;

      return {
        id: bookingData.id,
        barberId: bookingData.barberId,
        clientId: bookingData.clientId,
        client: clientData
          ? {
              id: clientData.id,
              username: clientData.username,
              firstName: clientData.firstName,
              lastName: clientData.lastName,
              phone: clientData.phone,
              avatar: clientAvatar,
            }
          : undefined,
        services,
        timestamp: bookingData.timestamp,
        status,
        declineReason: bookingData.declineReason ?? null,
        cancellationReason: bookingData.cancellationReason ?? null,
        previousTimestamp: bookingData.previousTimestamp ?? null,
        cancelledBy: bookingData.cancelledBy ?? null,
        completedAt: bookingData.completedAt ?? null,
        updatedAt: bookingData.updatedAt,
      };
    } catch (error) {
      logger.error('Error getting booking by ID:', error);
      throw error;
    }
  }

  private activeForCancelOrReschedule(status: BookingStatus): boolean {
    return (
      status === 'pending_confirmation' ||
      status === 'confirmed' ||
      status === 'rescheduled'
    );
  }

  async patchBarberBookingStatus(
    barberId: string,
    bookingId: string,
    status: 'confirmed' | 'declined',
    reason: string | null
  ): Promise<BookingResponse | null> {
    const bookingRow = await this.getBookingById(bookingId);
    if (!bookingRow || bookingRow.barberId !== barberId) return null;

    const st = normalizeBookingStatus(bookingRow.status);
    if (st !== 'pending_confirmation') {
      throw new Error('INVALID_STATE');
    }

    const now = new Date();
    const patch: Partial<Booking> = {
      updatedAt: now,
    };

    if (status === 'confirmed') {
      patch.status = 'confirmed';
      patch.declineReason = null;
    } else {
      patch.status = 'declined';
      patch.declineReason = reason ?? null;
      patch.cancellationReason = reason ?? null;
    }

    await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .doc(bookingId)
      .update(patch);

    void this.dispatchBookingLifecycleNotifications(
      status === 'confirmed' ? 'booking_confirmed' : 'booking_declined',
      bookingId
    ).catch(() => {});

    return this.getBookingById(bookingId);
  }

  async cancelBooking(
    party: CancellationParty,
    userId: string,
    bookingId: string,
    reason: string | null
  ): Promise<BookingResponse | null> {
    const bookingRow = await this.getBookingById(bookingId);
    if (!bookingRow) return null;

    if (party === 'barber' && bookingRow.barberId !== userId) return null;
    if (party === 'client' && bookingRow.clientId !== userId) return null;

    const st = normalizeBookingStatus(bookingRow.status);
    if (!this.activeForCancelOrReschedule(st)) {
      throw new Error('INVALID_STATE');
    }

    await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .doc(bookingId)
      .update({
        status: 'cancelled',
        cancellationReason: reason ?? null,
        cancelledBy: party,
        updatedAt: new Date(),
      });

    void this.dispatchBookingLifecycleNotifications(
      'booking_cancelled',
      bookingId,
      {
        cancelled_by: party,
      }
    ).catch(() => {});

    return this.getBookingById(bookingId);
  }

  async rescheduleBooking(
    party: CancellationParty,
    userId: string,
    bookingId: string,
    newTimestamp: string,
    reason: string | null
  ): Promise<BookingResponse | null> {
    const bookingRow = await this.getBookingById(bookingId);
    if (!bookingRow) return null;

    if (party === 'barber' && bookingRow.barberId !== userId) return null;
    if (party === 'client' && bookingRow.clientId !== userId) return null;

    const st = normalizeBookingStatus(bookingRow.status);
    if (!this.activeForCancelOrReschedule(st)) {
      throw new Error('INVALID_STATE');
    }

    await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .doc(bookingId)
      .update({
        status: 'rescheduled',
        previousTimestamp: bookingRow.timestamp,
        timestamp: newTimestamp,
        cancellationReason: reason ?? null,
        updatedAt: new Date(),
      });

    void this.dispatchBookingLifecycleNotifications(
      'booking_rescheduled',
      bookingId
    ).catch(() => {});

    return this.getBookingById(bookingId);
  }

  async markNoShow(
    barberId: string,
    bookingId: string
  ): Promise<BookingResponse | null> {
    const bookingRow = await this.getBookingById(bookingId);
    if (!bookingRow || bookingRow.barberId !== barberId) return null;

    const st = normalizeBookingStatus(bookingRow.status);
    if (st !== 'confirmed' && st !== 'rescheduled') {
      throw new Error('INVALID_STATE');
    }

    await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .doc(bookingId)
      .update({
        status: 'no_show',
        updatedAt: new Date(),
      });

    void this.dispatchBookingLifecycleNotifications('no_show', bookingId).catch(
      () => {}
    );

    return this.getBookingById(bookingId);
  }

  async completeBooking(
    barberId: string,
    bookingId: string
  ): Promise<BookingResponse | null> {
    const bookingRow = await this.getBookingById(bookingId);
    if (!bookingRow || bookingRow.barberId !== barberId) return null;

    const st = normalizeBookingStatus(bookingRow.status);
    if (st !== 'confirmed' && st !== 'rescheduled') {
      throw new Error('INVALID_STATE');
    }

    const total = await this.computeServiceTotal(bookingId);
    const completedAt = new Date().toISOString();

    await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .doc(bookingId)
      .update({
        status: 'completed',
        completedAt,
        serviceTotal: total,
        updatedAt: new Date(),
      });

    void this.dispatchBookingLifecycleNotifications(
      'booking_completed',
      bookingId
    ).catch(() => {});

    return this.getBookingById(bookingId);
  }

  private encodeBookingHistoryCursor(timestamp: string, id: string): string {
    return Buffer.from(`${timestamp}|${id}`, 'utf8').toString('base64url');
  }

  private decodeBookingHistoryCursor(
    cursor: string
  ): { timestamp: string; id: string } | null {
    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const pipe = raw.indexOf('|');
      if (pipe < 0) return null;
      return { timestamp: raw.slice(0, pipe), id: raw.slice(pipe + 1) };
    } catch {
      return null;
    }
  }

  /**
   * Map a `status` query-string value to the set of Firestore status values that
   * should be included.  Returns `undefined` when no filter should be applied.
   */
  private resolveStatusFilter(
    status: string | undefined
  ): BookingStatus[] | undefined {
    if (!status) return undefined;
    switch (status) {
      case 'upcoming':
        return ['pending_confirmation', 'confirmed', 'rescheduled'];
      case 'past':
        return ['completed', 'cancelled', 'declined', 'no_show'];
      default:
        // Treat any other value as a direct single-status filter if it is a valid status
        if (
          status === 'pending_confirmation' ||
          status === 'confirmed' ||
          status === 'declined' ||
          status === 'cancelled' ||
          status === 'rescheduled' ||
          status === 'completed' ||
          status === 'no_show'
        ) {
          return [status];
        }
        return undefined;
    }
  }

  /** Paginated booking contracts for the authenticated client (all barbers, newest first). */
  async listBookingHistoryForClient(
    clientId: string,
    limit: number,
    cursor?: string,
    status?: string
  ): Promise<{ items: BookingContract[]; next_cursor: string | null }> {
    // Over-fetch when a status filter is active so in-memory filtering still yields a
    // full page (avoids needing a composite Firestore index on clientId+status+timestamp).
    const fetchLimit = status ? limit * 4 : limit;

    // Query type after orderBy/startAfter chaining is awkward to name in admin SDK typings.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Firestore Query chain
    let q: any = this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .where('clientId', '==', clientId)
      .orderBy('timestamp', 'desc')
      .limit(fetchLimit + 1);

    if (cursor) {
      const dec = this.decodeBookingHistoryCursor(cursor);
      if (dec) {
        const pivot = await this.firestore
          .collection(COLLECTIONS.BOOKINGS)
          .doc(dec.id)
          .get();
        if (pivot.exists) {
          q = q.startAfter(pivot);
        }
      }
    }

    const snapshot = await q.get();
    const statusFilter = this.resolveStatusFilter(status);

    // Pre-filter on raw document status before the expensive per-booking enrichment,
    // so getBookingById is only called for docs that will actually appear in the page.
    const candidateDocs = statusFilter
      ? snapshot.docs.filter(d =>
          statusFilter.includes(
            normalizeBookingStatus((d.data() as Booking).status)
          )
        )
      : snapshot.docs;

    const hasMore = candidateDocs.length > limit;
    const docs = candidateDocs.slice(0, limit);

    const items: BookingContract[] = [];
    for (const d of docs) {
      const row = await this.getBookingById(d.id);
      if (row) {
        items.push(bookingResponseToContract(row));
      }
    }

    let next_cursor: string | null = null;
    if (hasMore && docs.length > 0) {
      const last = docs[docs.length - 1];
      const data = last.data() as Booking;
      next_cursor = this.encodeBookingHistoryCursor(data.timestamp, last.id);
    }

    return { items, next_cursor };
  }
}

export const bookingService = new BookingServiceClass();
