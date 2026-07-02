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
  location?: string;
  avatar?: string;
}

export interface BarberProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  approval_status?: string;
  approval_message?: string | null;
  ratingAverage?: number;
  ratingCount?: number;
}

export type UserRole = 'client' | 'barber';

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  client: ClientProfile | null;
  barber: BarberProfile | null;
  role: UserRole | null;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: ClientProfile | BarberProfile, role: UserRole) => Promise<void>;
  setClient: (client: ClientProfile) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>; // called by 401 interceptor
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  token: null,
  client: null,
  barber: null,
  role: null,

  hydrate: async () => {
    const [token, roleRaw, clientRaw, barberRaw] = await Promise.all([
      getItem(STORAGE_KEYS.jwt),
      getItem(STORAGE_KEYS.role),
      getItem(STORAGE_KEYS.client),
      getItem(STORAGE_KEYS.barber),
    ]);
    const role = roleRaw as UserRole | null;
    let client: ClientProfile | null = null;
    let barber: BarberProfile | null = null;
    if (clientRaw) {
      try {
        client = JSON.parse(clientRaw) as ClientProfile;
      } catch {
        client = null;
      }
    }
    if (barberRaw) {
      try {
        barber = JSON.parse(barberRaw) as BarberProfile;
      } catch {
        barber = null;
      }
    }
    if (token) {
      set({ status: 'authenticated', token, client, barber, role });
    } else {
      set({ status: 'unauthenticated', token: null, client: null, barber: null, role: null });
    }
  },

  signIn: async (token, user, role) => {
    await setItem(STORAGE_KEYS.jwt, token);
    await setItem(STORAGE_KEYS.role, role);
    if (role === 'barber') {
      await setItem(STORAGE_KEYS.barber, JSON.stringify(user));
      await removeItem(STORAGE_KEYS.client);
      set({ status: 'authenticated', token, barber: user as BarberProfile, client: null, role });
    } else {
      await setItem(STORAGE_KEYS.client, JSON.stringify(user));
      await removeItem(STORAGE_KEYS.barber);
      set({ status: 'authenticated', token, client: user as ClientProfile, barber: null, role });
    }
  },

  setClient: async (client) => {
    await setItem(STORAGE_KEYS.client, JSON.stringify(client));
    set({ client });
  },

  signOut: async () => {
    await removeItem(STORAGE_KEYS.jwt);
    await removeItem(STORAGE_KEYS.client);
    await removeItem(STORAGE_KEYS.barber);
    await removeItem(STORAGE_KEYS.role);
    set({ status: 'unauthenticated', token: null, client: null, barber: null, role: null });
  },

  clearSession: async () => {
    await removeItem(STORAGE_KEYS.jwt);
    await removeItem(STORAGE_KEYS.client);
    await removeItem(STORAGE_KEYS.barber);
    await removeItem(STORAGE_KEYS.role);
    set({ status: 'unauthenticated', token: null, client: null, barber: null, role: null });
  },
}));
