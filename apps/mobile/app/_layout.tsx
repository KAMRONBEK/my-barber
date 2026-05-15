// Root expo-router layout. Boots the global providers (theme, query, i18n,
// gesture-handler, auth-hydration) and exposes a Stack with two top-level
// segment groups: (auth) and (tabs). Deep links into /barber/[id] and
// /booking/[barberId] route into the tabs stack.

// react-native-gesture-handler's side-effect bootstrap is no longer required
// with the new architecture (default in Expo SDK 55) and trips JSI
// registration. GestureHandlerRootView below handles initialization.
import '../src/lib/i18n';

import React, { useEffect } from 'react';
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

      if (status === 'authenticated' && (onAuthRoute || onOnboarding)) {
        router.replace('/(tabs)');
        return;
      }

      if (status === 'unauthenticated') {
        // Show onboarding on first launch; skip it on subsequent launches.
        const seen = await getItem(ONBOARDING_SEEN_KEY);
        if (!seen && !onOnboarding && !onAuthRoute) {
          router.replace('/onboarding');
        } else if (seen && !onAuthRoute && !onOnboarding) {
          router.replace('/(auth)/login');
        }
      }
    }

    void navigate();
  }, [status, segments, router]);

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
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
