import {
  BookingContract,
  BookingResponse,
  BookingStatus,
} from '../models/booking';

export function normalizeBookingStatus(raw?: string): BookingStatus {
  switch (raw) {
    case 'pending_confirmation':
    case 'confirmed':
    case 'declined':
    case 'cancelled':
    case 'rescheduled':
    case 'completed':
    case 'no_show':
      return raw;
    case 'pending':
      return 'pending_confirmation'; // legacy Firestore value pre-migration
    case 'in_progress':
      return 'confirmed'; // legacy Firestore value pre-migration
    default:
      return 'pending_confirmation';
  }
}

export function bookingResponseToContract(o: BookingResponse): BookingContract {
  const status = normalizeBookingStatus(o.status);
  const services = (o.services || []).map(s => ({
    id: String(s.id ?? ''),
    name: s.name,
    price: s.price,
  }));
  const cancellation =
    o.cancellationReason ??
    (status === 'declined' ? (o.declineReason ?? null) : null);

  return {
    id: o.id,
    status,
    timestamp: o.timestamp,
    previous_timestamp: o.previousTimestamp ?? null,
    cancellation_reason: cancellation,
    barber_id: o.barberId,
    client_id: o.clientId,
    services,
    updated_at: (o.updatedAt
      ? new Date(o.updatedAt as unknown as string | number | Date)
      : new Date()
    ).toISOString(),
  };
}
