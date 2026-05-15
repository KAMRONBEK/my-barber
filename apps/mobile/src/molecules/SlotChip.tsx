// Time slot pill. Selected: filled accent. Available: surface. Disabled:
// dimmed surface. Matches OD's `.slot` styling in 10-book.html.

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { formatTimeOfDay } from '../lib/format';
import type { AppTheme } from '../lib/restyle';

export interface SlotChipProps {
  startAt: Date;
  selected: boolean;
  disabled: boolean;
  onPress: (startAt: Date) => void;
  /** Show the time label with a strikethrough (slot unavailable). */
  strikethrough?: boolean;
}

export const SlotChip: React.FC<SlotChipProps> = ({
  startAt,
  selected,
  disabled,
  onPress,
  strikethrough = false,
}) => {
  const theme = useTheme<AppTheme>();

  const bg = selected
    ? theme.colors.accent
    : disabled
    ? theme.colors.surface2
    : theme.colors.surface;
  const fg = selected
    ? theme.colors.onAccent
    : disabled
    ? theme.colors.muted2
    : theme.colors.fg;
  const border = selected
    ? theme.colors.accent
    : disabled
    ? theme.colors.border
    : theme.colors.border;

  return (
    <Pressable
      onPress={() => !disabled && onPress(startAt)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={formatTimeOfDay(startAt)}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.6 : pressed ? 0.95 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: strikethrough ? theme.colors.muted : fg,
          fontSize: 13,
          fontWeight: '600',
          fontVariant: ['tabular-nums'],
          textDecorationLine: strikethrough ? 'line-through' : 'none',
        }}
      >
        {formatTimeOfDay(startAt)}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
