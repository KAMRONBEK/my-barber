// Sign-up contracts for POST /auth/{client,barber}/register.

import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Normalise a phone number to E.164. A bare 9-digit number is Uzbek. Returns
 * `null` when the input is not a phone number. Mirrors
 * backend/api/utils/phone.ts, which has the final say.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\+?[\d\s()-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    if (digits.startsWith('998') && digits.length !== 12) return null;
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

export const ClientRegisterRequestSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().max(50).optional(),
  phone: z.string(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});
export type ClientRegisterRequest = z.infer<typeof ClientRegisterRequestSchema>;

/** Free-text address, or an address with the point picked on the map. */
export const BarberAddressSchema = z.union([
  z.string().min(1).max(100),
  z.object({
    address: z.string().min(1).max(200),
    coords: z.object({ latitude: z.number(), longitude: z.number() }),
  }),
]);
export type BarberAddress = z.infer<typeof BarberAddressSchema>;

export const BarberRegisterRequestSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string(),
  location: BarberAddressSchema,
  /** `YYYY-MM-DD` */
  birthDate: z.string(),
  /** `HH:MM - HH:MM` */
  workingHours: z.string(),
});
export type BarberRegisterRequest = z.infer<typeof BarberRegisterRequestSchema>;
