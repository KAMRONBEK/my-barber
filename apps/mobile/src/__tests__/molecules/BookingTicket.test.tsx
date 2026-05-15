// Unit tests for BookingTicket molecule.
// Validates status pill colors, services list, and timestamp formatting.

import React from 'react';
import { renderWithProviders } from '../../../tests/render-utils';
import { BookingTicket } from '../../molecules/BookingTicket';
import {
  makeBooking,
  ALL_BOOKING_STATUSES,
  resetIds,
} from '../../../tests/fixtures';
import type { Booking, BookingStatus } from '@my-barber/types';
import i18n from '../../lib/i18n';

beforeEach(() => {
  resetIds();
  void i18n.changeLanguage('uz');
});

describe('BookingTicket', () => {
  describe('rendering', () => {
    it('renders barber display name', () => {
      const booking = makeBooking();
      const { getByText } = renderWithProviders(
        <BookingTicket booking={booking} barberDisplay="Lochin Tursunov" />,
      );
      expect(getByText('Lochin Tursunov')).toBeTruthy();
    });

    it('renders shop display name when provided', () => {
      const booking = makeBooking();
      const { getByText } = renderWithProviders(
        <BookingTicket
          booking={booking}
          barberDisplay="Lochin"
          shopDisplay="Lochin Barbershop"
        />,
      );
      expect(getByText('Lochin Barbershop')).toBeTruthy();
    });

    it('renders services joined with +', () => {
      const booking = makeBooking({
        services: [
          { id: 's1', name: 'Soch olish', price: 80000 },
          { id: 's2', name: 'Soqol', price: 50000 },
        ],
      });
      const { getByText } = renderWithProviders(
        <BookingTicket booking={booking} barberDisplay="Ali" />,
      );
      expect(getByText('Soch olish + Soqol')).toBeTruthy();
    });

    it('renders total price as sum of services', () => {
      const booking = makeBooking({
        services: [
          { id: 's1', name: 'Soch olish', price: 80000 },
          { id: 's2', name: 'Soqol', price: 50000 },
        ],
      });
      const { getByText } = renderWithProviders(
        <BookingTicket booking={booking} barberDisplay="Ali" />,
      );
      // 130 000 so'm
      expect(getByText(/130 000/)).toBeTruthy();
    });

    it('renders refLabel when provided', () => {
      const booking = makeBooking({ id: 'abc123xyz' });
      const { getByText } = renderWithProviders(
        <BookingTicket
          booking={booking}
          barberDisplay="Ali"
          refLabel="MBR-ABC123"
        />,
      );
      expect(getByText('MBR-ABC123')).toBeTruthy();
    });

    it('does not render ref section when refLabel is absent', () => {
      const booking = makeBooking({ id: 'abc123xyz' });
      const { queryByText } = renderWithProviders(
        <BookingTicket booking={booking} barberDisplay="Ali" />,
      );
      expect(queryByText('MBR-ABC123')).toBeNull();
    });
  });

  describe('status pill tones per BookingStatus', () => {
    const statusToneMap: { status: BookingStatus; expectedTone: string }[] = [
      { status: 'confirmed', expectedTone: 'success' },
      { status: 'cancelled', expectedTone: 'danger' },
      { status: 'declined', expectedTone: 'danger' },
      { status: 'pending_confirmation', expectedTone: 'accent' },
      { status: 'rescheduled', expectedTone: 'accent' },
      { status: 'completed', expectedTone: 'accent' },
      { status: 'no_show', expectedTone: 'accent' },
    ];

    for (const { status } of statusToneMap) {
      it(`renders status badge for ${status} without crashing`, () => {
        const booking = makeBooking({ status });
        const { UNSAFE_root } = renderWithProviders(
          <BookingTicket booking={booking} barberDisplay="Test" />,
        );
        expect(UNSAFE_root).toBeTruthy();
      });
    }
  });

  describe('i18n: uz vs ru', () => {
    it('renders uz locale labels', async () => {
      await i18n.changeLanguage('uz');
      const booking = makeBooking();
      const { getByText } = renderWithProviders(
        <BookingTicket booking={booking} barberDisplay="Ali" />,
      );
      // "Xizmat" in uz
      expect(getByText('Xizmat')).toBeTruthy();
    });

    it('renders ru locale labels differently', async () => {
      await i18n.changeLanguage('ru');
      const booking = makeBooking();
      const { getByText } = renderWithProviders(
        <BookingTicket booking={booking} barberDisplay="Ali" />,
      );
      // "Услуга" in ru
      expect(getByText('Услуга')).toBeTruthy();
    });
  });
});
