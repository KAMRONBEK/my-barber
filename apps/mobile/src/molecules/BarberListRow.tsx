// Portrait-style barber row: 84×100 gradient thumbnail, name, rating,
// distance, open/closed pill, heart toggle top-right. Shared by the search
// screen and the saved-barbers (favorites) screen.

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import { Avatar } from '../atoms/Avatar';
import type { ApiBarber } from '../lib/api';
import { formatUZS } from '../lib/format';
import { hapticToggle } from '../lib/haptics';
import type { AppTheme } from '../lib/restyle';

const CARD_GRADIENTS = [
  ['#2c2c2c', '#1a1a1a'] as const,
  ['#262626', '#161616'] as const,
  ['#303030', '#1c1c1c'] as const,
];

export const BarberListRow: React.FC<{
  barber: ApiBarber;
  isSaved: boolean;
  isSaving?: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}> = ({ barber, isSaved, isSaving, onPress, onToggleSave }) => {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const gradients =
    CARD_GRADIENTS[Math.abs(barber.id.charCodeAt(0)) % CARD_GRADIENTS.length];

  // Stub: barbers with an even last char in id are considered "open"
  const isOpen = barber.id.charCodeAt(barber.id.length - 1) % 2 === 0;
  const minPrice =
    (barber.services ?? []).length > 0
      ? barber.services!.reduce(
          (m, s) => (s.price < m ? s.price : m),
          barber.services![0].price,
        )
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
    >
      {/* Portrait thumbnail with gradient fill */}
      <View style={styles.thumb}>
        <LinearGradient
          colors={gradients}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <Avatar
          size={44}
          uri={barber.avatar ?? undefined}
          initials={`${barber.firstName[0] ?? ''}${barber.lastName[0] ?? ''}`}
        />
        {/* Heart button — top right of thumbnail */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            hapticToggle();
            onToggleSave();
          }}
          disabled={isSaving}
          style={styles.heartBtn}
          hitSlop={8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon
              name={isSaved ? 'heart-filled' : 'heart'}
              size={16}
              color={isSaved ? theme.colors.accent : 'rgba(255,255,255,0.7)'}
            />
          )}
        </Pressable>
        {/* Open/closed pill */}
        <View
          style={[
            styles.openPill,
            {
              backgroundColor: isOpen
                ? `${theme.colors.success}CC`
                : `${theme.colors.danger}99`,
            },
          ]}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
            {isOpen ? t('search.open') : t('search.closed')}
          </Text>
        </View>
      </View>

      {/* Metadata */}
      <View style={styles.meta}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: theme.colors.fg,
            letterSpacing: -0.2,
          }}
          numberOfLines={1}
        >
          {barber.firstName} {barber.lastName}
        </Text>

        {/* Rating row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 }}>
          <Icon name="star" size={11} color={theme.colors.accent} />
          <Text style={{ fontSize: 12, color: theme.colors.muted, fontWeight: '600' }}>
            {barber.ratingAverage ? barber.ratingAverage.toFixed(1) : '—'}
          </Text>
          {barber.ratingCount ? (
            <Text style={{ fontSize: 12, color: theme.colors.muted2 }}>
              ({barber.ratingCount})
            </Text>
          ) : null}
        </View>

        {/* Distance stub */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 }}>
          <Icon name="pin" size={11} color={theme.colors.muted2} />
          <Text style={{ fontSize: 12, color: theme.colors.muted2 }}>1.2 km</Text>
        </View>

        {/* Price */}
        {minPrice != null ? (
          <Text
            style={{
              marginTop: 6,
              fontSize: 13,
              fontWeight: '600',
              color: theme.colors.accent,
            }}
          >
            {t('barber.priceFrom')} {formatUZS(minPrice)}
          </Text>
        ) : null}
      </View>

      <Icon name="arrow-right" size={16} color={theme.colors.muted2} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: 84,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 2,
  },
  openPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
});
