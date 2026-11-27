// Barber moderation state. New barbers wait until an admin approves them; the
// server enforces it, the app shows a waiting screen.

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getBarberMe } from './api';
import { useAuthStore, type BarberProfile } from './auth';

/** Accounts created before moderation existed have no status and are approved. */
export function isBarberApproved(barber: BarberProfile | null): boolean {
  return (barber?.approval_status ?? 'approved') === 'approved';
}

/** Re-reads the barber's profile, including the moderation state. */
export async function refreshBarberProfile(): Promise<void> {
  const { token } = useAuthStore.getState();
  const { barber } = await getBarberMe();
  // Ignore a late answer if the user signed out or switched accounts meanwhile.
  if (token && useAuthStore.getState().token === token) {
    await useAuthStore.getState().setBarber(barber);
  }
}

/**
 * Keeps the stored state current on launch and on return to the app, so an
 * approval or a suspension takes effect without signing in again.
 */
export function useBarberApprovalSync(): void {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (status !== 'authenticated' || role !== 'barber') return undefined;
    const refresh = () => {
      // Offline is fine: the last known state stays until the next try.
      refreshBarberProfile().catch(() => {});
    };
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [status, role]);
}
