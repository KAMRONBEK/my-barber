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

import axios, { AxiosError, isAxiosError, type AxiosInstance } from 'axios';
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
import type { BarberProfile, ClientProfile } from './auth';
import type { BarberLocationWire } from './maps';

interface OkData<T> {
  ok: true;
  data: T;
}

export interface LoginResponse {
  client: ClientProfile;
  token: string;
}

export interface BarberLoginResponse {
  barber: BarberProfile;
  services?: string[];
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

export async function loginBarber(
  username: string,
  password: string,
): Promise<BarberLoginResponse> {
  const r = await api.post<OkData<BarberLoginResponse>>('/auth/barber/login', {
    username,
    password,
  });
  return r.data.data;
}

export async function getMe(): Promise<ClientProfile> {
  const r = await api.get<OkData<ClientProfile>>('/client/getMe');
  return r.data.data;
}

// PUT /client/update-avatar expects JSON with a base64 data URL (or
// {data, filename, mimeType}) under `avatar`, despite the multipart/form-data
// swagger doc — see backend/api/middleware/upload.ts's uploadSingle.
export async function uploadClientAvatar(base64DataUrl: string): Promise<string | undefined> {
  const r = await api.put<{ ok: boolean; message: string; file?: { url: string } }>(
    '/client/update-avatar',
    { avatar: base64DataUrl },
  );
  return r.data.file?.url;
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
  /**
   * Stable identifier PUT /barber/services uses to match a line item against
   * an existing one (update) vs. create a new one — see wireToApiService.
   * Despite the name, upsertBarberServicesLineItems never validates this
   * against the real services catalog (GET /public/services/catalog), so a
   * client-generated id works fine for custom (non-catalog) services.
   */
  catalogServiceId?: string | null;
}

export async function getBanner(): Promise<ApiBarber[]> {
  const r = await api.get<OkData<ApiBarber[]>>('/client/banner');
  return r.data.data ?? [];
}

// Full barber list for map / search — includes location, ratings, services.
// Mirrors BarberResponse from backend/api/models/barber.ts.
export interface ApiBarberFull extends ApiBarber {
  location?: BarberLocationWire;
  birthDate?: string;
  workingHours?: string;
  images?: string[];
  approvalStatus?: string;
  approvalMessage?: string;
}

interface BarberListPayload {
  barbers: ApiBarberFull[];
  page?: number;
  limit?: number;
  total?: number;
}

export async function getBarbers(
  page = 0,
  limit = 50,
): Promise<ApiBarberFull[]> {
  try {
    const r = await api.get<OkData<ApiBarberFull[]>>('/client/barbers', {
      params: { page, limit },
    });
    return r.data.data ?? [];
  } catch (err) {
    // Staging may not have /client/barbers deployed yet; /barber/ is the legacy list.
    if (
      isAxiosError(err) &&
      (err.response?.status === 404 || err.response?.status === 405)
    ) {
      const r = await api.get<OkData<BarberListPayload>>('/barber/', {
        params: { page, limit },
      });
      return r.data.data?.barbers ?? [];
    }
    throw err;
  }
}

// GET/POST/DELETE /client/favorites — returns the same BarberResponse shape
// as /client/barbers, so favorites reuse the same ApiBarberFull barber cards.
export async function getFavoriteBarbers(): Promise<ApiBarberFull[]> {
  const r = await api.get<OkData<ApiBarberFull[]>>('/client/favorites');
  return r.data.data ?? [];
}

export async function addFavoriteBarber(barberId: string): Promise<void> {
  await api.post('/client/favorites', { barberId });
}

export async function removeFavoriteBarber(barberId: string): Promise<void> {
  await api.delete(`/client/favorites/${barberId}`);
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

// ---- Barber endpoints ----

export interface BarberMeResponse {
  barber: BarberProfile;
  services: ApiService[];
}

export async function getBarberMe(): Promise<BarberMeResponse> {
  const r = await api.get<OkData<BarberMeResponse>>('/barber/getMe');
  return r.data.data;
}

export interface BarberBookingDetail {
  bookingId: string;
  clientFirstName: string;
  clientLastName: string;
  timestamp: string;
  services: { name: string; price: number; durationMinutes?: number }[];
  status?: string;
}

export async function getBarberBookings(
  date?: string,
): Promise<BarberBookingDetail[]> {
  const r = await api.get<OkData<BarberBookingDetail[]>>('/barber/bookings', {
    params: date ? { date } : undefined,
  });
  return r.data.data ?? [];
}

export async function patchBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show',
  reason?: string | null,
): Promise<BookingContract> {
  const r = await api.patch<OkData<{ booking: BookingContract }>>(
    `/barber/bookings/${encodeURIComponent(bookingId)}/status`,
    { status, reason },
  );
  return r.data.data.booking;
}

export interface EarningsSummary {
  currency: string;
  gross_total: number;
  completed_bookings: number;
  cancelled_bookings: number;
  no_show_bookings: number;
}

export interface DailyEarning {
  date: string;
  gross_total: number;
  completed_bookings: number;
}

export interface EarningsBooking {
  booking_id: string;
  timestamp: string;
  client_name: string;
  service_total: number;
  status: string;
}

export interface EarningsResponse {
  summary: EarningsSummary;
  daily: DailyEarning[];
  bookings: EarningsBooking[];
}

export async function getBarberEarnings(
  from: string,
  to: string,
): Promise<EarningsResponse> {
  const r = await api.get<OkData<EarningsResponse>>('/barber/earnings', {
    params: { from, to },
  });
  return r.data.data;
}

export async function updateBarberProfile(
  body: Partial<BarberProfile>,
): Promise<{ ok: boolean; message: string }> {
  const r = await api.put<{ ok: boolean; message: string }>('/barber/update', body);
  return r.data;
}

// GET/PUT /barber/services speak snake_case with a required
// catalog_service_id per item — a different wire shape than ApiService
// (camelCase, used everywhere else). Convert at the boundary so the rest of
// the app never has to think about it.
interface BarberServiceWire {
  id: string;
  catalog_service_id: string | null;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

function wireToApiService(w: BarberServiceWire, barberId: string): ApiService {
  return {
    id: w.id,
    barberId,
    name: w.name,
    price: w.price,
    durationMinutes: w.duration_minutes,
    isActive: w.is_active,
    catalogServiceId: w.catalog_service_id,
  };
}

export async function getBarberServices(): Promise<ApiService[]> {
  const r = await api.get<OkData<{ services: BarberServiceWire[] }>>('/barber/services');
  const barberId = useAuthStore.getState().barber?.id ?? '';
  return (r.data.data.services ?? []).map((w) => wireToApiService(w, barberId));
}

export async function updateBarberServices(
  services: Array<Omit<ApiService, 'id' | 'barberId'>>,
): Promise<ApiService[]> {
  const payload = services.map((s) => ({
    // A brand-new service (added client-side, never saved) has no id yet —
    // fall back to generating one so catalog_service_id.notEmpty() passes
    // and this same service updates in place on subsequent saves instead of
    // being duplicated.
    catalog_service_id: s.catalogServiceId ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: s.name,
    price: s.price,
    duration_minutes: s.durationMinutes ?? 30,
    is_active: s.isActive ?? true,
  }));
  const r = await api.put<OkData<{ services: BarberServiceWire[] }>>('/barber/services', {
    services: payload,
  });
  const barberId = useAuthStore.getState().barber?.id ?? '';
  return (r.data.data.services ?? []).map((w) => wireToApiService(w, barberId));
}

export async function deleteBarberService(serviceId: string): Promise<ApiService[]> {
  const r = await api.delete<OkData<{ services: ApiService[] }>>(
    `/barber/services/${encodeURIComponent(serviceId)}`,
  );
  return r.data.data.services ?? [];
}
