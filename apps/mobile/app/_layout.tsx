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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, View } from 'react-native';
import { theme, darkTheme } from '@my-barber/ui';
import { queryClient } from '../src/lib/query';
import { useAuthStore } from '../src/lib/auth';
import { getItem } from '../src/lib/storage';
import { ONBOARDING_SEEN_KEY } from './onboarding';

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
  const scheme = useColorScheme();
  const restyleTheme = scheme === 'dark' ? darkTheme : theme;

  // Hydrate the auth store from SecureStore on first mount. We render a tiny
  // splash until hydrate() settles so we don't flash the wrong segment.
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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
          // Barbers belong in the barber workspace
          if (!onBarber) {
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
            segments[0] === 'settings' ||
            segments[0] === 'notifications' ||
            segments[0] === 'bookings';
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
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: restyleTheme.colors.bg },
              }}
            />

            {__DEV__ && NetworkDebugButton && NetworkDebugSheet && (
              <>
                <NetworkDebugButton onPress={() => sheetRef.current?.open()} />
                <NetworkDebugSheet ref={sheetRef} />
              </>
            )}
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
