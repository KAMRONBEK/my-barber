export const COLLECTIONS = {
  users: 'users',
  barbers: 'barbers',
  barbershops: 'barbershops',
  services: 'services',
  bookings: 'bookings',
  notifications: 'notifications',
  devices: 'devices',
  refreshTokens: 'refresh_tokens',
  usernames: 'usernames',
  bookingLocks: 'bookingLocks',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
