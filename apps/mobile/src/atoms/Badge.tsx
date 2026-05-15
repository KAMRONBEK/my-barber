// Small status pill (e.g. "Tasdiqlangan", "Bo'lajak"). Uses the
// surfaceGlass+accent variants from OD's `.pill` patterns.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Text } from './Text';
import type { AppTheme } from '../lib/restyle';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export const Badge: React.FC<BadgeProps> = ({ label, tone = 'neutral' }) => {
  const theme = useTheme<AppTheme>();
  const palette = {
    neutral: { bg: theme.colors.surface2, fg: theme.colors.fg },
    success: { bg: theme.colors.successSoft, fg: theme.colors.success },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
    accent: { bg: theme.colors.accentSoft, fg: theme.colors.accent },
  }[tone];

  return (
    <View style={[styles.base, { backgroundColor: palette.bg }]}>
      <View
        style={[styles.dot, { backgroundColor: palette.fg }]}
        accessibilityElementsHidden
      />
      <Text style={{ color: palette.fg, fontSize: 11, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});
