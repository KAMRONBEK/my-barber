import type { Barber, Barbershop, Booking, Service, User } from '@my-barber/types';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type FetchOptions = RequestInit & { token?: string };

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  users: {
    list: (token: string) => request<User[]>('/api/admin/users', { token }),
  },
  barbershops: {
    list: (token: string) => request<Barbershop[]>('/api/admin/barbershops', { token }),
  },
  barbers: {
    list: (token: string) => request<Barber[]>('/api/admin/barbers', { token }),
  },
  services: {
    list: (token: string) => request<Service[]>('/api/admin/services', { token }),
  },
  bookings: {
    list: (token: string) => request<Booking[]>('/api/admin/bookings', { token }),
  },
};
