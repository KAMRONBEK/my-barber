// Auth/session Zustand store, persisted via expo-secure-store.
//
// Backend contract (custom JWT + bcrypt, NOT Firebase Auth):
//   POST /auth/client/login  →  { ok: true, data: { client, token } }
//
// We keep the JWT and a minimal client profile in SecureStore so the user
// stays signed in across launches. The 401-interceptor on the axios client
// also calls `clearSession()` here.

import { create } from 'zustand';
import { getItem, removeItem, setItem, STORAGE_KEYS } from './storage';

export interface ClientProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
}

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  client: ClientProfile | null;
  hydrate: () => Promise<void>;
  signIn: (token: string, client: ClientProfile) => Promise<void>;
  setClient: (client: ClientProfile) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>; // called by 401 interceptor
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  token: null,
  client: null,

  hydrate: async () => {
    const token = await getItem(STORAGE_KEYS.jwt);
    const clientRaw = await getItem(STORAGE_KEYS.client);
    let client: ClientProfile | null = null;
    if (clientRaw) {
      try {
        client = JSON.parse(clientRaw) as ClientProfile;
      } catch {
        client = null;
      }
    }
    if (token) {
      set({ status: 'authenticated', token, client });
    } else {
      set({ status: 'unauthenticated', token: null, client: null });
    }
  },

  signIn: async (token, client) => {
    await setItem(STORAGE_KEYS.jwt, token);
    await setItem(STORAGE_KEYS.client, JSON.stringify(client));
    set({ status: 'authenticated', token, client });
  },

  setClient: async (client) => {
    await setItem(STORAGE_KEYS.client, JSON.stringify(client));
    set({ client });
  },

  signOut: async () => {
    await removeItem(STORAGE_KEYS.jwt);
    await removeItem(STORAGE_KEYS.client);
    set({ status: 'unauthenticated', token: null, client: null });
  },

  clearSession: async () => {
    await removeItem(STORAGE_KEYS.jwt);
    await removeItem(STORAGE_KEYS.client);
    set({ status: 'unauthenticated', token: null, client: null });
  },
}));
