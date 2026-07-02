// Ephemeral hand-off for the arrival-confirmation bottom sheet — mirrors the
// locationPicker.ts pattern. Populated either by a push-notification handler
// (phone was locked/backgrounded) or the foreground backstop poll
// (useArrivalReminderPoll.ts), and consumed by ArrivalConfirmationSheet,
// which is mounted once, globally, in app/_layout.tsx.

import { create } from 'zustand';

export type ArrivalRole = 'client' | 'barber';

export interface PendingArrivalBooking {
  id: string;
  role: ArrivalRole;
}

interface ArrivalCheckState {
  activeBooking: PendingArrivalBooking | null;
  pendingQueue: PendingArrivalBooking[];
  /** Presents immediately if nothing is active, otherwise queues. Idempotent per booking id. */
  open: (booking: PendingArrivalBooking) => void;
  /** Called after a successful yes/no answer, or a 409 (booking no longer active). */
  clear: () => void;
  /** Promotes the next queued booking (if any) to active. */
  dequeueNext: () => void;
}

function isSameBooking(a: PendingArrivalBooking | null, id: string): boolean {
  return a?.id === id;
}

export const useArrivalCheckStore = create<ArrivalCheckState>((set, get) => ({
  activeBooking: null,
  pendingQueue: [],

  open: (booking) => {
    const { activeBooking, pendingQueue } = get();
    if (isSameBooking(activeBooking, booking.id)) return;
    if (pendingQueue.some((b) => b.id === booking.id)) return;

    if (!activeBooking) {
      set({ activeBooking: booking });
    } else {
      set({ pendingQueue: [...pendingQueue, booking] });
    }
  },

  clear: () => set({ activeBooking: null }),

  dequeueNext: () => {
    const { pendingQueue } = get();
    if (pendingQueue.length === 0) {
      set({ activeBooking: null });
      return;
    }
    const [next, ...rest] = pendingQueue;
    set({ activeBooking: next, pendingQueue: rest });
  },
}));
