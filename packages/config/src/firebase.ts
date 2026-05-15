import { parseServerEnv } from './env';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';

let initialized = false;

export function getFirebaseAdmin(): App {
  if (!initialized) {
    const env = parseServerEnv();
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    initialized = true;
  }
  return getApps()[0]!;
}
