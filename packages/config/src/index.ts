export * from './app-constants';
export * from './env';
export * from './firestore-collections';
// Server-only helpers (firebase-admin) live at `@my-barber/config/firebase`.
// Don't re-export from the root barrel — Metro statically resolves dynamic
// imports of firebase-admin (which depends on Node's `fs`) when the barrel
// pulls in `./firebase`, and the mobile bundler then chokes.
