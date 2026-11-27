// Search, filtering and ordering of the barber list, shared by the search
// screen and the map.

import type { ApiBarberFull } from './api';
import { distanceKm, extractBarberCoordinate, type LatLng } from './maps';
import { openState } from './openState';

export type BarberFilter = 'all' | 'rating' | 'distance' | 'open' | 'beard';

const BEARD = /soqol|бород|beard/i;

/** Kilometres to the barber, or null when either position is unknown. */
export function kmTo(barber: ApiBarberFull, user: LatLng | null): number | null {
  const point = extractBarberCoordinate(barber.location);
  return user && point ? distanceKm(user, point) : null;
}

export function listBarbers(
  barbers: ApiBarberFull[],
  options: { query?: string; filter?: BarberFilter; user?: LatLng | null; now?: Date },
): ApiBarberFull[] {
  const { filter = 'all', user = null, now = new Date() } = options;
  const query = options.query?.trim().toLowerCase() ?? '';

  const matches = barbers.filter((b) => {
    if (!query) return true;
    const text = [b.firstName, b.lastName, ...(b.services ?? []).map((s) => s.name)]
      .join(' ')
      .toLowerCase();
    return text.includes(query);
  });

  switch (filter) {
    case 'open':
      return matches.filter((b) => {
        const state = openState(b.workingHours, now);
        return state === 'open' || state === 'closing';
      });
    case 'beard':
      return matches.filter((b) => (b.services ?? []).some((s) => BEARD.test(s.name)));
    case 'rating':
      return [...matches].sort(
        (a, b) =>
          (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0) ||
          (b.ratingCount ?? 0) - (a.ratingCount ?? 0),
      );
    case 'distance':
      // Barbers without a map point go last.
      return [...matches].sort(
        (a, b) => (kmTo(a, user) ?? Infinity) - (kmTo(b, user) ?? Infinity),
      );
    default:
      return matches;
  }
}
