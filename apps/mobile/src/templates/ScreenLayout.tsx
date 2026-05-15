// Shared safe-area + status-bar background wrapper. Every screen except
// the tabs root (which has its own scroll containers) wraps with this.

import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shopify/restyle';
import type { AppTheme } from '../lib/restyle';

export interface ScreenLayoutProps {
  /**
   * If `false`, we don't claim the top safe area — useful when the screen
   * has its own hero/cover image that runs under the status bar.
   */
  edgeToEdgeTop?: boolean;
  contentStyle?: ViewStyle;
  background?: keyof AppTheme['colors'];
}

export const ScreenLayout: React.FC<PropsWithChildren<ScreenLayoutProps>> = ({
  children,
  edgeToEdgeTop = false,
  contentStyle,
  background = 'bg',
}) => {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const bgColor = theme.colors[background];

  if (edgeToEdgeTop) {
    return (
      <View
        style={[styles.flex, { backgroundColor: bgColor }, contentStyle]}
        accessibilityElementsHidden={false}
      >
        {children}
        {/* No top safe-area padding — children draw under it. */}
        <View
          style={{ height: insets.bottom, backgroundColor: bgColor }}
          accessibilityElementsHidden
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: bgColor }, contentStyle]}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
