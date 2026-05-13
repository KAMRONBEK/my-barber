/* eslint-env jest */
import { earningsService } from '../../services/earningsService';
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

describe('earningsService.getBarberEarnings', () => {
  const barberId = 'be1';
  const cId = 'ce1';

  beforeEach(() => {
    seedClient(cId);
  });

  it('aggregates completed/cancelled/no_show in window', async () => {
    seedDoc(COLLECTIONS.BOOKINGS, 'o-c1', {
      id: 'o-c1',
      barberId,
      clientId: cId,
      timestamp: '2026-05-15T12:00:00.000Z',
      status: 'completed',
      completedAt: '2026-05-15T13:00:00.000Z',
      serviceTotal: 10000,
      updatedAt: new Date('2026-05-15T13:00:00.000Z'),
    });
    seedDoc(COLLECTIONS.BOOKINGS, 'o-c2', {
      id: 'o-c2',
      barberId,
      clientId: cId,
      timestamp: '2026-05-16T12:00:00.000Z',
      status: 'cancelled',
      updatedAt: new Date('2026-05-16T12:00:00.000Z'),
    });
    seedDoc(COLLECTIONS.BOOKINGS, 'o-c3', {
      id: 'o-c3',
      barberId,
      clientId: cId,
      timestamp: '2026-05-17T12:00:00.000Z',
      status: 'no_show',
      updatedAt: new Date('2026-05-17T12:00:00.000Z'),
    });

    const data = await earningsService.getBarberEarnings(
      barberId,
      '2026-05-01',
      '2026-05-31'
    );

    expect(data.summary.completed_bookings).toBe(1);
    expect(data.summary.cancelled_bookings).toBe(1);
    expect(data.summary.no_show_bookings).toBe(1);
    expect(data.summary.gross_total).toBe(10000);
    expect(data.daily.length).toBe(1);
    expect(data.bookings[0].booking_id).toBe('o-c1');
    expect(data.bookings[0].status).toBe('completed');
  });

  it('skips bookings outside window', async () => {
    seedDoc(COLLECTIONS.BOOKINGS, 'o-out', {
      id: 'o-out',
      barberId,
      clientId: cId,
      timestamp: '2025-01-15T12:00:00.000Z',
      status: 'completed',
      completedAt: '2025-01-15T13:00:00.000Z',
      serviceTotal: 99,
      updatedAt: new Date('2025-01-15T13:00:00.000Z'),
    });

    const data = await earningsService.getBarberEarnings(
      barberId,
      '2026-05-01',
      '2026-05-31'
    );

    expect(data.summary.completed_bookings).toBe(0);
    expect(data.summary.gross_total).toBe(0);
  });

  it('handles missing client doc gracefully', async () => {
    seedDoc(COLLECTIONS.BOOKINGS, 'o-no-client', {
      id: 'o-no-client',
      barberId,
      clientId: 'missing',
      timestamp: '2026-05-15T12:00:00.000Z',
      status: 'completed',
      completedAt: '2026-05-15T13:00:00.000Z',
      serviceTotal: 5000,
      updatedAt: new Date('2026-05-15T13:00:00.000Z'),
    });

    const data = await earningsService.getBarberEarnings(
      barberId,
      '2026-05-01',
      '2026-05-31'
    );

    expect(data.summary.completed_bookings).toBe(1);
    expect(data.bookings[0].client_name).toBe('Client');
  });
});
