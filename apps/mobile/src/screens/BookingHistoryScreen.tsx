// Booking History screen. Segmented control: upcoming / past.
// Fetches from GET /client/bookings?status=upcoming|past.
// Groups results by week with date-group labels.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Text } from '../atoms/Text';
import { Button } from '../atoms/Button';
import { ScreenHeader } from '../molecules/ScreenHeader';
import { ScreenLayout } from '../templates/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../navigation/GlassTabBar';
import { api, cancelBooking, getBarbers } from '../lib/api';
import { queryKeys, STALE } from '../lib/query';
import {
  formatDurationMinutes,
  formatUZS,
  formatWeekdayShort,
  formatDayMonth,
  formatTimeRange,
  effectiveBookingStatus,
} from '../lib/format';
import type { AppTheme } from '../lib/restyle';

// Statuses the client can still back out of. Declined/cancelled/completed/
// no-show are terminal; a booking whose time already passed can't be
// cancelled either even if the backend never got around to marking it so
// (see isExpiredPending below).
const CANCELLABLE_STATUSES = new Set([
  'pending_confirmation',
  'confirmed',
  'rescheduled',
]);

function isCancellable(item: BookingHistoryItem): boolean {
  return (
    CANCELLABLE_STATUSES.has(item.status) &&
    new Date(item.timestamp).getTime() > Date.now()
  );
}

type Segment = 'upcoming' | 'past';

// Minimal shape from GET /client/bookings?status=... — the wire contract has
// no embedded barber display info, only barber_id, so the name is resolved
// client-side against /client/barbers (see barberById below).
interface BookingHistoryItem {
  id: string;
  timestamp: string;
  status: string;
  barber_id: string;
  services?: Array<{ name: string; price: number; durationMinutes?: number }>;
}

interface BookingsByWeek {
  label: string;
  items: BookingHistoryItem[];
}

// The backend's `upcoming` status filter is status-only (pending_confirmation
// / confirmed / rescheduled) with no timestamp cutoff, so a request the
// barber never answered stays "upcoming" forever once its time passes.
function isExpiredPending(item: BookingHistoryItem): boolean {
  return (
    item.status === 'pending_confirmation' &&
    new Date(item.timestamp).getTime() < Date.now()
  );
}

function weekLabel(
  date: Date,
  t: (key: string) => string,
): string {
  const now = new Date();
  const diffDays = Math.floor(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays >= 0 && diffDays < 7) return t('bookings.thisWeek');
  if (diffDays >= 7 && diffDays < 14) return t('bookings.nextWeek');
  if (diffDays < 0 && diffDays > -7) return t('bookings.thisWeek');
  return t('bookings.earlier');
}

// weekLabel's rolling window treats "within the last 6 days" as part of
// "this week" — fine once expired-pending items have already been moved out
// of the upcoming list (see `items` in the component below), but an expired
// item can still land in the *past* tab's this-week/earlier buckets, where
// it should stand out from genuinely completed/cancelled bookings.
function groupByWeek(
  items: BookingHistoryItem[],
  t: (key: string) => string,
): BookingsByWeek[] {
  const groups: Map<string, BookingHistoryItem[]> = new Map();
  for (const item of items) {
    const label = isExpiredPending(item)
      ? t('bookingStatus.expired')
      : weekLabel(new Date(item.timestamp), t);
    const existing = groups.get(label) ?? [];
    existing.push(item);
    groups.set(label, existing);
  }
  return Array.from(groups.entries()).map(([label, bookings]) => ({
    label,
    items: bookings,
  }));
}

// GET /client/bookings?status=... returns a cursor page — the array lives
// under data.items, not data directly (matches BookingContract's shape from
// @my-barber/types, but we only need the fields BookingHistoryItem uses).
async function fetchBookings(status: Segment): Promise<BookingHistoryItem[]> {
  const r = await api.get<{ ok: boolean; data: { items: BookingHistoryItem[] } }>(
    '/client/bookings',
    { params: { status } },
  );
  return r.data.data?.items ?? [];
}

