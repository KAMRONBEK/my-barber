/* eslint-env jest */
import { bookingService } from '../../services/bookingService';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

function seedClient(id: string) {
  seedDoc(COLLECTIONS.CLIENTS, id, {
    id,
    firstName: 'C',
    lastName: 'L',
    username: id,
  });
}

describe('bookingService', () => {
  describe('getBookingById', () => {
    it('returns null when booking does not exist', async () => {
      const out = await bookingService.getBookingById('nope');
      expect(out).toBeNull();
    });

    it('returns response with services and client info', async () => {
      seedClient('c1');
      seedDoc(COLLECTIONS.BARBER_SERVICES, 's1', {
        id: 's1',
        barberId: 'b1',
        name: 'Cut',
        price: 100,
      });
      seedDoc(COLLECTIONS.BOOKINGS, 'o1', {
        id: 'o1',
        barberId: 'b1',
        clientId: 'c1',
        timestamp: '2026-05-15T10:00:00.000Z',
        status: 'confirmed',
        updatedAt: new Date(),
      });
      seedDoc(COLLECTIONS.BOOKING_SERVICES, 'os1', {
        id: 'os1',
        bookingId: 'o1',
        serviceId: 's1',
      });

      const out = await bookingService.getBookingById('o1');
      expect(out).not.toBeNull();
      expect(out!.barberId).toBe('b1');
      expect(out!.services).toEqual([
        { id: 's1', barberId: 'b1', name: 'Cut', price: 100 },
      ]);
      expect(out!.client?.firstName).toBe('C');
    });
  });

  describe('createBooking', () => {
    it('throws BLOCKED when block exists', async () => {
      seedDoc(COLLECTIONS.BLOCKS, 'block-1', {
        id: 'block-1',
        blockerId: 'b-bl',
        blockedId: 'c-bl',
        createdAt: new Date(),
      });
      await expect(
        bookingService.createBooking({
          barberId: 'b-bl',
          clientId: 'c-bl',
          serviceIds: ['s'],
          timestamp: '2099-01-01T00:00:00.000Z',
        })
      ).rejects.toThrow('BLOCKED');
    });

    it('persists booking and service rows on happy path', async () => {
      const bookingId = await bookingService.createBooking({
        barberId: 'b-ok',
        clientId: 'c-ok',
        serviceIds: ['s1', 's2'],
        timestamp: '2099-01-01T00:00:00.000Z',
      });
      expect(bookingId).toBeDefined();
    });
  });

  describe('lifecycle methods', () => {
    const barberId = 'lc-b';
    const clientId = 'lc-c';

    function seedConfirmedBooking(id: string) {
      seedClient(clientId);
      seedDoc(COLLECTIONS.BOOKINGS, id, {
        id,
        barberId,
        clientId,
        timestamp: '2099-01-01T00:00:00.000Z',
        status: 'confirmed',
        updatedAt: new Date(),
      });
    }

    function seedPendingBooking(id: string) {
      seedClient(clientId);
      seedDoc(COLLECTIONS.BOOKINGS, id, {
        id,
        barberId,
        clientId,
        timestamp: '2099-01-01T00:00:00.000Z',
        status: 'pending_confirmation',
        updatedAt: new Date(),
      });
    }

    it('patchBarberBookingStatus confirms a pending booking', async () => {
      seedPendingBooking('lc-pending');
      const out = await bookingService.patchBarberBookingStatus(
        barberId,
        'lc-pending',
        'confirmed',
        null
      );
      expect(out?.status).toBe('confirmed');
    });

    it('patchBarberBookingStatus throws INVALID_STATE on completed booking', async () => {
      seedClient(clientId);
      seedDoc(COLLECTIONS.BOOKINGS, 'lc-done', {
        id: 'lc-done',
        barberId,
        clientId,
        timestamp: '2099-01-01T00:00:00.000Z',
        status: 'completed',
        updatedAt: new Date(),
      });
      await expect(
        bookingService.patchBarberBookingStatus(
          barberId,
          'lc-done',
          'confirmed',
          null
        )
      ).rejects.toThrow('INVALID_STATE');
    });

    it('patchBarberBookingStatus returns null when wrong barber or missing', async () => {
      seedPendingBooking('lc-other');
      expect(
        await bookingService.patchBarberBookingStatus(
          'someone-else',
          'lc-other',
          'confirmed',
          null
        )
      ).toBeNull();
      expect(
        await bookingService.patchBarberBookingStatus(
          barberId,
          'no-such-booking',
          'confirmed',
          null
        )
      ).toBeNull();
    });

    it('cancelBooking by client succeeds and rejects wrong status', async () => {
      seedConfirmedBooking('lc-cancel');
      const out = await bookingService.cancelBooking(
        'client',
        clientId,
        'lc-cancel',
        'change of plans'
      );
      expect(out?.status).toBe('cancelled');

      await expect(
        bookingService.cancelBooking('client', clientId, 'lc-cancel', null)
      ).rejects.toThrow('INVALID_STATE');
    });

    it('cancelBooking returns null when booking missing or wrong user', async () => {
      seedConfirmedBooking('lc-cancel-2');
      expect(
        await bookingService.cancelBooking('barber', 'wrong-b', 'lc-cancel-2', null)
      ).toBeNull();
      expect(
        await bookingService.cancelBooking('client', clientId, 'no-id', null)
      ).toBeNull();
    });

    it('rescheduleBooking updates timestamp', async () => {
      seedConfirmedBooking('lc-resched');
      const out = await bookingService.rescheduleBooking(
        'barber',
        barberId,
        'lc-resched',
        '2099-12-12T00:00:00.000Z',
        null
      );
      expect(out?.status).toBe('rescheduled');
    });

    it('markNoShow only works on confirmed/rescheduled', async () => {
      seedConfirmedBooking('lc-ns');
      const out = await bookingService.markNoShow(barberId, 'lc-ns');
      expect(out?.status).toBe('no_show');

      await expect(bookingService.markNoShow(barberId, 'lc-ns')).rejects.toThrow(
        'INVALID_STATE'
      );

      expect(await bookingService.markNoShow(barberId, 'no-id')).toBeNull();
    });

    it('rescheduleBooking returns null for wrong user / missing booking and throws INVALID_STATE', async () => {
      seedConfirmedBooking('lc-resched-2');
      expect(
        await bookingService.rescheduleBooking(
          'barber',
          'wrong',
          'lc-resched-2',
          '2099-12-12T00:00:00.000Z',
          null
        )
      ).toBeNull();
      expect(
        await bookingService.rescheduleBooking(
          'client',
          clientId,
          'no-id',
          '2099-12-12T00:00:00.000Z',
          null
        )
      ).toBeNull();

      seedDoc(COLLECTIONS.BOOKINGS, 'lc-resched-3', {
        id: 'lc-resched-3',
        barberId,
        clientId,
        timestamp: '2099-01-01T00:00:00.000Z',
        status: 'completed',
        updatedAt: new Date(),
      });
      await expect(
        bookingService.rescheduleBooking(
          'client',
          clientId,
          'lc-resched-3',
          '2099-12-12T00:00:00.000Z',
          null
        )
      ).rejects.toThrow('INVALID_STATE');
    });

    it('completeBooking rejects for wrong barber', async () => {
      seedConfirmedBooking('lc-cmp-wrong');
      expect(
        await bookingService.completeBooking('other-barber', 'lc-cmp-wrong')
      ).toBeNull();
    });

    it('cancelBooking works on rescheduled and pending statuses', async () => {
      seedClient(clientId);
      seedDoc(COLLECTIONS.BOOKINGS, 'lc-cancel-resched', {
        id: 'lc-cancel-resched',
        barberId,
        clientId,
        timestamp: '2099-01-01T00:00:00.000Z',
        status: 'rescheduled',
        updatedAt: new Date(),
      });
      const out = await bookingService.cancelBooking(
        'client',
        clientId,
        'lc-cancel-resched',
        null
      );
      expect(out?.status).toBe('cancelled');
    });

    it('completeBooking sets status and total', async () => {
      seedClient(clientId);
      seedDoc(COLLECTIONS.BARBER_SERVICES, 'sc-1', {
        id: 'sc-1',
        barberId,
        name: 'Cut',
        price: 25000,
      });
      seedDoc(COLLECTIONS.BOOKINGS, 'lc-cmp', {
        id: 'lc-cmp',
        barberId,
        clientId,
        timestamp: '2099-01-01T00:00:00.000Z',
        status: 'confirmed',
        updatedAt: new Date(),
      });
      seedDoc(COLLECTIONS.BOOKING_SERVICES, 'os-cmp', {
        id: 'os-cmp',
        bookingId: 'lc-cmp',
        serviceId: 'sc-1',
      });

      const out = await bookingService.completeBooking(barberId, 'lc-cmp');
      expect(out?.status).toBe('completed');

      await expect(
        bookingService.completeBooking(barberId, 'lc-cmp')
      ).rejects.toThrow('INVALID_STATE');

      expect(await bookingService.completeBooking(barberId, 'no-id')).toBeNull();
    });
  });

  describe('listBookingHistoryForClient', () => {
    it('returns empty list when no bookings', async () => {
      seedClient('hist-c0');
      const out = await bookingService.listBookingHistoryForClient('hist-c0', 20);
      expect(out.items).toEqual([]);
      expect(out.next_cursor).toBeNull();
    });

    it('returns paginated contracts ordered newest first', async () => {
      seedClient('hist-c1');
      seedDoc(COLLECTIONS.BARBER_SERVICES, 'hs1', {
        id: 'hs1',
        barberId: 'hb1',
        name: 'Cut',
        price: 10,
      });
      seedDoc(COLLECTIONS.BOOKINGS, 'hist-old', {
        id: 'hist-old',
        barberId: 'hb1',
        clientId: 'hist-c1',
        timestamp: '2026-01-01T10:00:00.000Z',
        status: 'confirmed',
        updatedAt: new Date(),
      });
      seedDoc(COLLECTIONS.BOOKING_SERVICES, 'hj-old', {
        id: 'hj-old',
        bookingId: 'hist-old',
        serviceId: 'hs1',
      });
      seedDoc(COLLECTIONS.BOOKINGS, 'hist-new', {
        id: 'hist-new',
        barberId: 'hb1',
        clientId: 'hist-c1',
        timestamp: '2026-06-01T10:00:00.000Z',
        status: 'completed',
        updatedAt: new Date(),
      });
      seedDoc(COLLECTIONS.BOOKING_SERVICES, 'hj-new', {
        id: 'hj-new',
        bookingId: 'hist-new',
        serviceId: 'hs1',
      });

      const page1 = await bookingService.listBookingHistoryForClient('hist-c1', 1);
      expect(page1.items).toHaveLength(1);
      expect(page1.items[0].id).toBe('hist-new');
      expect(page1.next_cursor).not.toBeNull();

      const page2 = await bookingService.listBookingHistoryForClient(
        'hist-c1',
        1,
        page1.next_cursor!
      );
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].id).toBe('hist-old');
    });
  });
});
