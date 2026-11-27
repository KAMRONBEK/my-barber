// Whether a barber is working now, from the single `HH:MM - HH:MM` string the
// profile has. Unknown formats give null, and the screens then show nothing
// rather than a guess.

export type OpenState = 'open' | 'closing' | 'closed';

const CLOSING_SOON_MINUTES = 60;
const TASHKENT_OFFSET_MINUTES = 5 * 60;

export function openState(
  workingHours: string | undefined,
  now: Date = new Date(),
): OpenState | null {
  const ranges = [
    ...(workingHours ?? '').matchAll(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/g),
  ];
  if (ranges.length !== 1) return null;
  const [, oh, om, ch, cm] = ranges[0]!.map(Number);
  const open = oh! * 60 + om!;
  const close = ch! * 60 + cm!;
  if (close <= open) return null;

  const minutes =
    (now.getUTCHours() * 60 + now.getUTCMinutes() + TASHKENT_OFFSET_MINUTES) % (24 * 60);
  if (minutes < open || minutes >= close) return 'closed';
  return close - minutes <= CLOSING_SOON_MINUTES ? 'closing' : 'open';
}
