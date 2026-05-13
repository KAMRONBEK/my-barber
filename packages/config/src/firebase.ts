import { parseServerEnv } from './env';

type FirebaseAdminApp = { name: string };
type FirebaseAdminModule = typeof import('firebase-admin');

let cachedApp: FirebaseAdminApp | undefined;

export async function getFirebaseAdmin(): Promise<FirebaseAdminModule> {
  const admin = (await import('firebase-admin')) as unknown as FirebaseAdminModule;
  if (!cachedApp) {
    const env = parseServerEnv();
    if (admin.apps.length === 0) {
      cachedApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      cachedApp = admin.app();
    }
  }
  return admin;
}
