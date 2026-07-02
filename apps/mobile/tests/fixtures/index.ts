// Type-safe fixture builders. All shapes come from @my-barber/types — no
// re-definitions here. Import these in every test that needs domain objects.

import type { Service, Booking, BookingContract, BookingStatus } from '@my-barber/types';
import type { ApiBarber, ApiService, ApiExistingBooking, LoginResponse } from '../../src/lib/api';
import type { ClientProfile } from '../../src/lib/auth';

// ── Primitive helpers ────────────────────────────────────────────────────────

let _id = 0;
export function nextId(): string {
  return `fixture-id-${(++_id).toString().padStart(4, '0')}`;
}
export function resetIds(): void {
  _id = 0;
}

// ── Service / ApiService ─────────────────────────────────────────────────────

export function makeApiService(overrides: Partial<ApiService> = {}): ApiService {
  return {
    id: nextId(),
    barberId: 'barber-001',
    name: 'Soch olish',
    price: 80000,
    durationMinutes: 30,
    isActive: true,
    ...overrides,
  };
}

export function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: nextId(),
    barberId: 'barber-001',
    name: 'Soch olish',
    price: 80000,
    durationMinutes: 30,
    ...overrides,
  };
}

// ── ApiBarber ────────────────────────────────────────────────────────────────

export function makeApiBarber(overrides: Partial<ApiBarber> = {}): ApiBarber {
  const haircut = makeApiService({ name: 'Soch olish', price: 80000, durationMinutes: 30 });
  const beard = makeApiService({ name: 'Soqol', price: 50000, durationMinutes: 15 });
  return {
    id: nextId(),
    username: 'lochin_barber',
    firstName: 'Lochin',
    lastName: 'Tursunov',
    phone: '+998901234567',
    avatar: undefined,
    services: [haircut, beard],
    ratingAverage: 4.87,
    ratingCount: 142,
    ...overrides,
  };
}

// ── ClientProfile ────────────────────────────────────────────────────────────

export function makeClientProfile(overrides: Partial<ClientProfile> = {}): ClientProfile {
  return {
    id: nextId(),
    username: 'testuser',
    firstName: 'Ali',
    lastName: 'Valiyev',
    phone: '+998901111111',
    avatar: undefined,
    ...overrides,
  };
}

// ── LoginResponse ────────────────────────────────────────────────────────────

export function makeLoginResponse(overrides: Partial<LoginResponse> = {}): LoginResponse {
  return {
    client: makeClientProfile(),
    token: 'test-jwt-token',
    ...overrides,
  };
}

// ── BookingContract (wire shape) ─────────────────────────────────────────────

export function makeBookingContract(
  overrides: Partial<BookingContract> = {},
): BookingContract {
  const now = new Date(2026, 4, 16, 10, 0, 0).toISOString();
  return {
    id: nextId(),
    status: 'pending_confirmation',
    timestamp: now,
    previous_timestamp: null,
    cancellation_reason: null,
    barber_id: 'barber-001',
    client_id: 'client-001',
    services: [
      { id: 'svc-001', name: 'Soch olish', price: 80000 },
    ],
    updated_at: now,
    client_arrival_response: null,
    client_arrival_confirmed_at: null,
    barber_arrival_response: null,
    barber_arrival_confirmed_at: null,
    ...overrides,
  };
}

// ── Booking (camelCase mobile shape) ─────────────────────────────────────────

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  const now = new Date(2026, 4, 16, 10, 0, 0).toISOString();
  return {
    id: nextId(),
    status: 'pending_confirmation',
    timestamp: now,
    previousTimestamp: null,
    cancellationReason: null,
    barberId: 'barber-001',
    clientId: 'client-001',
    services: [
      { id: 'svc-001', name: 'Soch olish', price: 80000 },
    ],
    updatedAt: now,
    clientArrivalResponse: null,
    clientArrivalConfirmedAt: null,
    barberArrivalResponse: null,
    barberArrivalConfirmedAt: null,
    ...overrides,
  };
}

// ── ApiExistingBooking ───────────────────────────────────────────────────────

export function makeExistingBooking(
  overrides: Partial<ApiExistingBooking> = {},
): ApiExistingBooking {
  return {
    id: nextId(),
    timestamp: new Date(2026, 4, 16, 10, 0, 0).toISOString(),
    status: 'confirmed',
    services: [makeApiService()],
    ...overrides,
  };
}

// ── BookingStatus set ────────────────────────────────────────────────────────

export const ALL_BOOKING_STATUSES: BookingStatus[] = [
  'pending_confirmation',
  'confirmed',
  'declined',
  'cancelled',
  'rescheduled',
  'completed',
  'no_show',
];
