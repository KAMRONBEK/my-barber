import { db, COLLECTIONS } from '../config/database';
import { Booking, BookingStatus } from '../models/booking';
import { normalizeBookingStatus } from '../utils/bookingContract';

function parseDayUtc(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function inClosedDateRange(
  isoInstant: string,
  fromDay: string,
  toDay: string
): boolean {
  const day = parseDayUtc(isoInstant);
  return day >= fromDay && day <= toDay;
}

export class EarningsServiceClass {
  private firestore = db.getFirestore();

  async getBarberEarnings(
    barberId: string,
    fromDay: string,
    toDay: string
  ): Promise<{
    summary: {
      currency: string;
      gross_total: number;
      completed_bookings: number;
      cancelled_bookings: number;
      no_show_bookings: number;
    };
    daily: Array<{
      date: string;
      gross_total: number;
      completed_bookings: number;
    }>;
    bookings: Array<{
      booking_id: string;
      timestamp: string;
      client_name: string;
      service_total: number;
      status: BookingStatus;
    }>;
  }> {
    const snap = await this.firestore
      .collection(COLLECTIONS.BOOKINGS)
      .where('barberId', '==', barberId)
      .get();

    const bookingsList = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Booking, 'id'>),
    })) as Booking[];

    let gross_total = 0;
    let completed_bookings = 0;
    let cancelled_bookings = 0;
    let no_show_bookings = 0;

    const dailyMap = new Map<
      string,
      { gross_total: number; completed_bookings: number }
    >();

    const bookingRows: Array<{
      booking_id: string;
      timestamp: string;
      client_name: string;
      service_total: number;
      status: BookingStatus;
    }> = [];

    for (const b of bookingsList) {
      const status = normalizeBookingStatus(b.status);

      const completedAt = b.completedAt;
      const updatedAt = b.updatedAt
        ? new Date(
            b.updatedAt as unknown as string | number | Date
          ).toISOString()
        : b.timestamp;

      let includeInSummary = false;
      if (status === 'completed' && completedAt) {
        includeInSummary = inClosedDateRange(completedAt, fromDay, toDay);
      } else if (status === 'cancelled') {
        includeInSummary = inClosedDateRange(updatedAt, fromDay, toDay);
      } else if (status === 'no_show') {
        includeInSummary = inClosedDateRange(updatedAt, fromDay, toDay);
      }

      if (!includeInSummary) continue;

      if (status === 'completed') {
        completed_bookings += 1;
        const total = b.serviceTotal ?? 0;
        gross_total += total;

        const dayKey = parseDayUtc(completedAt!);
        const cur = dailyMap.get(dayKey) ?? {
          gross_total: 0,
          completed_bookings: 0,
        };
        cur.gross_total += total;
        cur.completed_bookings += 1;
        dailyMap.set(dayKey, cur);

        const clientDoc = await this.firestore
          .collection(COLLECTIONS.CLIENTS)
          .doc(b.clientId)
          .get();
        const c = clientDoc.data();
        const client_name = c
          ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() ||
            c.username ||
            'Client'
          : 'Client';

        bookingRows.push({
          booking_id: b.id,
          timestamp: b.timestamp,
          client_name,
          service_total: total,
          status: 'completed',
        });
      } else if (status === 'cancelled') {
        cancelled_bookings += 1;
      } else if (status === 'no_show') {
        no_show_bookings += 1;
      }
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, v]) => ({
        date,
        gross_total: v.gross_total,
        completed_bookings: v.completed_bookings,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        currency: 'UZS',
        gross_total,
        completed_bookings,
        cancelled_bookings,
        no_show_bookings,
      },
      daily,
      bookings: bookingRows.sort((a, b) =>
        (b.timestamp || '').localeCompare(a.timestamp || '')
      ),
    };
  }
}

export const earningsService = new EarningsServiceClass();
