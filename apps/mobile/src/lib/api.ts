// HTTP client for the Express API (backend/api). NOT Firebase Functions.
//
// Endpoints consumed by the vertical slice:
//   POST /auth/client/login                → JWT + client
//   GET  /client/getMe                     → ClientProfile
//   GET  /client/banner                    → top barbers (used for Home list)
//   GET  /client/bookings?barber_id&date   → existing bookings for that barber/day
//   POST /client/bookings                  → create booking
//   POST /client/bookings/:id/cancel       → cancel booking
//
// Auth: Bearer JWT injected from the auth store. On 401 we clear the session.

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { DEFAULT_MOBILE_API_BASE_URL } from '@my-barber/config';
import { useAuthStore } from './auth';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  DEFAULT_MOBILE_API_BASE_URL;

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().token;
  if (token) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      const { clearSession, status } = useAuthStore.getState();
      if (status === 'authenticated') {
        await clearSession();
      }
    }
    return Promise.reject(err);
  },
);

// ---- Typed endpoint helpers ----

import type {
  BookingContract,
  BookingCreateRequest,
} from '@my-barber/types';
import type { ClientProfile } from './auth';

interface OkData<T> {
  ok: true;
  data: T;
}

export interface LoginResponse {
  client: ClientProfile;
  token: string;
}

export async function loginClient(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const r = await api.post<OkData<LoginResponse>>('/auth/client/login', {
    username,
    password,
  });
  return r.data.data;
}

export async function getMe(): Promise<ClientProfile> {
  const r = await api.get<OkData<ClientProfile>>('/client/getMe');
  return r.data.data;
}

// Server returns full barber objects on /client/banner — we keep the parts
// the UI needs and let extra fields pass through. Mirrors BarberResponse in
// backend/api/models/barber.ts.
export interface ApiBarber {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  images?: string[];
  services?: ApiService[];
  ratingAverage?: number;
  ratingCount?: number;
}

export interface ApiService {
  id: string;
  barberId: string;
  name: string;
  price: number;
  durationMinutes?: number;
  isActive?: boolean;
}

export async function getBanner(): Promise<ApiBarber[]> {
  const r = await api.get<OkData<ApiBarber[]>>('/client/banner');
  return r.data.data ?? [];
}

// Bookings list. The wire format is the legacy `BookingResponse`-ish shape
// emitted by clientService.getClientBookings — it's not the new
// BookingContract. The slot grid only needs `timestamp` + service durations.
export interface ApiExistingBooking {
  id: string;
  timestamp: string;
  status?: string;
  services?: ApiService[];
}

export async function getBookingsForBarberDay(
  barberId: string,
  isoDate: string,
): Promise<ApiExistingBooking[]> {
  const r = await api.get<OkData<ApiExistingBooking[]>>('/client/bookings', {
    params: { barber_id: barberId, date: isoDate },
  });
  return r.data.data ?? [];
}

export async function createBooking(
  body: BookingCreateRequest,
): Promise<BookingContract> {
  const r = await api.post<OkData<{ booking: BookingContract; services: string[] }>>(
    '/client/bookings',
    body,
  );
  return r.data.data.booking;
}

export async function cancelBooking(
  bookingId: string,
  reason: string | null = null,
): Promise<BookingContract> {
  const r = await api.post<OkData<{ booking: BookingContract }>>(
    `/client/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { reason },
  );
  return r.data.data.booking;
}
