// Foreground backstop for the arrival-confirmation prompt. Push delivery is
// best-effort, not guaranteed (and permission may be denied), so this polls
// a small per-user endpoint while the app is open and surfaces any booking
// whose reminder has fired but hasn't been answered yet. Also fires an
// immediate poll on foreground return, which is how "backgrounded before
// answering" resolves itself — the booking is still pending until answered
// or no longer active.

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from './auth';
import { getClientArrivalPending, getBarberArrivalPending } from './api';
import { useArrivalCheckStore } from './arrivalCheck';

const POLL_INTERVAL_MS = 25_000;

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

    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (next) => {
      if (appState.current !== 'active' && next === 'active') {
        void poll();
      }
      appState.current = next;
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [status, role]);
}
