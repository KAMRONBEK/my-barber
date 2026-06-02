// React Query client. staleTime defaults per the brief:
//   - barber list: 5 min (long staleTime to avoid refetch noise)
//   - slots / per-day bookings: 30 s (must stay fresh while the user picks a slot)

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // generic 1 min default
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  me: ['me'] as const,
  banner: ['banner'] as const,
  barbers: ['barbers'] as const,
  bookings: (barberId: string, date: string) =>
    ['bookings', barberId, date] as const,
};

// Staleness presets used by individual hooks/screens.
export const STALE = {
  banner: 5 * 60 * 1000,
  bookings: 30 * 1000,
  me: 60 * 1000,
} as const;
