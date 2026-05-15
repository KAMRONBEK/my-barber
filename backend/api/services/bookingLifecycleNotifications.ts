/**
 * Single source for booking-driven inbox + Expo push copy and recipient routing.
 * Keep in sync with lifecycle callers in BookingServiceClass.
 */

export type LifecycleRecipientRole = 'barber' | 'client';

export interface BookingLifecycleSnapshot {
  id: string;
  barberId: string;
  clientId: string;
  timestamp: string;
}

export interface BookingLifecycleDelivery {
  recipientType: LifecycleRecipientRole;
  notificationType: string;
  title: string;
  body: string;
}

/** Push data uses string fields only for reliable Expo payloads. */
export function buildBookingLifecyclePushData(
  kind: string,
  bookingId: string,
  notificationType: string,
  extra?: Record<string, unknown>
): Record<string, string> {
  const data: Record<string, string> = {
    booking_id: bookingId,
    kind,
    notification_type: notificationType,
  };
  const by = extra?.cancelled_by;
  if (typeof by === 'string') {
    data.cancelled_by = by;
  }
  return data;
}

export function getBookingLifecycleDeliveries(
  kind: string,
  booking: BookingLifecycleSnapshot,
  extra?: Record<string, unknown>
): BookingLifecycleDelivery[] {
  if (kind === 'booking_cancelled') {
    const by = extra?.cancelled_by as string | undefined;
    if (by === 'client') {
      return [
        {
          recipientType: 'barber',
          notificationType: 'booking_cancelled',
          title: 'Booking cancelled',
          body: 'The client cancelled a booking.',
        },
      ];
    }
    if (by === 'barber') {
      return [
        {
          recipientType: 'client',
          notificationType: 'booking_cancelled',
          title: 'Booking cancelled',
          body: 'Your booking was cancelled by the barber.',
        },
      ];
    }
    return [];
  }

  const timeLocale = (): string => new Date(booking.timestamp).toLocaleString();

  type Side = Omit<BookingLifecycleDelivery, 'recipientType'>;
  const templates: Record<
    string,
    Partial<Record<LifecycleRecipientRole, Side>>
  > = {
    booking_created: {
      barber: {
        notificationType: 'booking_request',
        title: 'New booking',
        body: 'You have a new booking request.',
      },
    },
    booking_confirmed: {
      client: {
        notificationType: 'booking_confirmed',
        title: 'Booking confirmed',
        body: `Your appointment is confirmed for ${timeLocale()}`,
      },
    },
    booking_declined: {
      client: {
        notificationType: 'booking_declined',
        title: 'Booking declined',
        body: 'The barber declined your booking request.',
      },
    },
    booking_rescheduled: {
      barber: {
        notificationType: 'booking_rescheduled',
        title: 'Booking rescheduled',
        body: 'A booking time was changed.',
      },
      client: {
        notificationType: 'booking_rescheduled',
        title: 'Booking rescheduled',
        body: `Your appointment was moved to ${timeLocale()}`,
      },
    },
    no_show: {
      client: {
        notificationType: 'no_show',
        title: 'Marked as no-show',
        body: 'Your appointment was marked as no-show.',
      },
    },
    booking_completed: {
      client: {
        notificationType: 'booking_completed',
        title: 'Appointment completed',
        body: 'Thank you for your visit.',
      },
    },
  };

  const t = templates[kind];
  if (!t) return [];

  const out: BookingLifecycleDelivery[] = [];
  if (t.barber) out.push({ recipientType: 'barber', ...t.barber });
  if (t.client) out.push({ recipientType: 'client', ...t.client });
  return out;
}
