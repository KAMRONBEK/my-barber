/**
 * A barber's address is either free text or text plus the point picked on the
 * map: `{ address, coords: { latitude, longitude } }`.
 */
export function isValidBarberLocation(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length >= 1 && value.length <= 100;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const { address, coords, latitude, longitude } = value as Record<
    string,
    unknown
  >;
  if (
    address !== undefined &&
    (typeof address !== 'string' || address.length > 200)
  ) {
    return false;
  }
  // Older documents keep the coordinates at the top level, sometimes as strings.
  const point = (coords ?? { latitude, longitude }) as Record<string, unknown>;
  const inRange = (raw: unknown, limit: number) =>
    (typeof raw === 'number' || (typeof raw === 'string' && raw !== '')) &&
    Math.abs(Number(raw)) <= limit;
  return inRange(point.latitude, 90) && inRange(point.longitude, 180);
}
