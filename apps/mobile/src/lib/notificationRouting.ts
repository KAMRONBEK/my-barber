// Deep-link targets for server-driven booking-lifecycle notifications (push
// payload or in-app inbox row) — as opposed to arrivalNotifications.ts, which
// covers the purely local/device-scheduled arrival check-in prompt.
//
// Push data and inbox `metadata` share the same shape (see
// backend/api/services/bookingLifecycleNotifications.ts): `booking_id`,
// `kind` (internal lifecycle event), and `notification_type` (what's shown
// to the user / stored as the inbox row's `type`). Routing only needs
// `notification_type` — it's already 1:1 with which role can receive it.

import type { QueryClient } from '@tanstack/react-query';

export type NotificationRecipientRole = 'client' | 'barber';

export interface BookingLifecyclePushData {
  booking_id: string;
  kind: string;
  notification_type: string;
}

export function isBookingLifecyclePushData(
  data: unknown,
): data is BookingLifecyclePushData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).booking_id === 'string' &&
    typeof (data as Record<string, unknown>).notification_type === 'string'
  );
}

interface NotificationEffect {
  /** Screen to deep-link to. */
  route: string;
  /**
   * Query key prefixes to force-refetch at the same time. Necessary because
   * expo-router Tabs keep screens mounted once visited — navigating back to
   * an already-visited tab does NOT remount it or trigger a refetch, so
   * without this, a booking that changed status while the tab sat idle in
   * the background stays invisible (whatever was cached before the change)
   * until something unrelated forces a refetch. A push arriving is by
   * definition proof the underlying data changed, so we invalidate
   * unconditionally rather than trusting each query's staleTime.
   */
  invalidate: string[][];
}

// Client only ever gets these once their booking already has a resolved
// state — the bookings list (with status pills) is the correct landing spot
// until a single-booking-detail endpoint exists (see ConfirmationScreen.tsx).
// 'bookings' as a prefix covers BookingHistoryScreen's ['bookings','upcoming']
// / ['bookings','past'] and lib/bookings.ts's ['bookings','completed'] alike.
const CLIENT_EFFECTS: Record<string, NotificationEffect> = {
  booking_confirmed: { route: '/bookings', invalidate: [['bookings']] },
  booking_declined: { route: '/bookings', invalidate: [['bookings']] },
  booking_rescheduled: { route: '/bookings', invalidate: [['bookings']] },
  booking_cancelled: { route: '/bookings', invalidate: [['bookings']] },
  booking_completed: { route: '/bookings', invalidate: [['bookings']] },
  no_show: { route: '/bookings', invalidate: [['bookings']] },
};

// Barber notification types route to whichever tab actually shows that
// booking: a fresh request needs a decision (Requests tab), everything else
// is already-scheduled time best seen on the day timeline (Calendar tab).
// 'barber-bookings' as a prefix covers both calendar.tsx's
// ['barber-bookings', dateStr] and requests.tsx's plain ['barber-bookings'].
const BARBER_EFFECTS: Record<string, NotificationEffect> = {
  booking_request: {
    route: '/(barber)/(tabs)/requests',
    invalidate: [['barber-bookings']],
  },
  booking_cancelled: {
    route: '/(barber)/(tabs)/calendar',
    invalidate: [['barber-bookings']],
  },
  booking_rescheduled: {
    route: '/(barber)/(tabs)/calendar',
    invalidate: [['barber-bookings']],
  },
  booking_client_no_show_signal: {
    route: '/(barber)/(tabs)/calendar',
    invalidate: [['barber-bookings']],
  },
};

function effectFor(
  role: NotificationRecipientRole | null | undefined,
  notificationType: string | null | undefined,
): NotificationEffect | undefined {
  if (!notificationType) return undefined;
  const table = role === 'barber' ? BARBER_EFFECTS : CLIENT_EFFECTS;
  return table[notificationType];
}

/** Resolves where tapping a notification (push or inbox row) should navigate. Falls back to the inbox itself for unmapped/unknown types. */
export function resolveNotificationRoute(
  role: NotificationRecipientRole | null | undefined,
  notificationType: string | null | undefined,
): string {
  return effectFor(role, notificationType)?.route ?? '/notifications';
}

/** Force-refetches whatever query backs the deep-link target — call alongside resolveNotificationRoute so the destination shows the change the push is about, not a stale cached snapshot. No-ops for unmapped types. */
export function invalidateQueriesForNotification(
  queryClient: QueryClient,
  role: NotificationRecipientRole | null | undefined,
  notificationType: string | null | undefined,
): void {
  const effect = effectFor(role, notificationType);
  if (!effect) return;
  for (const queryKey of effect.invalidate) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
