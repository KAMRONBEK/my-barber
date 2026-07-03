// Local (device-scheduled) notifications for the arrival check-in prompt —
// entirely front-end, no server push involved. The OS fires these on its own
// clock even if the app is backgrounded/killed, so this is what covers the
// "phone locked" case; the foreground poll (useArrivalReminderPoll.ts) is
// the backstop for whatever this misses (permission denied, app never saw
// the booking before backgrounding, clock drift, etc).
//
// Each booking gets a stable notification identifier (`arrival-<bookingId>`)
// so re-scheduling (booking rescheduled) or cancelling (booking
// answered/cancelled) is idempotent — no need to track state ourselves.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_LEAD_MINUTES = 5;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Requests notification permission (needed to display local notifications). Safe to call repeatedly. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    // Unsupported environment (e.g. simulator) — the foreground poll still works.
    return false;
  }
}

function arrivalNotificationId(bookingId: string): string {
  return `arrival-${bookingId}`;
}

export interface ArrivalCheckinBooking {
  id: string;
  role: 'client' | 'barber';
  /** ISO timestamp of the booking's scheduled start. */
  timestamp: string;
}

/**
 * Schedules (or re-schedules) a local notification ~5 minutes before the
 * booking's start. No-ops if that moment has already passed — the foreground
 * poll covers "due now" bookings the app didn't get to schedule ahead of time.
 */
export async function scheduleArrivalCheckin(
  booking: ArrivalCheckinBooking,
): Promise<void> {
  const identifier = arrivalNotificationId(booking.id);
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  const triggerAt = new Date(booking.timestamp).getTime() - REMINDER_LEAD_MINUTES * 60_000;
  if (triggerAt <= Date.now()) return;

  const isClient = booking.role === 'client';
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Appointment starting soon',
      body: isClient ? 'Are you at the barber?' : 'Is the client here?',
      data: {
        kind: 'booking_upcoming_checkin',
        booking_id: booking.id,
        role: booking.role,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
    },
  }).catch(() => {
    // Scheduling can fail silently on some platforms/permission states —
    // the foreground poll is the backstop.
  });
}

/** Cancels a previously scheduled reminder — call once a booking is answered, cancelled, or completed. */
export async function cancelArrivalCheckin(bookingId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    arrivalNotificationId(bookingId),
  ).catch(() => {});
}

export interface ArrivalCheckinNotificationData {
  kind: 'booking_upcoming_checkin';
  booking_id: string;
  role: 'client' | 'barber';
}

export function isArrivalCheckinNotification(
  data: unknown,
): data is ArrivalCheckinNotificationData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).kind === 'booking_upcoming_checkin' &&
    typeof (data as Record<string, unknown>).booking_id === 'string'
  );
}
