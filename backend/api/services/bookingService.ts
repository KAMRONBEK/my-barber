import { QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';
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
import { BookingError } from '../utils/bookingErrors';
import {
  EXPIRED_REASON,
  bookingDurationMinutes,
  effectiveBookingStatus,
  fitsWorkingHours,
  isExpiredRequest,
  occupiesSlot,
} from '../utils/bookingRules';
import { isPublicBarber } from '../utils/barberVisibility';

const HOUR_MS = 60 * 60_000;
/** Allows for clock drift between the phone and the server. */
const PAST_GRACE_MS = 60_000;

/**
 * Parse a requested start time into the stored UTC form. A value without a
 * timezone is Tashkent wall-clock time.
 */
function parseStartTime(input: string): string {
  const hasTime = /T\d{2}/.test(input);
  const hasZone = /(Z|[+-]\d{2}(:?\d{2})?)$/i.test(input);
  const date = new Date(hasZone ? input : `${input}+05:00`);
  if (!hasTime || Number.isNaN(date.getTime())) {
    throw new BookingError('INVALID_TIME');
  }
  if (date.getTime() < Date.now() - PAST_GRACE_MS) {
    throw new BookingError('PAST_TIME');
  }
  return date.toISOString();
}

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

  private async serviceRowsOfBooking(
    tx: Transaction,
    bookingId: string
  ): Promise<Array<{ durationMinutes?: number }>> {
    const links = await tx.get(
      this.firestore
        .collection(COLLECTIONS.BOOKING_SERVICES)
        .where('bookingId', '==', bookingId)
    );
    const rows: Array<{ durationMinutes?: number }> = [];
    for (const link of links.docs) {
      const service = await tx.get(
        this.firestore
          .collection(COLLECTIONS.BARBER_SERVICES)
          .doc(link.data().serviceId)
      );
      rows.push((service.data() as { durationMinutes?: number }) ?? {});
    }
    return rows;
  }

  /** Throws when the barber already has a booking overlapping this interval. */
  private async assertSlotFree(
    tx: Transaction,
    barberId: string,
    timestamp: string,
    durationMinutes: number,
    ignoreBookingId?: string
  ): Promise<void> {
    const start = new Date(timestamp).getTime();
    const end = start + durationMinutes * 60_000;
    // Wider than any booking, so an earlier one that runs into this slot is seen.
    const nearby = await tx.get(
      this.firestore
        .collection(COLLECTIONS.BOOKINGS)
        .where('barberId', '==', barberId)
        .where('timestamp', '>=', new Date(start - 48 * HOUR_MS).toISOString())
        .where('timestamp', '<', new Date(end + 24 * HOUR_MS).toISOString())
    );

    for (const doc of nearby.docs) {
      if (doc.id === ignoreBookingId) continue;
      const other = doc.data() as Booking;
      if (
        !occupiesSlot(effectiveBookingStatus(other.status, other.timestamp))
      ) {
        continue;
      }
      const otherStart = new Date(other.timestamp).getTime();
      if (otherStart >= end) continue;
      const services = await this.serviceRowsOfBooking(tx, doc.id);
      const otherEnd = otherStart + bookingDurationMinutes(services) * 60_000;
      if (otherEnd > start) {
        throw new BookingError('SLOT_TAKEN');
      }
    }
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

      const timestamp = parseStartTime(bookingData.timestamp);
      const bookingId = uuidv4();
      const { barberId, clientId, serviceIds } = bookingData;

      // The per-barber lock document makes concurrent requests conflict, so two
      // clients cannot both pass the overlap check.
      await this.firestore.runTransaction(async tx => {
        const lockRef = this.firestore
          .collection(COLLECTIONS.BOOKING_LOCKS)
          .doc(barberId);
        await tx.get(lockRef);

        const barber = await tx.get(
          this.firestore.collection(COLLECTIONS.BARBERS).doc(barberId)
        );
        const barberData = barber.data();
        if (!barber.exists || !isPublicBarber(barberData ?? {})) {
          throw new BookingError('BARBER_NOT_AVAILABLE');
        }

        const services: Array<{ durationMinutes?: number }> = [];
        for (const serviceId of serviceIds) {
          const service = await tx.get(
            this.firestore
              .collection(COLLECTIONS.BARBER_SERVICES)
              .doc(serviceId)
          );
          const data = service.data();
          if (
            !service.exists ||
            data?.barberId !== barberId ||
            data?.isActive === false
          ) {
            throw new BookingError('INVALID_SERVICES');
          }
          services.push(data);
        }

        const duration = bookingDurationMinutes(services);
        if (!fitsWorkingHours(timestamp, duration, barberData?.workingHours)) {
          throw new BookingError('OUTSIDE_WORKING_HOURS');
        }
        await this.assertSlotFree(tx, barberId, timestamp, duration);

        const booking: Booking = {
          id: bookingId,
          barberId,
          clientId,
          timestamp,
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
        tx.set(
          this.firestore.collection(COLLECTIONS.BOOKINGS).doc(bookingId),
          booking
        );
        for (const serviceId of serviceIds) {
          const joinId = uuidv4();
          tx.set(
            this.firestore.collection(COLLECTIONS.BOOKING_SERVICES).doc(joinId),
            { id: joinId, bookingId, serviceId }
          );
        }
        tx.set(lockRef, { updatedAt: new Date() });
      });

      void this.dispatchBookingLifecycleNotifications(
        'booking_created',
        bookingId
      ).catch(() => {});

      logger.info('Booking created successfully', {
        bookingId,
        serviceCount: serviceIds.length,
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
      const { notificationInboxService } =
        await import('./notificationInboxService');
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
            durationMinutes: service?.durationMinutes,
          });
        }
      }

      const expired = isExpiredRequest(
        bookingData.status,
        bookingData.timestamp
      );
      const status = effectiveBookingStatus(
        bookingData.status,
        bookingData.timestamp
      );

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
        cancellationReason:
          bookingData.cancellationReason ?? (expired ? EXPIRED_REASON : null),
        previousTimestamp: bookingData.previousTimestamp ?? null,
        cancelledBy: bookingData.cancelledBy ?? null,
        completedAt: bookingData.completedAt ?? null,
        clientArrivalResponse: bookingData.clientArrivalResponse ?? null,
        clientArrivalConfirmedAt: bookingData.clientArrivalConfirmedAt ?? null,
        barberArrivalResponse: bookingData.barberArrivalResponse ?? null,
        barberArrivalConfirmedAt: bookingData.barberArrivalConfirmedAt ?? null,
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

  private isActiveForArrival(status: BookingStatus): boolean {
    return status === 'confirmed' || status === 'rescheduled';
  }

  private assertStarted(timestamp: string): void {
    if (new Date(timestamp).getTime() > Date.now()) {
      throw new BookingError('NOT_STARTED');
    }
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

    const timestamp = parseStartTime(newTimestamp);
    const { barberId } = bookingRow;

    await this.firestore.runTransaction(async tx => {
      const lockRef = this.firestore
        .collection(COLLECTIONS.BOOKING_LOCKS)
        .doc(barberId);
      await tx.get(lockRef);

      const barber = await tx.get(
        this.firestore.collection(COLLECTIONS.BARBERS).doc(barberId)
      );
      if (!barber.exists || !isPublicBarber(barber.data() ?? {})) {
        throw new BookingError('BARBER_NOT_AVAILABLE');
      }
      const duration = bookingDurationMinutes(
        await this.serviceRowsOfBooking(tx, bookingId)
      );
      if (!fitsWorkingHours(timestamp, duration, barber.data()?.workingHours)) {
        throw new BookingError('OUTSIDE_WORKING_HOURS');
      }
      await this.assertSlotFree(tx, barberId, timestamp, duration, bookingId);

      tx.update(
        this.firestore.collection(COLLECTIONS.BOOKINGS).doc(bookingId),
        {
          status: 'rescheduled',
          previousTimestamp: bookingRow.timestamp,
          timestamp,
          cancellationReason: reason ?? null,
          updatedAt: new Date(),
        }
      );
      tx.set(lockRef, { updatedAt: new Date() });
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

    this.assertStarted(bookingRow.timestamp);

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

  async recordArrivalResponse(
    party: CancellationParty,
    userId: string,
    bookingId: string,
    response: 'yes' | 'no'
  ): Promise<BookingResponse | null> {
    const bookingRow = await this.getBookingById(bookingId);
    if (!bookingRow) return null;

    if (party === 'barber' && bookingRow.barberId !== userId) return null;
    if (party === 'client' && bookingRow.clientId !== userId) return null;

    const st = normalizeBookingStatus(bookingRow.status);
    if (!this.isActiveForArrival(st)) {
      throw new Error('INVALID_STATE');
    }

    const confirmedAt = new Date().toISOString();
    const patch: Partial<Booking> =
      party === 'client'
        ? {
            clientArrivalResponse: response,
            clientArrivalConfirmedAt: confirmedAt,
          }
        : {
            barberArrivalResponse: response,
            barberArrivalConfirmedAt: confirmedAt,
          };
    patch.updatedAt = new Date();

    await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .doc(bookingId)
      .update(patch);

    if (party === 'client' && response === 'no') {
      void this.dispatchBookingLifecycleNotifications(
        'booking_client_no_show_signal',
        bookingId
      ).catch(() => {});
    }

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

    this.assertStarted(bookingRow.timestamp);

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
      ? snapshot.docs.filter((d: QueryDocumentSnapshot) => {
          const row = d.data() as Booking;
          return statusFilter.includes(
            effectiveBookingStatus(row.status, row.timestamp)
          );
        })
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

  /**
   * The arrival check-in window is entirely client-driven (no server cron):
   * the mobile app decides when to show the prompt using its own clock, and
   * this method is just the foreground-poll backstop for "is anything
   * currently due for *me*". A booking is "due" from a few minutes before
   * its start until a while after, so a user who was away around the exact
   * moment still gets asked when they come back to the app.
   */
  private isWithinArrivalWindow(timestampIso: string): boolean {
    const startsAt = new Date(timestampIso).getTime();
    const now = Date.now();
    const beforeMs = 10 * 60_000;
    const afterMs = 20 * 60_000;
    return startsAt - now <= beforeMs && now - startsAt <= afterMs;
  }

  /** Bookings for this client that are due for an arrival check-in and unanswered. */
  async listArrivalPendingForClient(
    clientId: string
  ): Promise<BookingContract[]> {
    const snapshot = await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .where('clientId', '==', clientId)
      .get();

    const pendingDocs = snapshot.docs.filter(d => {
      const b = d.data() as Booking;
      const st = normalizeBookingStatus(b.status);
      return (
        this.isActiveForArrival(st) &&
        !b.clientArrivalResponse &&
        this.isWithinArrivalWindow(b.timestamp)
      );
    });

    const items: BookingContract[] = [];
    for (const d of pendingDocs) {
      const row = await this.getBookingById(d.id);
      if (row) items.push(bookingResponseToContract(row));
    }
    return items;
  }

  /** Bookings for this barber that are due for an arrival check-in and unanswered. */
  async listArrivalPendingForBarber(
    barberId: string
  ): Promise<BookingContract[]> {
    const snapshot = await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .where('barberId', '==', barberId)
      .get();

    const pendingDocs = snapshot.docs.filter(d => {
      const b = d.data() as Booking;
      const st = normalizeBookingStatus(b.status);
      return (
        this.isActiveForArrival(st) &&
        !b.barberArrivalResponse &&
        this.isWithinArrivalWindow(b.timestamp)
      );
    });

    const items: BookingContract[] = [];
    for (const d of pendingDocs) {
      const row = await this.getBookingById(d.id);
      if (row) items.push(bookingResponseToContract(row));
    }
    return items;
  }
}

export const bookingService = new BookingServiceClass();
