// Tabs layout. Four tabs: Home, Search, Bookings, Profile.
// Uses the custom GlassTabBar (floating pill with blur).

import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GlassTabBar } from '../../src/navigation/GlassTabBar';

export default function TabsLayout() {
  const { t } = useTranslation();

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
