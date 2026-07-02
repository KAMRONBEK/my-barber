// Shared favorites state — backs the heart toggle on BarberShopScreen and
// SearchScreen, and the "Saqlangan" list on the profile screen. A single
// query keeps all three in sync (invalidating queryKeys.favorites after any
// add/remove refreshes everywhere it's used).

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addFavoriteBarber,
  getFavoriteBarbers,
  removeFavoriteBarber,
  type ApiBarberFull,
} from '../lib/api';
import { queryKeys } from '../lib/query';
import { useAuthStore } from '../lib/auth';

export interface UseFavoriteBarbersResult {
  favorites: ApiBarberFull[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  /** Barber ids with an add/remove request currently in flight. */
  pendingIds: Set<string>;
  toggleFavorite: (barberId: string) => void;
}

export function useFavoriteBarbers(): UseFavoriteBarbersResult {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  // Tracked manually (rather than derived from a single useMutation's
  // .isPending/.variables) so two different barbers being toggled at once
  // don't get conflated into one pending id.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: getFavoriteBarbers,
    staleTime: 60 * 1000,
    enabled: !!token,
  });

  const favorites = query.data ?? [];
  const favoriteIds = new Set(favorites.map((b) => b.id));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.favorites });

  function setPending(barberId: string, pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(barberId);
      } else {
        next.delete(barberId);
      }
      return next;
    });
  }

  const addMutation = useMutation({
    mutationFn: addFavoriteBarber,
    onMutate: (barberId) => setPending(barberId, true),
    onSettled: (_data, _err, barberId) => setPending(barberId, false),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: removeFavoriteBarber,
    onMutate: (barberId) => setPending(barberId, true),
    onSettled: (_data, _err, barberId) => setPending(barberId, false),
    onSuccess: invalidate,
  });

  function toggleFavorite(barberId: string) {
    if (pendingIds.has(barberId)) return;
    if (favoriteIds.has(barberId)) {
      removeMutation.mutate(barberId);
    } else {
      addMutation.mutate(barberId);
    }
  }

  return {
    favorites,
    favoriteIds,
    pendingIds,
    isLoading: query.isLoading,
    toggleFavorite,
  };
}
