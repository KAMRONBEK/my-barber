// Barber workspace route group layout.
// Stack that wraps the Tabs + modal/stack screens (portfolio-edit, pending, settings).
// Redirects non-barbers to client tabs.

import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth';

export default function BarberLayout() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (role === 'client') {
      router.replace('/(tabs)');
    }
  }, [role, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="portfolio-edit" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="bookings-history" />
    </Stack>
  );
}
