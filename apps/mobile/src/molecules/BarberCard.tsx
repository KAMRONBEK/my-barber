// Featured-barber list row used on the Home screen. Maps to OD's `.featured`
// block in 07-dashboard.html.

import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import { formatPriceFrom } from '../lib/format';
import type { AppTheme } from '../lib/restyle';
import type { ApiBarber } from '../lib/api';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0]?.[0] ?? '').toUpperCase();
}

export interface BarberCardProps {
  barber: ApiBarber;
  onPress?: () => void;
  tags?: string[];
}

export const BarberCard: React.FC<BarberCardProps> = ({
  barber,
  onPress,
  tags = [],
}) => {
  const theme = useTheme<AppTheme>();
  const rating = barber.ratingAverage ?? 0;
  const minPrice = (barber.services ?? []).reduce<number | null>(
    (min, s) => (min == null || s.price < min ? s.price : min),
    null,
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${barber.firstName} ${barber.lastName}`}
    >
      <LinearGradient
        colors={['#333333', '#c4c4c4']}
        style={styles.listThumb}
      >
        {barber.avatar ? (
          <Image source={{ uri: barber.avatar }} style={styles.listThumbImg} />
        ) : (
          <View style={styles.listThumbFallback}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>
              {getInitials(`${barber.firstName} ${barber.lastName}`)}
            </Text>
          </View>
        )}
      </LinearGradient>
      <View style={styles.meta}>
        <View style={styles.nameRow}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.colors.fg,
              letterSpacing: -0.1,
            }}
            numberOfLines={1}
          >
            {barber.firstName} {barber.lastName}
          </Text>
          <Icon name="verified" size={14} color={theme.colors.accent} />
        </View>
        <View style={styles.subRow}>
          <View style={styles.starRow}>
            <Icon name="star" size={12} color={theme.colors.accent} />
            <Text
              style={{
                fontSize: 13,
                color: theme.colors.fg,
                fontWeight: '600',
                marginLeft: 4,
              }}
            >
              {rating ? rating.toFixed(2).replace('.', ',') : '—'}
            </Text>
          </View>
          {minPrice != null ? (
            <>
              <Text style={{ color: theme.colors.muted2, fontSize: 12 }}>
                ·
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.muted }}>
                {formatPriceFrom(minPrice)}
              </Text>
            </>
          ) : null}
        </View>
        {tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {tags.slice(0, 2).map((t) => (
              <View
                key={t}
                style={[
                  styles.tag,
                  {
                    backgroundColor: theme.colors.surface2,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 11, color: theme.colors.muted }}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Icon name="arrow-right" size={18} color={theme.colors.muted2} />
    </Pressable>
  );
};

// "Compact" variant used in the "Book again" rail on the Home screen.
export const BarberRailCard: React.FC<{
  barber: ApiBarber;
  visitCountLabel?: string;
  onPress?: () => void;
}> = ({ barber, visitCountLabel, onPress }) => {
  const theme = useTheme<AppTheme>();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width: 96, opacity: pressed ? 0.9 : 1 }]}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['#333333', '#c4c4c4']}
        style={styles.railPortrait}
      >
        {barber.avatar ? (
          <Image source={{ uri: barber.avatar }} style={styles.railPortraitImg} />
        ) : (
          <View style={styles.railPortraitFallback}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 22 }}>
              {getInitials(`${barber.firstName} ${barber.lastName}`)}
            </Text>
          </View>
        )}
      </LinearGradient>
      <Text
        style={{
          marginTop: 10,
          textAlign: 'center',
          fontWeight: '600',
          fontSize: 13,
          color: theme.colors.fg,
        }}
        numberOfLines={1}
      >
        {barber.firstName} {barber.lastName[0]}.
      </Text>
      {visitCountLabel ? (
        <Text
          style={{
            marginTop: 2,
            textAlign: 'center',
            fontSize: 12,
            color: theme.colors.muted,
          }}
        >
          {visitCountLabel}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listThumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
  },
  listThumbImg: {
    width: 80,
    height: 80,
  },
  listThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railPortrait: {
    width: 96,
    height: 96,
    borderRadius: 18,
    overflow: 'hidden',
  },
  railPortraitImg: {
    width: 96,
    height: 96,
  },
  railPortraitFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
