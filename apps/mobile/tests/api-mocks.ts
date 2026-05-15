// Shared API mock helpers using axios-mock-adapter.
// Import `setupApiMocks` in screen tests to get a pre-wired adapter.
// Each test resets and re-registers handlers to stay independent.

import MockAdapter from 'axios-mock-adapter';
import { api } from '../src/lib/api';
import {
  makeLoginResponse,
  makeClientProfile,
  makeApiBarber,
  makeBookingContract,
  makeExistingBooking,
} from './fixtures';

export { MockAdapter };

let _mock: MockAdapter | null = null;

export function getApiMock(): MockAdapter {
  if (!_mock) {
    // passThrough: false so any unmocked call fails loudly
    _mock = new MockAdapter(api, { onNoMatch: 'throwException' });
  }
  return _mock;
}

export function resetApiMocks(): void {
  getApiMock().reset();
}

/** Wire the default happy-path responses used across most screen tests. */
export function setupHappyPath(mock: MockAdapter): void {
  const loginResp = makeLoginResponse();
  const barbers = [makeApiBarber({ id: 'barber-001' }), makeApiBarber({ id: 'barber-002' })];
  const booking = makeBookingContract({ id: 'booking-001', barber_id: 'barber-001' });
  const existingBookings = [makeExistingBooking()];
  const me = makeClientProfile({ id: 'client-001' });

  mock
    .onPost('/auth/client/login')
    .reply(200, { ok: true, data: loginResp });

  mock
    .onGet('/client/getMe')
    .reply(200, { ok: true, data: me });

  mock
    .onGet('/client/banner')
    .reply(200, { ok: true, data: barbers });

  mock
    .onGet('/client/bookings')
    .reply(200, { ok: true, data: existingBookings });

  mock
    .onPost('/client/bookings')
    .reply(200, { ok: true, data: { booking, services: ['svc-001'] } });

  mock
    .onPost(/\/client\/bookings\/.*\/cancel/)
    .reply(200, {
      ok: true,
      data: { booking: { ...booking, status: 'cancelled' } },
    });
}

/** Wire a login failure (invalid credentials). */
export function setupLoginFailure(mock: MockAdapter): void {
  mock
    .onPost('/auth/client/login')
    .reply(401, { ok: false, error: 'Invalid credentials' });
}
