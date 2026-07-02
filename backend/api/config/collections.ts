/** Firestore root names shared by Admin SDK and Jest mocks (no runtime env coupling). */
export const COLLECTIONS = {
  BARBERS: 'barbers',
  CLIENTS: 'clients',
  BARBER_SERVICES: 'barberServices',
  BOOKINGS: 'bookings',
  BOOKING_SERVICES: 'bookingServices',
  NOTIFICATIONS: 'notifications',
  REVIEWS: 'reviews',
  REPORTS: 'reports',
  SERVICE_CATALOG: 'serviceCatalog',
  BLOCKS: 'blocks',
  /** CMS-style config docs (e.g. banner under `banner`) */
  CMS: 'cms',
  FAVORITES: 'favorites',
} as const;
