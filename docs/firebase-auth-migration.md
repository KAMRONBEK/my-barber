# Firebase Auth Migration Plan

> Status: Planned | Target: Post-launch or next major sprint
> Scope: Add Google Sign-In and Apple Sign-In by migrating from custom JWT + bcrypt to Firebase Authentication.

---

## Current State

- Auth system: custom JWT + bcrypt in Express API
- `firebase-admin` used only for Firestore access, not auth verification
- Users stored in Firestore with `passwordHash` and `salt`
- Seeded accounts: `barber@test.local`, `client@test.local`

---

## 1. Firebase Console Setup

### Enable Providers
1. Firebase Console → Authentication → Sign-in method
2. Enable **Google** (toggle only)
3. Enable **Apple** (requires Apple Developer Program, $99/yr):
   - Create App ID with "Sign In with Apple" capability
   - Create Services ID for web callback
   - Generate Sign In with Apple private key
   - Configure in Firebase: Team ID, Key ID, Private Key, Service ID

### Download Configs
- `google-services.json` (Android) → `apps/mobile/android/app/`
- `GoogleService-Info.plist` (iOS) → `apps/mobile/ios/`
- Web client ID → used in Next.js

---

## 2. Mobile (Expo SDK 54)

### Path A: Pure Expo (Expo Go compatible)

Uses `expo-auth-session` + Firebase JS SDK `signInWithCredential`.

#### Dependencies

```bash
npx expo install expo-auth-session expo-web-browser expo-apple-authentication
npx expo install @react-native-async-storage/async-storage
```

#### Google Sign-In

```typescript
import * as Google from 'expo-auth-session/providers/google';
import { useEffect } from 'react';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: '<WEB_CLIENT_ID>',
  iosClientId: '<IOS_CLIENT_ID>',
  androidClientId: '<ANDROID_CLIENT_ID>',
});

useEffect(() => {
  if (response?.type === 'success') {
    const { id_token } = response.params;
    const credential = GoogleAuthProvider.credential(id_token);
    signInWithCredential(getAuth(), credential);
  }
}, [response]);
```

#### Apple Sign-In

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';
import { getAuth, OAuthProvider, signInWithCredential } from 'firebase/auth';

const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

const provider = new OAuthProvider('apple.com');
const appleCredential = provider.credential({
  idToken: credential.identityToken,
  rawNonce: nonce,
});

await signInWithCredential(getAuth(), appleCredential);
```

#### Firebase Auth Persistence

```typescript
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
```

### Path B: Native Modules (EAS Build / Dev Client)

Better native UX but requires custom dev builds (no Expo Go).

```bash
npx expo install @react-native-firebase/app @react-native-firebase/auth
npx expo install @react-native-google-signin/google-signin
```

> **Recommendation:** Start with Path A (Pure Expo) for faster iteration, migrate to Path B later if UX demands it.

---

## 3. Web (Next.js)

```typescript
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

const auth = getAuth();

// Google
const googleProvider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, googleProvider);

// Apple
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');
const result = await signInWithPopup(auth, appleProvider);
```

Wrap in a client component. Send the returned `idToken` as `Authorization: Bearer <idToken>` to the API.

---

## 4. API (Express) — Critical Migration

### New Auth Middleware

Replace custom JWT verification with Firebase Admin `verifyIdToken`.

```typescript
import { getAuth } from 'firebase-admin/auth';
import { Request, Response, NextFunction } from 'express';

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const idToken = header.split('Bearer ')[1];
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
```

### Firestore User Documents

Keep existing `users` collection. Change document ID to match Firebase Auth `uid`.

```typescript
const userRef = db.collection(COLLECTIONS.USERS).doc(decoded.uid);
const doc = await userRef.get();

if (!doc.exists) {
  await userRef.set({
    email: decoded.email,
    role: 'client',
    createdAt: new Date(),
  });
}
```

### Performance Note

`verifyIdToken` caches Google public keys in-process. On Vercel serverless, this survives within a container but not cold starts. Acceptable for current traffic.

---

## 5. Existing User Migration

### Export Script

```typescript
import { getFirebaseAdmin } from '@my-barber/config/firebase';
import { COLLECTIONS } from '@my-barber/config/firestore-collections';

const db = getFirebaseAdmin().firestore();
const users = await db.collection(COLLECTIONS.USERS).get();

const userRecords = users.docs.map((doc) => ({
  uid: doc.id,
  email: doc.data().email,
  passwordHash: Buffer.from(doc.data().passwordHash),
  passwordSalt: Buffer.from(doc.data().salt),
}));
```

### Batch Import into Firebase Auth

```typescript
import { getAuth } from 'firebase-admin/auth';

await getAuth().importUsers(userRecords, {
  hash: {
    algorithm: 'BCRYPT',
  },
});
```

> **Important:** If existing doc IDs are not valid Firebase Auth UIDs (28-char format), generate new UIDs and store `firebaseUid` in Firestore.

### Dual-Auth Transition (Recommended)

Run both auth systems for 1-2 release cycles. Try Firebase first, fallback to legacy JWT.

```typescript
try {
  const decoded = await getAuth().verifyIdToken(token);
  req.user = { uid: decoded.uid, email: decoded.email };
  return next();
} catch (firebaseErr) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = { uid: decoded.userId, email: decoded.email };
    return next();
  } catch (legacyErr) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
```

Remove legacy fallback once all clients are migrated.

---

## 6. Seeded Test Accounts

After migration, these must exist in Firebase Auth with the same passwords:

| Role   | Email               | Password       |
|--------|---------------------|----------------|
| Barber | `barber@test.local` | `DevTest12345` |
| Client | `client@test.local` | `DevTest12345` |

Create manually in Firebase Console or include in the import batch.

---

## 7. Files to Touch

| Layer | Files |
|-------|-------|
| Config | `packages/config/src/firebase.ts` — add `getFirebaseAuth()` export |
| API middleware | `backend/api/middleware/auth.ts` — switch to `verifyIdToken` |
| API routes | Remove password hashing from registration/login routes |
| Mobile | New: `apps/mobile/src/screens/Auth/SocialProviders.tsx` |
| Web | New: `apps/web/components/auth/SocialProviders.tsx` |
| Shared types | `packages/types` — update auth schemas if needed |
| CI | Optional: Add Firebase Auth emulator for integration tests |

---

## 8. Effort Estimate

| Step | Time |
|------|------|
| Firebase Console setup | 30 min |
| Mobile Google/Apple UI | 2-3 hours |
| Web Google/Apple UI | 1 hour |
| API middleware swap | 1-2 hours |
| User migration script | 2-3 hours |
| Dual-auth transition | 1-2 sprints |
| **Total (first release)** | ~2-3 days of focused work |

---

## Open Questions

1. Should we keep the `users` collection as the source of truth for roles/approvalStatus, or move that into Firebase Auth custom claims?
2. Do we need Apple Sign-In on Android, or only iOS?
3. Should we use Path A (Pure Expo) or Path B (Native modules) for mobile?
