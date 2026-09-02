// Expo push token registration — the missing link between the backend's
// push-sending machinery (notificationService.ts, which already looks up
// `barber.deviceId` / `client.deviceId` on every booking-lifecycle event)
// and an actual device: without this, those Firestore fields are never
// populated and every push silently no-ops (see sendNotificationThroughExpo's
// `if (!token?.trim()) continue;`).
//
// Registration flow:
//   1. Caller (root layout) has already confirmed notification permission via
//      ensureNotificationPermission() in arrivalNotifications.ts.
//   2. Fetch the Expo push token, scoped to this app's EAS project id.
//   3. PUT it to the role-appropriate device-id endpoint.
// Also listens for token rotation (rare, but Expo can reissue a token) for
// the lifetime of the call site's effect.

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  registerClientDeviceId,
  registerBarberDeviceId,
  clearClientPushToken,
  clearBarberPushToken,
} from './api';
import type { UserRole } from './auth';

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId
  );
}

// Avoids redundant PUTs when this fires more than once in a session (e.g.
// permission effect re-running) — not persisted, just a per-process guard.
let lastRegistered: string | null = null;

/** Fetches this device's Expo push token and registers it with the backend for `role`. No-ops (silently) on simulators, denied permission, or missing EAS config. */
export async function registerPushToken(role: UserRole): Promise<void> {
  try {
    const projectId = getProjectId();
    if (!projectId) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!token || token === lastRegistered) return;

    if (role === 'barber') {
      await registerBarberDeviceId(token);
    } else {
      await registerClientDeviceId(token);
    }
    lastRegistered = token;
  } catch {
    // Simulators/emulators throw here, and a network hiccup shouldn't block
    // app usage — the next successful call (next launch, token rotation)
    // catches up.
  }
}

/**
 * Subscribes to native push token rotation (rare — APNs/FCM can reissue the
 * underlying device token) for as long as the caller's effect is mounted.
 * The listener payload is the *native* device token, not an Expo push token
 * (see expo-notifications' TokenEmitter — `PushTokenListener` receives a
 * `DevicePushToken`), so on rotation we re-derive the Expo push token via
 * `registerPushToken` rather than forwarding the event payload directly —
 * the backend only accepts `ExponentPushToken[...]`-shaped tokens.
 */
export function subscribeToPushTokenRotation(role: UserRole) {
  return Notifications.addPushTokenListener(() => {
    void registerPushToken(role);
  });
}

/** Clears the server-side push token for `role` — call on explicit sign-out so a shared/handed-off device stops receiving this account's pushes. Best-effort. */
export async function clearPushToken(role: UserRole): Promise<void> {
  try {
    if (role === 'barber') {
      await clearBarberPushToken();
    } else {
      await clearClientPushToken();
    }
    lastRegistered = null;
  } catch {
    // Best-effort — sign-out proceeds regardless.
  }
}
