// Sign-up form rules, kept free of React so they can be unit-tested. Each
// builder returns either the request body or the translation key of the first
// problem per field. The API validates again and has the final say.

import {
  MIN_PASSWORD_LENGTH,
  type BarberRegisterRequest,
  type ClientRegisterRequest,
} from '@my-barber/types';
import type { PickedLocation } from './locationPicker';
import { phoneFromLocal } from './phone';

export interface SignupValues {
  firstName: string;
  lastName: string;
  username: string;
  /** The nine digits after +998 */
  phone: string;
  address: string;
  /** `DD.MM.YYYY` */
  birthDate: string;
  /** `HH:MM` */
  opensAt: string;
  closesAt: string;
}

export const EMPTY_SIGNUP_VALUES: SignupValues = {
  firstName: '',
  lastName: '',
  username: '',
  phone: '',
  address: '',
  birthDate: '',
  opensAt: '09:00',
  closesAt: '18:00',
};

export type SignupField = keyof SignupValues;
export type SignupErrors = Partial<Record<SignupField, string>>;

/** Everything the first screen collects; the second adds the password. */
export type SignupDetails =
  | { role: 'client'; body: Omit<ClientRegisterRequest, 'password'> }
  | { role: 'barber'; body: Omit<BarberRegisterRequest, 'password'> };

export type PasswordErrors = Partial<Record<'password' | 'confirm', string>>;

export function passwordErrors(password: string, confirm: string): PasswordErrors {
  const errors: PasswordErrors = {};
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'signup.errors.password';
  }
  if (confirm !== password || !confirm) {
    errors.confirm = 'signup.errors.passwordMismatch';
  }
  return errors;
}

export type SignupResult<T> =
  | { ok: true; body: T }
  | { ok: false; errors: SignupErrors };

function digitsOf(text: string, max: number): string {
  return text.replace(/\D/g, '').slice(0, max);
}

/** Inserts the dots while typing: `0105` → `01.05`. */
export function maskDate(text: string): string {
  const d = digitsOf(text, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('.');
}

/** Inserts the colon while typing: `0930` → `09:30`. */
export function maskTime(text: string): string {
  const d = digitsOf(text, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** `DD.MM.YYYY` → `YYYY-MM-DD`, or null for a date that cannot be a birthday. */
export function parseBirthDate(text: string, now = new Date()): string | null {
  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const [day, month, year] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day;
  if (!isRealDate || year! < 1900 || date.getTime() >= now.getTime()) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function minutesOf(time: string): number | null {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function commonErrors(v: SignupValues): SignupErrors {
  const errors: SignupErrors = {};
  if (!v.firstName.trim()) errors.firstName = 'signup.errors.required';
  if (!phoneFromLocal(v.phone)) errors.phone = 'signup.errors.phone';
  return errors;
}

export function buildClientSignup(
  v: SignupValues,
): SignupResult<Omit<ClientRegisterRequest, 'password'>> {
  const errors = commonErrors(v);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    body: {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      phone: phoneFromLocal(v.phone)!,
    },
  };
}

export function buildBarberSignup(
  v: SignupValues,
  point: PickedLocation | null,
  now = new Date(),
): SignupResult<Omit<BarberRegisterRequest, 'password'>> {
  const errors = commonErrors(v);
  const username = v.username.trim();
  const address = v.address.trim();
  const birthDate = parseBirthDate(v.birthDate, now);
  const opens = minutesOf(v.opensAt);
  const closes = minutesOf(v.closesAt);

  if (!v.lastName.trim()) errors.lastName = 'signup.errors.required';
  if (username.length < 3) errors.username = 'signup.errors.username';
  if (!address) errors.address = 'signup.errors.required';
  if (!birthDate) errors.birthDate = 'signup.errors.birthDate';
  if (opens === null) errors.opensAt = 'signup.errors.time';
  if (closes === null || (opens !== null && closes <= opens)) {
    errors.closesAt = 'signup.errors.time';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    body: {
      username,
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      phone: phoneFromLocal(v.phone)!,
      location: point
        ? {
            address,
            coords: { latitude: point.latitude, longitude: point.longitude },
          }
        : address.slice(0, 100),
      birthDate: birthDate!,
      workingHours: `${v.opensAt} - ${v.closesAt}`,
    },
  };
}
