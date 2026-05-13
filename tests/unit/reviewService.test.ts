/* eslint-env jest */
import { reviewService } from '../../services/reviewService';
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

function seedBarber(id: string) {
  seedDoc(COLLECTIONS.BARBERS, id, {
    id,
    firstName: 'B',
    lastName: 'B',
    username: id,
    approvalStatus: 'approved',
  });
}

describe('reviewService.createReview', () => {
  it('returns null when booking missing', async () => {
    const out = await reviewService.createReview('c1', 'no-booking', {
      rating: 5,
      comment: '',
      service_ids: [],
    });
    expect(out).toBeNull();
  });

  it('returns null when booking belongs to another client', async () => {
    seedClient('c-mismatch');
    seedDoc(COLLECTIONS.BOOKINGS, 'rev-mm', {
      id: 'rev-mm',
      barberId: 'b-mm',
      clientId: 'someone-else',
      timestamp: new Date().toISOString(),
      status: 'completed',
      updatedAt: new Date(),
    });

    const out = await reviewService.createReview('c-mismatch', 'rev-mm', {
      rating: 5,
      comment: '',
      service_ids: [],
    });
    expect(out).toBeNull();
  });

  it('throws INVALID_STATE when booking not completed', async () => {
    seedClient('c-state');
    seedDoc(COLLECTIONS.BOOKINGS, 'rev-state', {
      id: 'rev-state',
      barberId: 'b-state',
      clientId: 'c-state',
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      updatedAt: new Date(),
    });

    await expect(
      reviewService.createReview('c-state', 'rev-state', {
        rating: 5,
        comment: '',
        service_ids: [],
      })
    ).rejects.toThrow('INVALID_STATE');
  });

  it('throws DUPLICATE on second review for the same booking', async () => {
    seedBarber('b-dup');
    seedClient('c-dup');
    seedDoc(COLLECTIONS.BOOKINGS, 'rev-dup', {
      id: 'rev-dup',
      barberId: 'b-dup',
      clientId: 'c-dup',
      timestamp: new Date().toISOString(),
      status: 'completed',
      updatedAt: new Date(),
    });

    const first = await reviewService.createReview('c-dup', 'rev-dup', {
      rating: 4,
      comment: 'ok',
      service_ids: [],
    });
    expect(first?.barber_rating.count).toBe(1);

    await expect(
      reviewService.createReview('c-dup', 'rev-dup', {
        rating: 5,
        comment: 'still good',
        service_ids: [],
      })
    ).rejects.toThrow('DUPLICATE');
  });

  it('throws BARBER_NOT_FOUND when barber doc missing', async () => {
    seedClient('c-noB');
    seedDoc(COLLECTIONS.BOOKINGS, 'rev-noB', {
      id: 'rev-noB',
      barberId: 'ghost',
      clientId: 'c-noB',
      timestamp: new Date().toISOString(),
      status: 'completed',
      updatedAt: new Date(),
    });

    await expect(
      reviewService.createReview('c-noB', 'rev-noB', {
        rating: 5,
        comment: '',
        service_ids: [],
      })
    ).rejects.toThrow('BARBER_NOT_FOUND');
  });
});

describe('reviewService.listReviewsForBarber', () => {
  it('paginates with cursor', async () => {
    seedDoc(COLLECTIONS.REVIEWS, 'rev-1', {
      id: 'rev-1',
      bookingId: 'o',
      barberId: 'b-list',
      clientId: 'c',
      rating: 5,
      comment: 'a',
      serviceIds: [],
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    seedDoc(COLLECTIONS.REVIEWS, 'rev-2', {
      id: 'rev-2',
      bookingId: 'o',
      barberId: 'b-list',
      clientId: 'c',
      rating: 4,
      comment: 'b',
      serviceIds: [],
      createdAt: new Date('2026-05-02T00:00:00.000Z'),
    });

    const first = await reviewService.listReviewsForBarber(
      'b-list',
      undefined,
      1
    );
    expect(first.items.length).toBe(1);
    expect(first.next_cursor).toBeTruthy();

    const next = await reviewService.listReviewsForBarber(
      'b-list',
      first.next_cursor!,
      10
    );
    expect(next.items.length).toBe(1);
  });

  it('ignores invalid cursor', async () => {
    seedDoc(COLLECTIONS.REVIEWS, 'rev-3', {
      id: 'rev-3',
      bookingId: 'o',
      barberId: 'b-list-2',
      clientId: 'c',
      rating: 5,
      comment: 'a',
      serviceIds: [],
      createdAt: new Date(),
    });

    const out = await reviewService.listReviewsForBarber(
      'b-list-2',
      'not-a-cursor',
      10
    );
    expect(out.items.length).toBe(1);
  });
});
