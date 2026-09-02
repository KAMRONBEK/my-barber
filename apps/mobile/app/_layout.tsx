// Root expo-router layout. Boots the global providers (theme, query, i18n,
// gesture-handler, auth-hydration) and exposes a Stack with two top-level
// segment groups: (auth) and (tabs). Deep links into /barber/[id] and
// /booking/[barberId] route into the tabs stack.

// Reactotron must connect before any network calls fire, so it's the very
// first import — earlier than i18n's own side-effect init below. (Import
// declarations are hoisted above any other statement, dev-gating happens
// inside the module itself.)
import '../src/lib/reactotron';

// react-native-gesture-handler's side-effect bootstrap is no longer required
// with the new architecture (default in Expo SDK 55) and trips JSI
// registration. GestureHandlerRootView below handles initialization.
import '../src/lib/i18n';

import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '@shopify/restyle';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { theme, darkTheme } from '@my-barber/ui';
import { queryClient } from '../src/lib/query';
import { useAuthStore } from '../src/lib/auth';
import { useAppearanceStore } from '../src/lib/appearance';
import { useLocaleStore } from '../src/lib/locale';
import { getItem } from '../src/lib/storage';
import { ONBOARDING_SEEN_KEY } from './onboarding';
import {
  ensureNotificationPermission,
  isArrivalCheckinNotification,
} from '../src/lib/arrivalNotifications';
import {
  invalidateQueriesForNotification,
  isBookingLifecyclePushData,
  resolveNotificationRoute,
} from '../src/lib/notificationRouting';
import {
  registerPushToken,
  subscribeToPushTokenRotation,
} from '../src/lib/pushToken';
import { useArrivalCheckStore } from '../src/lib/arrivalCheck';
import { useArrivalReminderPoll } from '../src/lib/useArrivalReminderPoll';
import { ArrivalConfirmationSheet } from '../src/molecules/ArrivalConfirmationSheet';

/* ── dev-only network logger ─────────────────────────────────────────────── */
let startNetworkLogging: (() => void) | undefined;
let startReactotronNetworkBridge: (() => void) | undefined;
let NetworkDebugButton: React.FC<{ onPress: () => void }> | undefined;
let NetworkDebugSheet: React.ForwardRefExoticComponent<
  React.RefAttributes<{ open: () => void }>
> | undefined;

