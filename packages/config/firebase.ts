// Server-only deep-import path: `import { getFirebaseAdmin } from '@my-barber/config/firebase'`.
// Kept out of the root barrel so React Native consumers don't pull
// firebase-admin (which depends on Node's `fs`) into their bundle.
export { getFirebaseAdmin } from './src/firebase';
