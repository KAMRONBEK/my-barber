// Shared "completed cuts" fetcher — used by both the profile screen's stat
// tile (derives a count) and cuts-history.tsx (renders the full list). They
// MUST share one query key; using the same key with two different query
// functions (array vs. count) previously meant whichever screen fetched
// first poisoned the other's cache entry with the wrong shape.

import { api } from './api';

// The wire contract has no embedded barber display info, only barber_id —
// callers resolve the name client-side against /client/barbers.
export interface CutHistoryItem {
  id: string;
  timestamp: string;
  barber_id: string;
  services?: Array<{ name: string; price: number }>;
}

export const COMPLETED_CUTS_QUERY_KEY = ['bookings', 'completed'] as const;

// Cursor page — the array lives under data.items, not data directly (see
// BookingHistoryScreen.tsx for why).
export async function fetchCompletedCuts(): Promise<CutHistoryItem[]> {
  const r = await api.get<{ ok: boolean; data: { items: CutHistoryItem[] } }>(
    '/client/bookings',
    { params: { status: 'completed' } },
  );
  return r.data.data?.items ?? [];
}

/** One entry of the client's own booking history. */
export interface ClientBooking {
  id: string;
  timestamp: string;
  status: string;
  barber_id: string;
  cancellation_reason?: string | null;
  reviewed?: boolean;
  services?: Array<{ name: string; price: number; durationMinutes?: number }>;
}

// The home banner and the bookings list read the same cache entry.
export const UPCOMING_QUERY_KEY = ['bookings', 'upcoming'] as const;

export async function fetchClientBookings(
  status: 'upcoming' | 'past',
): Promise<ClientBooking[]> {
  const r = await api.get<{ ok: boolean; data: { items: ClientBooking[] } }>(
    '/client/bookings',
    { params: { status } },
  );
  return r.data.data?.items ?? [];
}

/** The soonest visit that is still ahead. */
export function nextBooking(
  items: ClientBooking[],
  now: number = Date.now(),
): ClientBooking | null {
  return (
    items
      .filter((b) => b.status !== 'cancelled' && new Date(b.timestamp).getTime() >= now)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))[0] ?? null
  );
}
