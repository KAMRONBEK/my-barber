export const APP_NAME = 'My Barber Shop';
export const APP_SLUG = 'my-barber';
export const DEFAULT_TIMEZONE = 'Asia/Tashkent';
export const DEFAULT_CURRENCY = 'UZS';
export const DEFAULT_LOCALE = 'en';
export const SUPPORT_EMAIL = 'support@my-barber.uz';

export const SITE_URLS = {
  marketing: 'https://my-barber.uz',
  admin: 'https://admin.my-barber.uz',
  api: 'https://api.my-barber.uz',
  apiStaging: 'https://staging-api.my-barber.uz',
} as const;

export const BOOKING_GRID_STEP_MINUTES = 15;

/**
 * Default API base URL for mobile clients (resolved at build time).
 * Override at runtime with `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile`.
 *  - dev: simulator → http://localhost:3000; device → set to your LAN IP.
 *  - staging: SITE_URLS.apiStaging
 *  - prod: SITE_URLS.api
 */
export const DEFAULT_MOBILE_API_BASE_URL = 'http://localhost:3000';
// override per environment: SITE_URLS.apiStaging or SITE_URLS.api
