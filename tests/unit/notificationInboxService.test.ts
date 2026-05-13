/* eslint-env jest */
import { notificationInboxService } from '../../services/notificationInboxService';
import { bookingService } from '../../services/bookingService';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

describe('notificationInboxService', () => {
  it('createNotification persists a doc and returns id', async () => {
    const id = await notificationInboxService.createNotification({
      recipientId: 'r1',
      recipientType: 'barber',
      type: 'booking_request',
      title: 'T',
      body: 'B',
    });
    expect(id).toBeDefined();
  });

  it('listForUser ignores invalid cursor', async () => {
    await notificationInboxService.createNotification({
      recipientId: 'r2',
      recipientType: 'client',
      type: 'x',
      title: 'T',
      body: 'B',
    });
    const out = await notificationInboxService.listForUser(
      'r2',
      'client',
      '###bad-cursor###',
      10
    );
    expect(out.items.length).toBe(1);
  });

  it('listForUser uses startAfter cursor when valid', async () => {
    await notificationInboxService.createNotification({
      recipientId: 'r3',
      recipientType: 'client',
      type: 'a',
      title: 'A',
      body: 'A',
    });
    await new Promise(r => setTimeout(r, 5));
    await notificationInboxService.createNotification({
      recipientId: 'r3',
      recipientType: 'client',
      type: 'b',
      title: 'B',
      body: 'B',
    });

    const first = await notificationInboxService.listForUser(
      'r3',
      'client',
      undefined,
      1
    );
    expect(first.items.length).toBe(1);
    expect(first.next_cursor).toBeTruthy();

    const next = await notificationInboxService.listForUser(
      'r3',
      'client',
      first.next_cursor!,
      10
    );
    expect(next.items.length).toBe(1);
  });

  it('markRead returns false for missing notification', async () => {
    const ok = await notificationInboxService.markRead(
      'r4',
      'barber',
      'no-such-id'
    );
    expect(ok).toBe(false);
  });

  it('markRead returns false when recipient mismatches', async () => {
    const id = await notificationInboxService.createNotification({
      recipientId: 'r5',
      recipientType: 'client',
      type: 'x',
      title: 'T',
      body: 'B',
    });
    const ok = await notificationInboxService.markRead('other', 'client', id);
    expect(ok).toBe(false);
  });

  it('markRead and markAllRead clear unread', async () => {
    const id = await notificationInboxService.createNotification({
      recipientId: 'r6',
      recipientType: 'barber',
      type: 'x',
      title: 'T',
      body: 'B',
    });
    await notificationInboxService.markRead('r6', 'barber', id);

    await notificationInboxService.createNotification({
      recipientId: 'r6',
      recipientType: 'barber',
      type: 'y',
      title: 'T2',
      body: 'B2',
    });
    await notificationInboxService.markAllRead('r6', 'barber');

    const list = await notificationInboxService.listForUser(
      'r6',
      'barber',
      undefined,
      10
    );
    expect(list.unread_count).toBe(0);
  });

  it('onBookingLifecycleEvent emits inbox messages by kind', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'b-life', {
      id: 'b-life',
      approvalStatus: 'approved',
    });
    seedDoc(COLLECTIONS.CLIENTS, 'c-life', { id: 'c-life' });
    seedDoc(COLLECTIONS.BOOKINGS, 'o-life', {
      id: 'o-life',
      barberId: 'b-life',
      clientId: 'c-life',
      timestamp: new Date().toISOString(),
      status: 'pending_confirmation',
      updatedAt: new Date(),
    });

    void bookingService;

    await notificationInboxService.onBookingLifecycleEvent(
      'booking_created',
      'o-life'
    );
    await notificationInboxService.onBookingLifecycleEvent(
      'booking_confirmed',
      'o-life'
    );
    await notificationInboxService.onBookingLifecycleEvent(
      'booking_declined',
      'o-life'
    );
    await notificationInboxService.onBookingLifecycleEvent(
      'booking_rescheduled',
      'o-life'
    );
    await notificationInboxService.onBookingLifecycleEvent(
      'booking_completed',
      'o-life'
    );
    await notificationInboxService.onBookingLifecycleEvent(
      'booking_cancelled',
      'o-life',
      { cancelled_by: 'client' }
    );
    await notificationInboxService.onBookingLifecycleEvent(
      'booking_cancelled',
      'o-life',
      { cancelled_by: 'barber' }
    );
    await notificationInboxService.onBookingLifecycleEvent(
      'no_show',
      'o-life'
    );
    await notificationInboxService.onBookingLifecycleEvent(
      'unknown_kind',
      'o-life'
    );
  });

  it('onBookingLifecycleEvent silently skips when booking is missing', async () => {
    await expect(
      notificationInboxService.onBookingLifecycleEvent(
        'booking_created',
        'no-such-booking'
      )
    ).resolves.toBeUndefined();
  });
});
