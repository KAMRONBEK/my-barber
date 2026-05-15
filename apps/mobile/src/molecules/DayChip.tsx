// Date strip pill — `.day` in 10-book.html. Renders weekday short label
// stacked over the day number.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { formatWeekdayShort } from '../lib/format';
import type { AppTheme } from '../lib/restyle';

export interface DayChipProps {
  date: Date;
  selected: boolean;
  disabled?: boolean;
  onPress: (date: Date) => void;
}

export const DayChip: React.FC<DayChipProps> = ({
  date,
  selected,
  disabled,
  onPress,
}) => {
  const theme = useTheme<AppTheme>();
  const bg = selected
    ? theme.colors.accent
    : disabled
    ? theme.colors.surface2
    : theme.colors.surface;
  const fg = selected ? theme.colors.onAccent : theme.colors.fg;
  const subFg = selected ? theme.colors.onAccent : theme.colors.muted;

  return (
    <Pressable
      onPress={() => !disabled && onPress(date)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${formatWeekdayShort(date)} ${date.getDate()}`}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.95 : 1,
        },
      ]}
    >
      <View>
        <Text
          style={{
            color: subFg,
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 1,
            textAlign: 'center',
            textTransform: 'uppercase',
          }}
        >
          {formatWeekdayShort(date)}
        </Text>
        <Text
          style={{
            marginTop: 2,
            color: fg,
            fontSize: 18,
            fontWeight: '700',
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
          }}
        >
          {date.getDate()}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    width: 56,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
