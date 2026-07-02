// Shared "completed cuts" fetcher — used by both the profile screen's stat
// tile (derives a count) and cuts-history.tsx (renders the full list). They
// MUST share one query key; using the same key with two different query
// functions (array vs. count) previously meant whichever screen fetched
// first poisoned the other's cache entry with the wrong shape.

import { api } from './api';

export interface CutHistoryItem {
  id: string;
  timestamp: string;
  barberName?: string;
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
