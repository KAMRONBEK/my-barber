# Expo push notifications (mobile + API)

Use the **[Expo push notification setup guide](https://docs.expo.dev/push-notifications/push-notifications-setup)** as the authoritative mobile checklist:

- **`expo-notifications`** plugin in app config ([SDK reference](https://docs.expo.dev/versions/latest/sdk/notifications)).
- Request permission before reading the token.
- Call **`Notifications.getExpoPushTokenAsync({ projectId })`** with your Expo / EAS project id.
- Prefer **development or production builds**; **Android Expo Go cannot receive push from SDK 53+** ([limits](https://docs.expo.dev/versions/latest/sdk/notifications)).

## Backend (this API)

- **Register token after login**: `PUT /barber/update-device-id` or `PUT /client/update-device-id` with JSON `{ "deviceId": "ExponentPushToken[...]" }` (must pass `Expo.isExpoPushToken` validation).
- **Logout / permission revoked**: `DELETE /barber/push-token` or `DELETE /client/push-token` clears the stored token.
- **`EXPO_ACCESS_TOKEN`**: Optional in env; improves quota / auth with Expo’s HTTPS API ([sending](https://docs.expo.dev/push-notifications/sending-notifications)).
- **`EXPO_RECEIPT_POLL_DELAY_MS`**: Delay before the server polls Expo **[push receipts](https://docs.expo.dev/push-notifications/sending-notifications#check-push-receipts-for-errors)** (default ~15 minutes in production). Receipts returning **`DeviceNotRegistered`** trigger clearing the token in Firestore. Jest forces **`0`** in `jest.setup.ts` so no real network is required during tests.

## Booking notifications

Firestore **in-app inbox** rows and **Expo push** payloads share the same copy and routing (`services/bookingLifecycleNotifications.ts`): new booking (barber), confirm/decline (client), cancel (recipient depends on side), reschedule (both), no-show and completed (client), etc. Push payloads include string `data.booking_id`, `data.kind`, and `data.notification_type` aligned with inbox `metadata` / types.
