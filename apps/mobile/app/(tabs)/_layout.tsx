// Tabs layout. Three tabs: Home, Search, Profile. Bookings still exists as
// a screen (reached from Home's "recent bookings" section via the top-level
// /bookings route) but isn't a persistent bottom tab — a calendar-style tab
// for viewing your own bookings isn't something clients need parked in the
// tab bar at all times.
// Uses the custom GlassTabBar (floating pill with blur).

import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GlassTabBar } from '../../src/navigation/GlassTabBar';
import { useAuthStore } from '../../src/lib/auth';

export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (role === 'barber') {
      router.replace('/(barber)/calendar' as any);
    }
  }, [role, router]);

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
        }}
      />
    </Tabs>
  );
}
