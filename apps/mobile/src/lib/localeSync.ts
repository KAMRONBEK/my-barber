// Syncs the app's current language to the backend so booking-lifecycle push
// and in-app inbox notifications (see backend/api/services/
// bookingLifecycleNotifications.ts) are sent in the recipient's actual
// language instead of always English. The mobile UI has always been
// localized (uz/ru) via i18n.ts — this was the missing half.

import { updateClientLocale, updateBarberLocale } from './api';
import type { UserRole } from './auth';
import type { SupportedLocale } from './i18n';

// Avoids a redundant PUT when this fires again for a locale we already sent
// (e.g. the root layout's effect re-running for an unrelated dependency).
let lastSynced: SupportedLocale | null = null;

/** Best-effort — notification language is a nice-to-have, never worth blocking on. */
export async function syncLocaleToBackend(
  role: UserRole,
  locale: SupportedLocale,
): Promise<void> {
  if (locale === lastSynced) return;
  try {
    if (role === 'barber') {
      await updateBarberLocale(locale);
    } else {
      await updateClientLocale(locale);
    }
    lastSynced = locale;
  } catch {
    // Network hiccup or logged-out race — next render's effect retries.
  }
}
