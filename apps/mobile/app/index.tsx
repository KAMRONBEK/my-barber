// Tiny entry route — the root layout effect handles redirecting the user
// to /(tabs) or /(auth)/login based on auth status. This component just
// renders an empty surface while that effect runs.

import { View } from 'react-native';
import { useTheme } from '@shopify/restyle';
import type { Theme } from '@my-barber/ui';

export default function Index() {
  const theme = useTheme<Theme>();
  return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
}
