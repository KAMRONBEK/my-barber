// Shared favorites state — backs the heart toggle on BarberShopScreen and
// SearchScreen, and the "Saqlangan" list on the profile screen. A single
// query keeps all three in sync (invalidating queryKeys.favorites after any
// add/remove refreshes everywhere it's used).

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
  toggleFavorite: (barberId: string) => void;
}

export function useFavoriteBarbers(): UseFavoriteBarbersResult {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

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

  const addMutation = useMutation({
    mutationFn: addFavoriteBarber,
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: removeFavoriteBarber,
    onSuccess: invalidate,
  });

  function toggleFavorite(barberId: string) {
    if (favoriteIds.has(barberId)) {
      removeMutation.mutate(barberId);
    } else {
      addMutation.mutate(barberId);
    }
  }

  return { favorites, favoriteIds, isLoading: query.isLoading, toggleFavorite };
}
