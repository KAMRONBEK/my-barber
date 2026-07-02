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
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../../src/atoms/Text';
import { Icon } from '../../src/atoms/Icon';
import { BarberListRow } from '../../src/molecules/BarberListRow';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { getBanner } from '../../src/lib/api';
import { useFavoriteBarbers } from '../../src/hooks/useFavoriteBarbers';
import { queryKeys, STALE } from '../../src/lib/query';
import type { AppTheme } from '../../src/lib/restyle';

type FilterKey = 'all' | 'rating' | 'distance' | 'open' | 'beard';

const FILTER_KEYS: FilterKey[] = ['all', 'rating', 'distance', 'open', 'beard'];

export default function SearchScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const { favoriteIds, toggleFavorite } = useFavoriteBarbers();

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
                isSaved={favoriteIds.has(b.id)}
                onPress={() => router.push(`/barber/${b.id}`)}
                onToggleSave={() => toggleFavorite(b.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

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
});
