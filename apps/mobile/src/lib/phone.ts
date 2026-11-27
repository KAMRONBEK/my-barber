// Uzbek phone numbers in inputs: the field shows a fixed +998 and the user
// types the remaining nine digits, grouped as `90 123 45 67`.

import { normalizePhone } from '@my-barber/types';

export const PHONE_PREFIX = '+998';
const LOCAL_LENGTH = 9;
const GROUPS = [2, 3, 2, 2];

/** The local digits out of whatever was typed, pasted or auto-filled. */
export function toLocalDigits(text: string): string {
  let digits = text.replace(/\D/g, '');
  // A full international number was pasted: drop the country code.
  if (digits.length >= 12 && digits.startsWith('998')) digits = digits.slice(3);
  return digits.slice(0, LOCAL_LENGTH);
}

export function formatLocalPhone(digits: string): string {
  const parts: string[] = [];
  let from = 0;
  for (const size of GROUPS) {
    if (from >= digits.length) break;
    parts.push(digits.slice(from, from + size));
    from += size;
  }
  return parts.join(' ');
}

/** `+998XXXXXXXXX`, or null while the number is incomplete. */
export function phoneFromLocal(digits: string): string | null {
  return digits.length === LOCAL_LENGTH ? `${PHONE_PREFIX}${digits}` : null;
}

/** `+998 90 123 45 67` for display; other numbers are returned unchanged. */
export function formatPhone(phone: string): string {
  const local = localFromPhone(phone);
  return local ? `${PHONE_PREFIX} ${formatLocalPhone(local)}` : phone;
}

/** Accounts created with a phone number use it as their username. */
export function isPhoneUsername(username: string): boolean {
  return normalizePhone(username) === username;
}

/** Local digits of a stored Uzbek number; null for any other value. */
export function localFromPhone(phone: string): string | null {
  const normalized = normalizePhone(phone);
  return normalized?.startsWith(PHONE_PREFIX)
    ? normalized.slice(PHONE_PREFIX.length)
    : null;
}
