// Expo push notification registration + listener wiring. Sole purpose today
// is waking the app for the arrival-confirmation prompt (see
// ArrivalConfirmationSheet.tsx / arrivalCheck.ts) even when the phone is
// locked/backgrounded — the foreground poll (useArrivalReminderPoll.ts) is
// the backstop for when push delivery is missed or denied.
//
// Push notifications do not work in the iOS Simulator; test on a physical
// device or an Android emulator with Google Play services.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Requests permission and returns an Expo push token, or null if denied/unavailable. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as
      | string
      | undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse.data;
  } catch {
    // Permission denial or an unsupported environment (e.g. simulator) is
    // expected, not an error condition — the foreground poll still works.
    return null;
  }
}

export interface ArrivalCheckinPushData {
  kind: 'booking_upcoming_checkin';
  booking_id: string;
}

export function isArrivalCheckinPush(
  data: unknown,
): data is ArrivalCheckinPushData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).kind === 'booking_upcoming_checkin' &&
    typeof (data as Record<string, unknown>).booking_id === 'string'
  );
}
