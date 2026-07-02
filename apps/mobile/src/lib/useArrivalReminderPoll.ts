// Foreground backstop + local-notification scheduler for the
// arrival-confirmation prompt — entirely client-driven, no server push or
// cron involved.
//
// Two things happen here, both while the app is foregrounded:
// 1. Poll a small per-user endpoint every ~25s for bookings that are due
//    *right now* (within the narrow arrival window) and open the sheet
//    directly. Also fires an immediate poll on foreground return, which is
//    how "backgrounded before answering" resolves itself — the booking is
//    still pending until answered or no longer active.
// 2. For clients, periodically fetch the broader "my upcoming bookings"
//    list and schedule a local (OS-level) notification ~5 minutes before
//    each active, unanswered booking's start — this is what covers the
//    phone-locked/backgrounded case, since the OS fires it on its own clock
//    with no network or server involved.
//
// Barbers don't get a generic "upcoming across all days" endpoint today
// (only day-scoped calendar data), so they rely on the foreground poll
// above whenever the app is open — a reasonable simplification since a
// working barber has the app open around appointment times anyway.

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from './auth';
import {
  getClientArrivalPending,
  getBarberArrivalPending,
  getClientUpcomingBookings,
} from './api';
import { useArrivalCheckStore } from './arrivalCheck';
import { scheduleArrivalCheckin, cancelArrivalCheckin } from './arrivalNotifications';

const POLL_INTERVAL_MS = 25_000;
const SCHEDULE_INTERVAL_MS = 2 * 60_000;

export function useArrivalReminderPoll(): void {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (status !== 'authenticated' || !role) return undefined;

    let cancelled = false;

    const poll = async () => {
      if (cancelled || AppState.currentState !== 'active') return;
      try {
        const bookings =
          role === 'client'
            ? await getClientArrivalPending()
            : await getBarberArrivalPending();
        if (cancelled) return;
        const store = useArrivalCheckStore.getState();
        for (const booking of bookings) {
          store.open({ id: booking.id, role });
        }
      } catch {
        // Transient network errors are fine to ignore — next tick retries.
      }
    };

    const scheduleUpcoming = async () => {
      if (cancelled || role !== 'client') return;
      try {
        const bookings = await getClientUpcomingBookings();
        if (cancelled) return;
        for (const booking of bookings) {
          if (
            (booking.status === 'confirmed' || booking.status === 'rescheduled') &&
            !booking.client_arrival_response
          ) {
            await scheduleArrivalCheckin({
              id: booking.id,
              role: 'client',
              timestamp: booking.timestamp,
            });
          } else {
            await cancelArrivalCheckin(booking.id);
          }
        }
      } catch {
        // Transient network errors are fine — next tick retries.
      }
    };

    void poll();
    void scheduleUpcoming();
    const pollInterval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    const scheduleInterval = setInterval(
      () => void scheduleUpcoming(),
      SCHEDULE_INTERVAL_MS,
    );

    const subscription = AppState.addEventListener('change', (next) => {
      if (appState.current !== 'active' && next === 'active') {
        void poll();
        void scheduleUpcoming();
      }
      appState.current = next;
    });

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      clearInterval(scheduleInterval);
      subscription.remove();
    };
  }, [status, role]);
}
