// Saved/favorited barbers — the "Saqlangan" stat on the profile screen.
// Backed by GET/POST/DELETE /client/favorites (see useFavoriteBarbers),
// shared with the heart toggle on the search and barber-detail screens.

import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { Icon } from '../src/atoms/Icon';
import { BarberListRow } from '../src/molecules/BarberListRow';
import { ScreenHeader } from '../src/molecules/ScreenHeader';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../src/navigation/GlassTabBar';
import { useFavoriteBarbers } from '../src/hooks/useFavoriteBarbers';
import type { AppTheme } from '../src/lib/restyle';

export default function SavedBarbersScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarPadding = TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_BOTTOM_OFFSET) + 8;
  const { favorites, favoriteIds, isLoading, toggleFavorite } = useFavoriteBarbers();

  return (
    <ScreenLayout>
      <ScreenHeader title={t('favorites.title')} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.center}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surface2 }]}>
              <Icon name="heart" size={32} color={theme.colors.muted2} />
            </View>
            <Text
              style={{
                marginTop: 16,
                fontSize: 15,
                fontWeight: '600',
                color: theme.colors.fg,
                textAlign: 'center',
              }}
            >
              {t('favorites.empty')}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: theme.colors.muted,
                textAlign: 'center',
                paddingHorizontal: 30,
              }}
            >
              {t('favorites.emptyHint')}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favorites.map((barber) => (
              <BarberListRow
                key={barber.id}
                barber={barber}
                isSaved={favoriteIds.has(barber.id)}
                onPress={() => router.push(`/barber/${barber.id}`)}
                onToggleSave={() => toggleFavorite(barber.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 12,
  },
});
