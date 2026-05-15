// Selectable service row used on the booking screen. Reuses OD's
// `.service-pick label` styling.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { formatUZS, formatDurationMinutes } from '../lib/format';
import type { AppTheme } from '../lib/restyle';
import type { ApiService } from '../lib/api';
import {
  DEFAULT_SERVICE_DURATION_MINUTES,
} from '@my-barber/types';

export interface ServiceRowProps {
  service: ApiService;
  description?: string;
  selected: boolean;
  onToggle: (id: string) => void;
}

export const ServiceRow: React.FC<ServiceRowProps> = ({
  service,
  description,
  selected,
  onToggle,
}) => {
  const theme = useTheme<AppTheme>();
  const duration =
    service.durationMinutes && service.durationMinutes > 0
      ? service.durationMinutes
      : DEFAULT_SERVICE_DURATION_MINUTES;

  return (
    <Pressable
      onPress={() => onToggle(service.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={service.name}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected
            ? theme.colors.accentSoft
            : theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.ring,
          {
            borderColor: selected
              ? theme.colors.accent
              : theme.colors.borderStrong,
            backgroundColor: selected ? theme.colors.accent : 'transparent',
          },
        ]}
      >
        {selected ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.colors.onAccent,
            }}
          />
        ) : null}
      </View>

      <View style={styles.info}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.fg,
            letterSpacing: -0.1,
          }}
          numberOfLines={1}
        >
          {service.name}
        </Text>
        {description ? (
          <Text
            style={{ marginTop: 2, fontSize: 12, color: theme.colors.muted }}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text style={{ fontSize: 11, color: theme.colors.muted }}>
          {formatDurationMinutes(duration)}
        </Text>
        <Text
          style={{ fontSize: 14, fontWeight: '600', color: theme.colors.fg }}
        >
          {formatUZS(service.price)}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