export const BookingHistoryScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const tabBarPadding = TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_BOTTOM_OFFSET) + 8;
  const [segment, setSegment] = useState<Segment>('upcoming');

  const [activeItem, setActiveItem] = useState<BookingHistoryItem | null>(null);
  const sheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);

  const renderSheetBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    [],
  );

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: () => {
      sheetRef.current?.dismiss();
      void qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: () => {
      Alert.alert(t('common.error'), t('booking.createError'));
    },
  });

  function openDetails(item: BookingHistoryItem) {
    setActiveItem(item);
    sheetRef.current?.present();
  }

  function handleCancel() {
    if (!activeItem) return;
    const bookingId = activeItem.id;
    Alert.alert(
      t('confirmation.cancelConfirmTitle'),
      t('confirmation.cancelConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('confirmation.cancelBooking'),
          style: 'destructive',
          onPress: () => cancelMutation.mutate(bookingId),
        },
      ],
    );
  }

  // Both status buckets are fetched regardless of the active tab — the past
  // tab needs upcomingQuery's data too, to pull out expired-pending items
  // (see `items` below), and this also makes switching tabs instant since
  // neither query re-fires on segment change.
  const upcomingQuery = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => fetchBookings('upcoming'),
    staleTime: 30_000,
  });
  const pastQuery = useQuery({
    queryKey: ['bookings', 'past'],
    queryFn: () => fetchBookings('past'),
    staleTime: 30_000,
  });
  const isLoading = upcomingQuery.isLoading || pastQuery.isLoading;
  const isError = upcomingQuery.isError || pastQuery.isError;
  const refetch = () => {
    upcomingQuery.refetch();
    pastQuery.refetch();
  };

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

  // Move expired-pending bookings out of "upcoming" (where the backend
  // leaves them forever) and into "past" (where they actually belong,
  // sorted back into the timeline by timestamp).
  const items = useMemo(() => {
    const upcomingRaw = upcomingQuery.data ?? [];
    const pastRaw = pastQuery.data ?? [];
    if (segment === 'upcoming') {
      return upcomingRaw.filter((i) => !isExpiredPending(i));
    }
    return [...pastRaw, ...upcomingRaw.filter(isExpiredPending)].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
  }, [segment, upcomingQuery.data, pastQuery.data]);
  const grouped = groupByWeek(items, t);

  return (
    <ScreenLayout>
      <ScreenHeader title={t('bookings.title')} />

      {/* Segmented control — pill shape */}
      <View
        style={[
          styles.segmentWrap,
          {
            backgroundColor: theme.colors.surface2,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {(['upcoming', 'past'] as Segment[]).map((seg) => (
          <Pressable
            key={seg}
            onPress={() => setSegment(seg)}
            style={[
              styles.segment,
              segment === seg && {
                backgroundColor: theme.colors.surface,
                borderRadius: 999,
              },
            ]}
            accessibilityRole="tab"
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: segment === seg ? '600' : '400',
                color:
                  segment === seg ? theme.colors.fg : theme.colors.muted,
              }}
            >
              {seg === 'upcoming' ? t('bookings.upcoming') : t('bookings.past')}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: theme.colors.bg, paddingBottom: tabBarPadding },
        ]}
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
          <View style={styles.empty}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.colors.fg,
                textAlign: 'center',
              }}
            >
              {segment === 'upcoming'
                ? t('bookings.emptyUpcoming')
                : t('bookings.emptyPast')}
            </Text>
            {segment === 'upcoming' ? (
              <>
                <View style={{ height: 12 }} />
                {/* Button's default (non-fullWidth) style hardcodes
                    alignSelf:'flex-start' with no style prop to override it —
                    wrap it so it centers under the empty-state text instead. */}
                <View style={{ alignSelf: 'center' }}>
                  <Button
                    label={t('home.browse')}
                    onPress={() => router.replace('/(tabs)')}
                  />
                </View>
              </>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {grouped.map((group) => (
              <View key={group.label}>
                {/* Week group label */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: theme.colors.muted,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  {group.label}
                </Text>
                <View style={{ gap: 12 }}>
                  {group.items.map((item) => {
                    const start = new Date(item.timestamp);
                    const total = (item.services ?? []).reduce(
                      (sum, s) => sum + s.price,
                      0,
                    );
                    const serviceLabel = (item.services ?? [])
                      .map((s) => s.name)
                      .join(' + ');
                    const barberName = barberById.get(item.barber_id);
                    const { label: statusLabel, tone } = effectiveBookingStatus(
                      item.status,
                      item.timestamp,
                    );
                    const toneColors = {
                      success: theme.colors.success,
                      warning: theme.colors.warning,
                      danger: theme.colors.danger,
                      accent: theme.colors.accent,
                    };

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => openDetails(item)}
                        style={[
                          styles.card,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        {/* Date block */}
                        <View
                          style={[
                            styles.dateBlock,
                            { backgroundColor: theme.colors.accentSoft },
                          ]}
                        >
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

                        {/* Card body */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: theme.colors.fg,
                            }}
                            numberOfLines={1}
                          >
                            {barberName ?? '—'}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.colors.muted,
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {serviceLabel || '—'}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.colors.muted2,
                              marginTop: 2,
                            }}
                          >
                            {`${formatDayMonth(start)} · ${start
                              .getHours()
                              .toString()
                              .padStart(2, '0')}:${start
                              .getMinutes()
                              .toString()
                              .padStart(2, '0')}`}
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

                        {/* Status pill */}
                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: `${toneColors[tone]}20` },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: toneColors[tone],
                            }}
                          >
                            {statusLabel}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Booking detail bottom sheet — sized to its content (enableDynamicSizing)
          rather than a guessed percentage, and BottomSheetModal (portaled via
          BottomSheetModalProvider in app/_layout.tsx) rather than plain
          BottomSheet so it renders above the tab bar instead of clipping
          behind it. */}
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderSheetBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.colors.border,
        }}
      >
        <BottomSheetView style={{ padding: 20, gap: 12 }}>
          {activeItem &&
            (() => {
              const start = new Date(activeItem.timestamp);
              const duration =
                activeItem.services?.reduce(
                  (s, svc) => s + (svc.durationMinutes ?? 45),
                  0,
                ) ?? 45;
              const total = (activeItem.services ?? []).reduce(
                (sum, s) => sum + s.price,
                0,
              );
              const serviceLabel = (activeItem.services ?? [])
                .map((s) => s.name)
                .join(' + ');
              const barberName = barberById.get(activeItem.barber_id);
              const { label: statusLabel, tone } = effectiveBookingStatus(
                activeItem.status,
                activeItem.timestamp,
              );
              const toneColors = {
                success: theme.colors.success,
                warning: theme.colors.warning,
                danger: theme.colors.danger,
                accent: theme.colors.accent,
              };

              return (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 4 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '700',
                        color: theme.colors.fg,
                      }}
                    >
                      {barberName ?? '—'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.colors.muted,
                        marginTop: 4,
                      }}
                    >
                      {serviceLabel || '—'}
                    </Text>
                    <View
                      style={[
                        styles.sheetStatusPill,
                        { backgroundColor: `${toneColors[tone]}20` },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: toneColors[tone],
                        }}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.sheetDetailBox,
                      {
                        backgroundColor: theme.colors.surface2,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.sheetDetailRow}>
                      <Text style={{ fontSize: 13, color: theme.colors.muted }}>
                        {t('booking.date')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color: theme.colors.fg,
                        }}
                      >
                        {formatDayMonth(start)}
                      </Text>
                    </View>
                    <View style={styles.sheetDetailRow}>
                      <Text style={{ fontSize: 13, color: theme.colors.muted }}>
                        {t('booking.time')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color: theme.colors.fg,
                        }}
                      >
                        {formatTimeRange(start, duration)}
                      </Text>
                    </View>
                    <View style={styles.sheetDetailRow}>
                      <Text style={{ fontSize: 13, color: theme.colors.muted }}>
                        {t('requests.duration')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color: theme.colors.fg,
                        }}
                      >
                        {formatDurationMinutes(duration)}
                      </Text>
                    </View>
                    <View style={styles.sheetDetailRow}>
                      <Text style={{ fontSize: 13, color: theme.colors.muted }}>
                        {t('booking.total')}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '500',
                          color: theme.colors.fg,
                        }}
                      >
                        {formatUZS(total)}
                      </Text>
                    </View>
                  </View>

                  {isCancellable(activeItem) ? (
                    <Button
                      variant="destructive"
                      fullWidth
                      label={
                        cancelMutation.isPending
                          ? t('confirmation.cancelling')
                          : t('confirmation.cancelBooking')
                      }
                      onPress={handleCancel}
                      disabled={cancelMutation.isPending}
                      loading={cancelMutation.isPending}
                    />
                  ) : null}
                </>
              );
            })()}
        </BottomSheetView>
      </BottomSheetModal>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    flexGrow: 1,
  },
  center: {
    paddingTop: 60,
    alignItems: 'center',
  },
  empty: {
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
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  sheetStatusPill: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sheetDetailBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  sheetDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
});
