/* eslint-env jest */
import {
  normalizeBookingStatus,
  bookingResponseToContract,
} from '../../utils/bookingContract';
import { BookingResponse } from '../../models/booking';

describe('normalizeBookingStatus', () => {
  it.each([
    'pending_confirmation',
    'confirmed',
    'declined',
    'cancelled',
    'rescheduled',
    'completed',
    'no_show',
  ])('keeps known status %s', s => {
    expect(normalizeBookingStatus(s)).toBe(s);
  });

  it('falls back to confirmed for unknown values', () => {
    expect(normalizeBookingStatus('garbage')).toBe('confirmed');
    expect(normalizeBookingStatus(undefined)).toBe('confirmed');
  });
});

describe('bookingResponseToContract', () => {
  const base: BookingResponse = {
    id: 'o1',
    barberId: 'b1',
    clientId: 'c1',
    timestamp: '2026-05-10T00:00:00.000Z',
    status: 'confirmed',
    services: [{ id: 's1', barberId: 'b1', name: 'Cut', price: 100 }],
    updatedAt: new Date('2026-05-10T00:00:00.000Z'),
  };

  it('emits snake_case contract', () => {
    const out = bookingResponseToContract(base);
    expect(out).toMatchObject({
      id: 'o1',
      barber_id: 'b1',
      client_id: 'c1',
      status: 'confirmed',
      services: [{ id: 's1', name: 'Cut', price: 100 }],
    });
    expect(out.updated_at).toMatch(/2026-05-10/);
    expect(out.previous_timestamp).toBeNull();
    expect(out.cancellation_reason).toBeNull();
  });

  it('uses declineReason when status is declined and no cancellationReason', () => {
    const out = bookingResponseToContract({
      ...base,
      status: 'declined',
      declineReason: 'busy',
    });
    expect(out.cancellation_reason).toBe('busy');
  });

  it('handles missing services gracefully', () => {
    const out = bookingResponseToContract({ ...base, services: undefined });
    expect(out.services).toEqual([]);
  });

  it('falls back to current time when updatedAt missing', () => {
    const out = bookingResponseToContract({ ...base, updatedAt: undefined });
    expect(out.updated_at).toBeDefined();
  });
});
