// Generic 404. Routes that resolve to nothing land here. We just redirect
// the user back home so the slice never traps them on a dead screen.

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import type { Theme } from '@my-barber/ui';

export default function NotFound() {
  const theme = useTheme<Theme>();
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)');
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
}
