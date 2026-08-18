// Dashboard / Home. Maps OD's 07-dashboard.html:
//   - greeting row with the client's first name
//   - "Upcoming · Today" banner (rendered only if there's an upcoming booking
//     in cache — for the slice we don't ship a server endpoint yet, so it
//     stays optional)
//   - "Yana band qilish" rail — barbers derived from the client's own
//     completed bookings (real visit counts), not the generic banner feed
//   - featured list — top barbers from /client/banner

import React, { useState, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import { Avatar } from '../atoms/Avatar';
import { BarberCard, BarberRailCard } from '../molecules/BarberCard';
import { UpcomingBanner } from '../molecules/UpcomingBanner';
import { ScreenLayout } from '../templates/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../navigation/GlassTabBar';
import {
  getBanner,
  getBarbers,
  getClientCompletedBookings,
  getUnreadNotificationCount,
  api,
  type ApiBarberFull,
} from '../lib/api';
import { useAuthStore } from '../lib/auth';
import { queryKeys, STALE } from '../lib/query';
import {
  formatDayMonth,
  formatWeekdayLong,
} from '../lib/format';
import { fontFamilies } from '@my-barber/ui';
import type { AppTheme } from '../lib/restyle';

export const HomeScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const client = useAuthStore((s) => s.client);
  const insets = useSafeAreaInsets();
  const tabBarPadding = TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_BOTTOM_OFFSET) + 8;

  const bannerQuery = useQuery({
    queryKey: queryKeys.banner,
    queryFn: getBanner,
    staleTime: STALE.banner,
  });

  const featured = (bannerQuery.data ?? []).slice(0, 3);

  // "Book again" rail: real completed-booking history, grouped by barber for
  // a genuine visit count — not the generic banner feed. allBarbersQuery
  // shares BarberShopScreen's query key/cache, used to resolve barber_id ->
  // display info (there's no single get-barber-by-id endpoint yet).
  const completedBookingsQuery = useQuery({
    queryKey: ['client-completed-bookings'],
    queryFn: () => getClientCompletedBookings(30),
    staleTime: STALE.banner,
  });
  const allBarbersQuery = useQuery({
    queryKey: queryKeys.barbers,
    queryFn: () => getBarbers(0, 50),
    staleTime: STALE.banner,
  });
  const railBarbers = useMemo(() => {
    const byBarber = new Map<string, { count: number; lastTimestamp: string }>();
    for (const b of completedBookingsQuery.data ?? []) {
      const existing = byBarber.get(b.barber_id);
      if (existing) {
        existing.count += 1;
        if (b.timestamp > existing.lastTimestamp) existing.lastTimestamp = b.timestamp;
      } else {
        byBarber.set(b.barber_id, { count: 1, lastTimestamp: b.timestamp });
      }
    }
    const allBarbers = allBarbersQuery.data ?? [];
    return Array.from(byBarber.entries())
      .sort((a, b) => (a[1].lastTimestamp < b[1].lastTimestamp ? 1 : -1))
      .slice(0, 4)
      .map(([barberId, info]) => {
        const barber = allBarbers.find((b) => b.id === barberId);
        return barber ? { barber, count: info.count } : null;
      })
      .filter((x): x is { barber: ApiBarberFull; count: number } => x !== null);
  }, [completedBookingsQuery.data, allBarbersQuery.data]);

  const unreadNotificationsQuery = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: getUnreadNotificationCount,
    staleTime: 30 * 1000,
  });
  const hasUnreadNotifications = (unreadNotificationsQuery.data ?? 0) > 0;

  // TODO: fetch the user's next upcoming booking from
  //       GET /client/bookings?status=upcoming&limit=1 once that endpoint ships.
  //       The response shape is { timestamp: string; serviceLabel: string; subtitle: string }.
  const [nextBooking, setNextBooking] = useState<{
    timestamp: string;
    serviceLabel?: string;
    subtitle?: string;
  } | null>(null);
  const [upcomingError, setUpcomingError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchUpcoming() {
      try {
        const r = await api.get<{
          ok: boolean;
          data: { timestamp: string; serviceLabel?: string; subtitle?: string } | null;
        }>('/client/bookings', { params: { status: 'upcoming', limit: 1 } });
        if (!cancelled && r.data?.data) {
          setNextBooking(r.data.data);
        }
      } catch {
        // Endpoint may not exist yet or auth may have failed — signal error so
        // the banner hides rather than showing a misleading "no bookings" state.
        if (!cancelled) setUpcomingError(true);
      }
    }
    void fetchUpcoming();
    return () => { cancelled = true; };
  }, []);

  const today = new Date();

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: theme.colors.bg, paddingBottom: tabBarPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 13,
                letterSpacing: 0.5,
                fontVariant: ['tabular-nums'],
              }}
            >
              {`${formatWeekdayLong(today)} · ${formatDayMonth(today)}`}
            </Text>
            {/* Split greeting: plain bold + italic serif copper first name */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginTop: 6 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: theme.colors.fg,
                  letterSpacing: -0.7,
                }}
              >
                {t('home.greetingPrefix') ?? 'Salom, '}
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: theme.colors.accent,
                  fontStyle: 'italic',
                  fontFamily: fontFamilies.serif,
                  letterSpacing: -0.7,
                }}
              >
                {client?.firstName ?? '—'}
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: theme.colors.fg,
                  letterSpacing: -0.7,
                }}
              >
                {' —'}
              </Text>
            </View>
          </View>

          <View style={styles.greetRight}>
            <Pressable
              onPress={() => router.push('/notifications')}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.colors.surface2,
                  borderColor: theme.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('home.notifications')}
            >
              <Icon name="bell" size={18} color={theme.colors.fg} />
              {hasUnreadNotifications ? (
                <View
                  style={[
                    styles.notifDot,
                    { backgroundColor: theme.colors.accent },
                  ]}
                />
              ) : null}
            </Pressable>
            <Avatar
              size={40}
              uri={client?.avatar ?? undefined}
              initials={`${client?.firstName?.[0] ?? ''}${client?.lastName?.[0] ?? ''}`}
            />
          </View>
        </View>

        {/* Upcoming card — wire to /client/bookings?status=upcoming&limit=1 endpoint.
            When nextBooking is null we render the empty browse-prompt variant.
            When isError is true the banner renders nothing (VIS-004). */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <UpcomingBanner
            bookingTimestamp={nextBooking?.timestamp ?? null}
            serviceLabel={nextBooking?.serviceLabel}
            subtitle={nextBooking?.subtitle}
            isError={upcomingError}
            onPress={() => router.push('/bookings')}
          />
        </View>

        {/* Book again rail */}
        {railBarbers.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: theme.colors.fg,
                }}
              >
                {t('home.bookAgain')}
              </Text>
              <Text style={{ color: theme.colors.accent, fontSize: 13 }}>
                {t('home.seeAll')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {railBarbers.map(({ barber, count }) => (
                <BarberRailCard
                  key={barber.id}
                  barber={barber}
                  visitCountLabel={t('home.seeAllCount', { count })}
                  onPress={() => router.push(`/barber/${barber.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Featured list */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: theme.colors.fg,
              }}
            >
              {t('home.featuredTitle')}
            </Text>
            {(bannerQuery.data ?? []).length > 0 ? (
              <Text style={{ color: theme.colors.accent, fontSize: 13 }}>
                {t('home.seeAllCount', { count: (bannerQuery.data ?? []).length })}
              </Text>
            ) : null}
          </View>

          {bannerQuery.isLoading ? (
            <Text style={{ color: theme.colors.muted }}>
              {t('common.loading')}
            </Text>
          ) : featured.length === 0 ? (
            <Text style={{ color: theme.colors.muted }}>
              {t('common.empty')}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {featured.map((b) => (
                <BarberCard
                  key={b.id}
                  barber={b}
                  onPress={() => router.push(`/barber/${b.id}`)}
                  tags={
                    b.services && b.services.length > 0
                      ? b.services.slice(0, 2).map((s) => s.name)
                      : undefined
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 96,
  },
  greetRow: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greetRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#f7f7f7',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rail: {
    paddingVertical: 4,
    gap: 14,
  },
});
