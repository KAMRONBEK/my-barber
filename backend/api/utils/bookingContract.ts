import {
  BookingContract,
  BookingResponse,
  BookingStatus,
} from '../models/booking';

export function normalizeBookingStatus(raw?: string): BookingStatus {
  if (
    raw === 'pending_confirmation' ||
    raw === 'confirmed' ||
    raw === 'declined' ||
    raw === 'cancelled' ||
    raw === 'rescheduled' ||
    raw === 'completed' ||
    raw === 'no_show'
  ) {
    return raw;
  }
  return 'confirmed';
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
