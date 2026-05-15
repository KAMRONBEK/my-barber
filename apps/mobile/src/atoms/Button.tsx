// Pill button matching OD's `.btn` patterns (primary / secondary / dark /
// destructive). No icon support yet — keep the contract narrow until we
// need it.

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Text } from './Text';
import type { AppTheme } from '../lib/restyle';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'dark' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  testID,
}) => {
  const theme = useTheme<AppTheme>();

  const palette = {
    primary: {
      bg: theme.colors.accent,
      fg: theme.colors.onAccent,
      border: 'transparent',
    },
    secondary: {
      bg: theme.colors.surface2,
      fg: theme.colors.fg,
      border: theme.colors.border,
    },
    destructive: {
      bg: theme.colors.danger,
      fg: theme.colors.onAccent,
      border: 'transparent',
    },
    dark: {
      bg: theme.colors.fg,
      fg: theme.colors.bg,
      border: 'transparent',
    },
    ghost: {
      bg: 'transparent',
      fg: theme.colors.accent,
      border: theme.colors.accent,
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) =>
        [
          styles.base,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
          } as ViewStyle,
        ]
      }
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={{ color: palette.fg, fontSize: 15, fontWeight: '600' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
