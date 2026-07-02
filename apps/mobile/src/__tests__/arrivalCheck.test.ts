import { useArrivalCheckStore } from '../lib/arrivalCheck';

function reset() {
  useArrivalCheckStore.setState({ activeBooking: null, pendingQueue: [] });
}

describe('arrivalCheck store', () => {
  beforeEach(reset);

  it('presents the first booking immediately', () => {
    useArrivalCheckStore.getState().open({ id: 'b1', role: 'client' });
    expect(useArrivalCheckStore.getState().activeBooking).toEqual({
      id: 'b1',
      role: 'client',
    });
    expect(useArrivalCheckStore.getState().pendingQueue).toEqual([]);
  });

  it('queues a second booking instead of replacing the active one', () => {
    useArrivalCheckStore.getState().open({ id: 'b1', role: 'barber' });
    useArrivalCheckStore.getState().open({ id: 'b2', role: 'barber' });
    expect(useArrivalCheckStore.getState().activeBooking?.id).toBe('b1');
    expect(useArrivalCheckStore.getState().pendingQueue.map((b) => b.id)).toEqual([
      'b2',
    ]);
  });

  it('is idempotent for the same booking id (active or queued)', () => {
    useArrivalCheckStore.getState().open({ id: 'b1', role: 'client' });
    useArrivalCheckStore.getState().open({ id: 'b2', role: 'client' });
    useArrivalCheckStore.getState().open({ id: 'b1', role: 'client' });
    useArrivalCheckStore.getState().open({ id: 'b2', role: 'client' });
    expect(useArrivalCheckStore.getState().pendingQueue.map((b) => b.id)).toEqual([
      'b2',
    ]);
  });

  it('dequeueNext promotes the next queued booking', () => {
    useArrivalCheckStore.getState().open({ id: 'b1', role: 'client' });
    useArrivalCheckStore.getState().open({ id: 'b2', role: 'client' });
    useArrivalCheckStore.getState().clear();
    useArrivalCheckStore.getState().dequeueNext();
    expect(useArrivalCheckStore.getState().activeBooking?.id).toBe('b2');
    expect(useArrivalCheckStore.getState().pendingQueue).toEqual([]);
  });

  it('dequeueNext clears when the queue is empty', () => {
    useArrivalCheckStore.getState().open({ id: 'b1', role: 'client' });
    useArrivalCheckStore.getState().clear();
    useArrivalCheckStore.getState().dequeueNext();
    expect(useArrivalCheckStore.getState().activeBooking).toBeNull();
  });
});
