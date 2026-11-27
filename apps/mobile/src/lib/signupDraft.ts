// Hand-off between the two sign-up screens: details first, then the password.
// Kept in memory only; the password never enters this store.

import { create } from 'zustand';
import type { SignupDetails, SignupErrors } from './signupForm';

interface SignupDraftState {
  draft: SignupDetails | null;
  /** Field errors the server returned, for the details screen to show. */
  rejected: SignupErrors | null;
  setDraft: (draft: SignupDetails) => void;
  reject: (errors: SignupErrors) => void;
  clearRejected: () => void;
}

export const useSignupDraftStore = create<SignupDraftState>((set) => ({
  draft: null,
  rejected: null,
  setDraft: (draft) => set({ draft, rejected: null }),
  reject: (rejected) => set({ rejected }),
  clearRejected: () => set({ rejected: null }),
}));
