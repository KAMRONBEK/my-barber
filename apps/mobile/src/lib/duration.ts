// How long a visit takes, as shown to people: the sum of the services. Every
// screen uses this, so one booking never shows two different durations. (The
// slot grid and the API additionally round up to whole half hours to avoid
// overlaps.)

export const DEFAULT_SERVICE_MINUTES = 30;

export function serviceMinutes(
  services: ReadonlyArray<{ durationMinutes?: number | null }> | undefined,
): number {
  if (!services?.length) return DEFAULT_SERVICE_MINUTES;
  return services.reduce(
    (sum, s) =>
      sum + (s.durationMinutes && s.durationMinutes > 0 ? s.durationMinutes : DEFAULT_SERVICE_MINUTES),
    0,
  );
}
