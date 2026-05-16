// Barber workspace tab layout.
// Four tabs: Calendar, Requests, Earnings, Profile.

import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BarberTabBar } from '../../../src/navigation/BarberTabBar';

export default function BarberTabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <BarberTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t('tabs.requests') ?? 'Requests',
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t('tabs.earnings') ?? 'Earnings',
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
