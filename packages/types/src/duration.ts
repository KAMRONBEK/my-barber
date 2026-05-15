// Booking duration math.
//
// Base service is 30 min. Each additional service stacks additively with a
// 5-minute buffer between services. Total is rounded UP to the configured
// slot granularity (default 30 min). Services without an explicit
// `durationMinutes` fall back to DEFAULT_SERVICE_DURATION_MINUTES.

export const DEFAULT_BUFFER_MINUTES = 5;
export const DEFAULT_SLOT_GRANULARITY_MINUTES = 30;
export const DEFAULT_SERVICE_DURATION_MINUTES = 30;

export type DurationServiceInput = {
  durationMinutes?: number | null;
};

export interface CalculateDurationOptions {
  bufferMinutes?: number;
  slotGranularityMinutes?: number;
  defaultServiceDurationMinutes?: number;
}

// Returns total minutes required to perform the selected services back-to-back,
// rounded up to the slot granularity. Returns 0 for an empty list.
//
// Examples (defaults: 5min buffer, 30min slot):
//   []                  -> 0
//   [{30}]              -> 30
//   [{30}, {15}]        -> 30+5+15 = 50 -> 60
//   [{30}, {15}, {30}]  -> 30+5+15+5+30 = 85 -> 90
//   [{30}, {10}]        -> 30+5+10 = 45 -> 60
export function calculateTotalDuration(
  services: ReadonlyArray<DurationServiceInput>,
  options: CalculateDurationOptions = {},
): number {
  if (services.length === 0) return 0;

  const buffer = options.bufferMinutes ?? DEFAULT_BUFFER_MINUTES;
  const granularity =
    options.slotGranularityMinutes ?? DEFAULT_SLOT_GRANULARITY_MINUTES;
  const fallback =
    options.defaultServiceDurationMinutes ?? DEFAULT_SERVICE_DURATION_MINUTES;

  const sumServices = services.reduce((acc, s) => {
    const d =
      typeof s.durationMinutes === 'number' && s.durationMinutes > 0
        ? s.durationMinutes
        : fallback;
    return acc + d;
  }, 0);

  const totalBuffer = buffer * Math.max(0, services.length - 1);
  const raw = sumServices + totalBuffer;

  if (granularity <= 0) return raw;
  return Math.ceil(raw / granularity) * granularity;
}
