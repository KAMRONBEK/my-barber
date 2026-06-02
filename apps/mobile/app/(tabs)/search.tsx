// Search / All Barbers screen. Large display title, horizontally scrollable
// filter chips, result count, and BarberCard with open/closed badge + heart.

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../../src/atoms/Text';
import { Icon } from '../../src/atoms/Icon';
import { Avatar } from '../../src/atoms/Avatar';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { getBanner, type ApiBarber } from '../../src/lib/api';
import { queryKeys, STALE } from '../../src/lib/query';
import { formatUZS } from '../../src/lib/format';
import type { AppTheme } from '../../src/lib/restyle';

type FilterKey = 'all' | 'rating' | 'distance' | 'open' | 'beard';

const FILTER_KEYS: FilterKey[] = ['all', 'rating', 'distance', 'open', 'beard'];

export default function SearchScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const bannerQuery = useQuery({
    queryKey: queryKeys.banner,
    queryFn: getBanner,
    staleTime: STALE.banner,
  });

  const barbers = (bannerQuery.data ?? []).filter((b) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      b.firstName.toLowerCase().includes(q) ||
      b.lastName.toLowerCase().includes(q)
    );
  });

  function toggleSaved(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function filterLabel(key: FilterKey): string {
    switch (key) {
      case 'all':
        return t('search.filterLabel');
      case 'rating':
        return t('search.filterRating');
      case 'distance':
        return t('search.filterDistance');
      case 'open':
        return t('search.filterOpen');
      case 'beard':
        return t('search.filterBeard');
    }
  }

  return (
    <ScreenLayout>
      {/* Display title header */}
      <View style={styles.titleWrap}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '700',
                color: theme.colors.fg,
                letterSpacing: -0.8,
              }}
            >
              {t('search.title')}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 14,
                color: theme.colors.muted,
              }}
            >
              {t('search.subtitle')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/barbers-map' as any)}
            style={[
              styles.mapBtn,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('search.mapView')}
          >
            <Icon name="map" size={18} color={theme.colors.fg} />
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: theme.colors.surface2,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Icon name="search" size={16} color={theme.colors.muted2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('tabs.search')}
          placeholderTextColor={theme.colors.muted2}
          style={[
            styles.searchInput,
            { color: theme.colors.fg },
          ]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          testID="search-input"
        />
        <Icon name="mic" size={16} color={theme.colors.accent} />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}
      >
        {FILTER_KEYS.map((key) => {
          const isActive = activeFilter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setActiveFilter(key)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? theme.colors.fg
                    : theme.colors.surface2,
                  borderColor: isActive
                    ? theme.colors.fg
                    : theme.colors.border,
                },
              ]}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? theme.colors.bg : theme.colors.fg,
                }}
              >
                {filterLabel(key)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Result count */}
      {!bannerQuery.isLoading && barbers.length > 0 ? (
        <Text
          style={{
            paddingHorizontal: 20,
            paddingBottom: 8,
            fontSize: 13,
            color: theme.colors.muted,
            fontWeight: '500',
          }}
        >
          {t('search.resultCount', { count: barbers.length })}
        </Text>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: theme.colors.bg },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {bannerQuery.isLoading ? (
          <Text style={{ color: theme.colors.muted }}>{t('common.loading')}</Text>
        ) : barbers.length === 0 ? (
          <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
        ) : (
          <View style={styles.list}>
            {barbers.map((b) => (
              <BarberListRow
                key={b.id}
                barber={b}
                isSaved={savedIds.has(b.id)}
                onPress={() => router.push(`/barber/${b.id}`)}
                onToggleSave={() => toggleSaved(b.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

// ---- BarberListRow ----
// Portrait-style card: 84×100 gradient thumbnail, name, rating, distance,
// open/closed pill, heart button top-right.

const CARD_GRADIENTS = [
  ['#3d1e0a', '#1d130b'] as const,
  ['#2e1508', '#1a0f06'] as const,
  ['#4a1f0c', '#221208'] as const,
];

const BarberListRow: React.FC<{
  barber: ApiBarber;
  isSaved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}> = ({ barber, isSaved, onPress, onToggleSave }) => {
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
            onToggleSave();
          }}
          style={styles.heartBtn}
          hitSlop={8}
        >
          <Icon
            name="heart"
            size={16}
            color={isSaved ? theme.colors.accent : 'rgba(255,255,255,0.7)'}
          />
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
          <Text
            style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}
          >
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
            {barber.ratingAverage
              ? barber.ratingAverage.toFixed(1)
              : '—'}
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
  titleWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 12,
  },
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  chips: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  list: {
    gap: 12,
  },
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
