import { barberActions, isUpcoming, occupiesTime } from '../lib/bookingActions';
import { bookingErrorKey } from '../lib/bookingErrors';
import { effectiveBookingStatus } from '../lib/format';
import i18n from '../lib/i18n';
import ru from '../locales/ru/common.json';
import uz from '../locales/uz/common.json';

const NOW = new Date('2026-11-27T10:00:00Z').getTime();
const LATER = '2026-11-27T11:00:00Z';
const EARLIER = '2026-11-27T09:00:00Z';

describe('barber actions', () => {
  it('answers a request only before its start', () => {
    expect(barberActions('pending_confirmation', LATER, NOW)).toEqual([
      'confirm',
      'decline',
    ]);
    expect(barberActions('pending_confirmation', EARLIER, NOW)).toEqual([]);
  });

  it.each(['confirmed', 'rescheduled'])(
    'cancels a %s visit before it starts and closes it afterwards',
    (status) => {
      expect(barberActions(status, LATER, NOW)).toEqual(['cancel']);
      expect(barberActions(status, EARLIER, NOW)).toEqual(['complete', 'noShow']);
    },
  );

  it.each(['completed', 'cancelled', 'declined', 'no_show', undefined])(
    'offers nothing for %s',
    (status) => {
      expect(barberActions(status, EARLIER, NOW)).toEqual([]);
    },
  );

  it('keeps cancelled and declined bookings out of the working day', () => {
    expect(['cancelled', 'declined'].some(occupiesTime)).toBe(false);
    expect(['confirmed', 'completed', 'no_show'].every(occupiesTime)).toBe(true);
    expect(isUpcoming({ status: 'confirmed', timestamp: LATER }, NOW)).toBe(true);
    expect(isUpcoming({ status: 'cancelled', timestamp: LATER }, NOW)).toBe(false);
    expect(isUpcoming({ status: 'confirmed', timestamp: EARLIER }, NOW)).toBe(false);
  });
});

describe('booking error messages', () => {
  const failed = (status?: number, code?: string) => ({
    isAxiosError: true,
    response: status ? { status, data: { code } } : undefined,
  });

  it('names the reason', () => {
    expect(bookingErrorKey(failed(409, 'SLOT_TAKEN'))).toBe('bookingErrors.slotTaken');
    expect(bookingErrorKey(failed(409))).toBe('bookingErrors.changed');
    expect(bookingErrorKey(failed())).toBe('auth.networkError');
    expect(bookingErrorKey(failed(500), 'booking.createError')).toBe(
      'booking.createError',
    );
  });

  it('shows an expired request as expired', () => {
    expect(effectiveBookingStatus('cancelled', EARLIER, 'expired').label).toBe(
      i18n.t('bookingStatus.expired'),
    );
    expect(effectiveBookingStatus('cancelled', EARLIER, null).label).toBe(
      i18n.t('bookingStatus.cancelled'),
    );
  });

  it('has Uzbek and Russian text for every new key', () => {
    const keys = (node: object, prefix = ''): string[] =>
      Object.entries(node).flatMap(([k, v]) =>
        typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    for (const section of ['barberActions', 'bookingErrors', 'review', 'calendar'] as const) {
      expect(keys(uz[section]).sort()).toEqual(keys(ru[section]).sort());
    }
  });
});
