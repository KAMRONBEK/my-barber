// Completed-cuts history — the "Soch olish" stat on the profile screen.
// Fetches GET /client/bookings?status=completed (same endpoint/shape as
// BookingHistoryScreen's segmented view, just pre-filtered to one status so
// there's no segment control to show).

import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { Button } from '../src/atoms/Button';
import { ScreenHeader } from '../src/molecules/ScreenHeader';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../src/navigation/GlassTabBar';
import { COMPLETED_CUTS_QUERY_KEY, fetchCompletedCuts } from '../src/lib/bookings';
import { getBarbers } from '../src/lib/api';
import { queryKeys, STALE } from '../src/lib/query';
import { formatUZS, formatWeekdayShort, formatDayMonth } from '../src/lib/format';
import type { AppTheme } from '../src/lib/restyle';

export default function CutsHistoryScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarPadding = TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_BOTTOM_OFFSET) + 8;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: COMPLETED_CUTS_QUERY_KEY,
    queryFn: fetchCompletedCuts,
    staleTime: 30_000,
  });

  // Shares BarberShopScreen/HomeScreen's query key/cache — used only to
  // resolve barber_id -> display name (there's no get-barber-by-id endpoint).
  const barbersQuery = useQuery({
    queryKey: queryKeys.barbers,
    queryFn: () => getBarbers(0, 50),
    staleTime: STALE.banner,
  });
  const barberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of barbersQuery.data ?? []) {
      map.set(b.id, `${b.firstName} ${b.lastName}`.trim());
    }
    return map;
  }, [barbersQuery.data]);

  const items = data ?? [];

  return (
    <ScreenLayout>
      <ScreenHeader title={t('cutsHistory.title')} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={{ color: theme.colors.danger, marginBottom: 12 }}>
              {t('common.error')}
            </Text>
            <View style={{ alignSelf: 'center' }}>
              <Button label={t('common.retry')} onPress={() => refetch()} />
            </View>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text
              style={{
                fontSize: 15,
                color: theme.colors.muted,
                textAlign: 'center',
              }}
            >
              {t('cutsHistory.empty')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {items.map((item) => {
              const start = new Date(item.timestamp);
              const total = (item.services ?? []).reduce((sum, s) => sum + s.price, 0);
              const serviceLabel = (item.services ?? []).map((s) => s.name).join(' + ');

              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={[styles.dateBlock, { backgroundColor: theme.colors.accentSoft }]}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '700',
                        color: theme.colors.accent,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {start.getDate().toString().padStart(2, '0')}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '600',
                        color: theme.colors.accent,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                      }}
                    >
                      {formatWeekdayShort(start)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: '700', color: theme.colors.fg }}
                      numberOfLines={1}
                    >
                      {barberById.get(item.barber_id) ?? '—'}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {serviceLabel || '—'}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.muted2, marginTop: 2 }}>
                      {formatDayMonth(start)}
                    </Text>
                    {total > 0 ? (
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: theme.colors.fg,
                          marginTop: 4,
                        }}
                      >
                        {formatUZS(total)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateBlock: {
    width: 52,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
