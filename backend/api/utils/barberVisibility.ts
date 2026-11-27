import { BarberResponse } from '../models/barber';

/** Accounts created before moderation existed have no status and are approved. */
export function isPublicBarber(barber: { approvalStatus?: string }): boolean {
  return (barber.approvalStatus ?? 'approved') === 'approved';
}

/** Strip what a client has no reason to see: login, birth date, moderation note. */
export function toPublicBarber(barber: BarberResponse): BarberResponse {
  const publicFields: BarberResponse = { ...barber };
  delete publicFields.username;
  delete publicFields.birthDate;
  delete publicFields.approvalMessage;
  return publicFields;
}
