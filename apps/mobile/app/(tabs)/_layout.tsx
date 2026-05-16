// Tabs layout. Four tabs: Home, Search, Bookings, Profile.
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
