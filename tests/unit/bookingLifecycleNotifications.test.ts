/* eslint-env jest */
import {
  buildBookingLifecyclePushData,
  getBookingLifecycleDeliveries,
} from '../../services/bookingLifecycleNotifications';

describe('bookingLifecycleNotifications', () => {
  const bookingSnapshot = () => ({
    id: 'o1',
    barberId: 'b1',
    clientId: 'c1',
    timestamp: '2026-06-01T12:00:00.000Z',
  });

  it('covers booking create (barber only)', () => {
    const deliveries = getBookingLifecycleDeliveries(
      'booking_created',
      bookingSnapshot()
    );
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].recipientType).toBe('barber');
    expect(deliveries[0].notificationType).toBe('booking_request');
  });

  it('covers reschedule (both sides)', () => {
    const deliveries = getBookingLifecycleDeliveries(
      'booking_rescheduled',
      bookingSnapshot()
    );
    expect(deliveries).toHaveLength(2);
    expect(new Set(deliveries.map(d => d.recipientType))).toEqual(
      new Set(['barber', 'client'])
    );
  });

  it('covers cancel variants', () => {
    const byClient = getBookingLifecycleDeliveries(
      'booking_cancelled',
      bookingSnapshot(),
      {
        cancelled_by: 'client',
      }
    );
    expect(byClient).toHaveLength(1);
    expect(byClient[0].recipientType).toBe('barber');

    const byBarber = getBookingLifecycleDeliveries(
      'booking_cancelled',
      bookingSnapshot(),
      {
        cancelled_by: 'barber',
      }
    );
    expect(byBarber).toHaveLength(1);
    expect(byBarber[0].recipientType).toBe('client');
  });

  it('covers cancel noop when cancelled_by unknown', () => {
    expect(
      getBookingLifecycleDeliveries('booking_cancelled', bookingSnapshot(), {
        cancelled_by: 'nobody',
      })
    ).toEqual([]);
    expect(
      getBookingLifecycleDeliveries('booking_cancelled', bookingSnapshot())
    ).toEqual(
      []
    );
  });

  it('includes cancelled_by string in push data when present', () => {
    const data = buildBookingLifecyclePushData(
      'booking_cancelled',
      'o-x',
      'booking_cancelled',
      { cancelled_by: 'client' }
    );
    expect(data.notification_type).toBe('booking_cancelled');
    expect(data.cancelled_by).toBe('client');
    expect(data.booking_id).toBe('o-x');
    expect(data.kind).toBe('booking_cancelled');
  });
});
