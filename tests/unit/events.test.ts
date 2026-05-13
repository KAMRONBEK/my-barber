/* eslint-env jest */
import { appEvents } from '../../utils/events';

describe('appEvents', () => {
  it('emits and notifies a registered listener', done => {
    appEvents.once('booking:created', evt => {
      try {
        expect(evt.bookingId).toBe('o1');
        done();
      } catch (e) {
        done(e);
      }
    });
    appEvents.emit('booking:created', {
      bookingId: 'o1',
      barberId: 'b1',
      clientId: 'c1',
      serviceIds: [],
      timestamp: '2026-05-10T00:00:00.000Z',
    });
  });

  it('supports persistent listeners via on()', () => {
    const handler = jest.fn();
    appEvents.on('notification:sent', handler);
    appEvents.emit('notification:sent', {
      bookingId: 'x',
      barberId: 'b',
      success: true,
    });
    expect(handler).toHaveBeenCalled();
    appEvents.off('notification:sent', handler);
  });
});
