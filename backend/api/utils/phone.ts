/**
 * Normalise a phone number to E.164. A bare 9-digit number is Uzbek.
 * Returns `null` when the input is not a phone number (e.g. a username).
 */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!/^\+?[\d\s()-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    // An Uzbek number is exactly 998 + 9 digits.
    if (digits.startsWith('998') && digits.length !== 12) return null;
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}