if (__DEV__) {
  ({ startNetworkLogging } = require('react-native-network-logger'));
  ({ startReactotronNetworkBridge } = require('../src/lib/reactotronNetworkBridge'));
  ({ NetworkDebugButton } = require('../src/molecules/NetworkDebugButton'));
  ({ NetworkDebugSheet } = require('../src/molecules/NetworkDebugSheet'));
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const appearanceMode = useAppearanceStore((s) => s.mode);
  const hydrateAppearance = useAppearanceStore((s) => s.hydrate);
  const hydrateLocale = useLocaleStore((s) => s.hydrate);
  const effectiveScheme = appearanceMode === 'system' ? systemScheme : appearanceMode;
  const restyleTheme = effectiveScheme === 'dark' ? darkTheme : theme;

  // Hydrate the auth store from SecureStore on first mount. We render a tiny
  // splash until hydrate() settles so we don't flash the wrong segment.
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
    void hydrateAppearance();
    void hydrateLocale();
  }, [hydrate, hydrateAppearance, hydrateLocale]);

  // Request notification permission once authenticated, then register this
  // device's Expo push token with the backend — without this, server-sent
  // booking-lifecycle pushes (notificationService.ts) have nowhere to go:
  // `barber.deviceId` / `client.deviceId` stay empty and every send silently
  // no-ops. Permission alone (no registration) still covers the
  // locally-scheduled arrival-check-in reminder (see
  // useArrivalReminderPoll.ts / arrivalNotifications.ts), which is entirely
  // device-scheduled. Denial or an unsupported environment (e.g. simulator)
  // is fine — the foreground poll is the arrival-check-in backstop, and a
  // push that never registers just never arrives, no user-facing failure.
  useEffect(() => {
    if (status !== 'authenticated' || !role) return;

    let cancelled = false;
    void ensureNotificationPermission().then((granted) => {
      if (granted && !cancelled) void registerPushToken(role);
    });

    const sub = subscribeToPushTokenRotation(role);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [status, role]);

  // Foreground/backgrounded → foregrounded polling backstop, and periodic
  // local-notification scheduling, for the arrival-confirmation prompt.
  useArrivalReminderPoll();

  // Holds a lifecycle-push deep-link target tapped before auth hydration
  // settled (cold start) — consumed once `status` becomes 'authenticated'
  // below, after the auth-redirect effect has run.
  const pendingDeepLinkRef = useRef<string | null>(null);

  // Local notification shown (foreground) or tapped (background/killed) →
  // open the non-dismissable arrival sheet directly, bypassing the poll.
  useEffect(() => {
    const onArrivalCheckinData = (data: unknown) => {
      if (!isArrivalCheckinNotification(data)) return;
      useArrivalCheckStore.getState().open({ id: data.booking_id, role: data.role });
    };

    // Tapping a server-sent booking-lifecycle push (new booking, confirmed,
    // cancelled, etc. — see notificationRouting.ts) deep-links into the
    // screen that shows that booking. Only on tap (the response listener),
    // never on mere receipt — a push landing while the user is mid-task
    // shouldn't yank them away from what they're doing.
    const onLifecyclePushTap = (data: unknown) => {
      if (!isBookingLifecyclePushData(data)) return;
      const role = useAuthStore.getState().role;
      // The push arriving is proof the underlying booking changed — force a
      // refetch rather than trusting each query's staleTime. Deep-link
      // targets are tab screens that stay mounted once visited, so merely
      // navigating back to one doesn't itself trigger a refetch.
      invalidateQueriesForNotification(queryClient, role, data.notification_type);
      const target = resolveNotificationRoute(role, data.notification_type);
      if (useAuthStore.getState().status === 'authenticated') {
        router.push(target as any);
      } else {
        pendingDeepLinkRef.current = target;
      }
    };

    const onNotificationTap = (data: unknown) => {
      onArrivalCheckinData(data);
      onLifecyclePushTap(data);
    };

    // Cold start: app was killed and the user tapped a push to launch it.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) onNotificationTap(response.notification.request.content.data);
    });

    const receivedSub = Notifications.addNotificationReceivedListener((n) => {
      onArrivalCheckinData(n.request.content.data);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (r) => onNotificationTap(r.notification.request.content.data),
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);

  useEffect(() => {
    if (status === 'unknown') return;

    async function navigate() {
      const onAuthRoute = segments[0] === '(auth)';
      const onOnboarding = segments[0] === 'onboarding' || segments[0] === 'select-role';
      const onTabs = segments[0] === '(tabs)';

      if (status === 'authenticated') {
        const role = useAuthStore.getState().role;
        const onBarber = segments[0] === '(barber)';

        if (role === 'barber') {
          // Barbers belong in the barber workspace, but appearance/language/
          // notifications are shared top-level screens both roles can reach.
          const onValidBarberScreen =
            onBarber ||
            segments[0] === 'appearance' ||
            segments[0] === 'language' ||
            segments[0] === 'notifications';
          if (!onValidBarberScreen) {
            router.replace('/(barber)/calendar' as any);
          }
        } else {
          // Clients belong on tabs, but allow deep links to barber detail,
          // booking flow, map view, etc.
          const onValidClientScreen =
            onTabs ||
            segments[0] === 'barber' ||
            segments[0] === 'booking' ||
            segments[0] === 'barbers-map' ||
            segments[0] === 'profile-edit' ||
            segments[0] === 'location-picker' ||
            segments[0] === 'appearance' ||
            segments[0] === 'language' ||
            segments[0] === 'settings' ||
            segments[0] === 'notifications' ||
            segments[0] === 'bookings' ||
            segments[0] === 'cuts-history' ||
            segments[0] === 'saved-barbers';
          if (!onValidClientScreen) {
            router.replace('/(tabs)' as any);
          }
        }
        return;
      }

      if (status === 'unauthenticated') {
        const seen = await getItem(ONBOARDING_SEEN_KEY);
        if (!seen && !onOnboarding) {
          router.replace('/onboarding');
        } else if (!onAuthRoute && !onOnboarding) {
          router.replace('/(auth)/login');
        }
      }
    }

    void navigate();
  }, [status, segments, router]);

  // Consumes a deep link queued by the notification-tap effect above because
  // it arrived before auth hydration settled (cold start). Declared after
  // the auth-redirect effect so its navigation runs last in the same commit
  // and isn't clobbered by that effect's router.replace to the role's
  // default screen.
  useEffect(() => {
    if (status !== 'authenticated' || !pendingDeepLinkRef.current) return;
    const target = pendingDeepLinkRef.current;
    pendingDeepLinkRef.current = null;
    router.push(target as any);
  }, [status, router]);

  /* ── start network logging in dev ──────────────────────────────────────── */
  useEffect(() => {
    if (__DEV__ && startNetworkLogging) {
      startNetworkLogging();
      // Must start after network-logger owns the XHR patch — see
      // reactotronNetworkBridge.ts for why these can't both patch directly.
      startReactotronNetworkBridge?.();
    }
  }, []);

  const sheetRef = useRef<{ open: () => void }>(null);

  if (status === 'unknown') {
    return (
      <SafeAreaProvider>
        <ThemeProvider theme={restyleTheme}>
          <View style={{ flex: 1, backgroundColor: restyleTheme.colors.bg }} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider theme={restyleTheme}>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: restyleTheme.colors.bg },
                }}
              />

              <ArrivalConfirmationSheet />

              {__DEV__ && NetworkDebugButton && NetworkDebugSheet && (
                <>
                  <NetworkDebugButton onPress={() => sheetRef.current?.open()} />
                  <NetworkDebugSheet ref={sheetRef} />
                </>
              )}
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
