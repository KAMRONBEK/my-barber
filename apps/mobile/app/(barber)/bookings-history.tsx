// Barber Booking History screen — the "Buyurtmalar" stat on the profile tab.
// Segmented upcoming/past view over GET /barber/bookings, split client-side
// since that endpoint has no status filter beyond a single day (mirrors
// src/screens/BookingHistoryScreen.tsx, the client-side equivalent).

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../src/atoms/Text';
import { Button } from '../../src/atoms/Button';
import { ScreenHeader } from '../../src/molecules/ScreenHeader';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { getBarberBookings, type BarberBookingDetail } from '../../src/lib/api';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../src/navigation/BarberTabBar';
import {
  formatUZS,
  formatWeekdayShort,
  formatDayMonth,
  formatTimeOfDay,
  effectiveBookingStatus,
} from '../../src/lib/format';
import type { AppTheme } from '../../src/lib/restyle';

type Segment = 'upcoming' | 'past';

interface BookingsByWeek {
  label: string;
  items: BarberBookingDetail[];
}

function weekLabel(date: Date, t: (key: string) => string): string {
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
// "this week" — correct for the past tab, but on the upcoming tab that
// mislabels an already-passed, still-unanswered pending request as if it
// were a normal this-week appointment. Pull those into their own group
// instead of date-bucketing them (mirrors effectiveBookingStatus's pill).
function groupByWeek(
  items: BarberBookingDetail[],
  t: (key: string) => string,
): BookingsByWeek[] {
  const groups = new Map<string, BarberBookingDetail[]>();
  for (const item of items) {
    const date = new Date(item.timestamp);
    const label =
      item.status === 'pending_confirmation' && date.getTime() < Date.now()
        ? t('bookingStatus.expired')
        : weekLabel(date, t);
    const existing = groups.get(label) ?? [];
    existing.push(item);
    groups.set(label, existing);
  }
  return Array.from(groups.entries()).map(([label, groupItems]) => ({
    label,
    items: groupItems,
  }));
}

export default function BarberBookingsHistoryScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarPadding =
    BARBER_TAB_BAR_PILL_HEIGHT +
    Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) +
    8;
  const [segment, setSegment] = useState<Segment>('upcoming');

  // Shares its query key with (barber)/(tabs)/profile.tsx — one fetch of
  // every booking, split into upcoming/past here.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['barber', 'bookings', 'all'],
    queryFn: () => getBarberBookings(),
    staleTime: 60 * 1000,
  });

  const now = new Date();
  const items = (data ?? [])
    .filter((b) => new Date(b.timestamp) >= now === (segment === 'upcoming'))
    .sort((a, b) => {
      const diff =
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return segment === 'upcoming' ? diff : -diff;
    });
  const grouped = groupByWeek(items, t);

  return (
    <ScreenLayout>
      <ScreenHeader title={t('bookings.title')} />

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
                color: segment === seg ? theme.colors.fg : theme.colors.muted,
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
          { paddingBottom: tabBarPadding },
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
          <View style={styles.center}>
            <Text
              style={{
                fontSize: 15,
                color: theme.colors.muted,
                textAlign: 'center',
              }}
            >
              {segment === 'upcoming'
                ? t('bookings.emptyUpcoming')
                : t('bookings.emptyPast')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {grouped.map((group) => (
              <View key={group.label}>
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
                    const clientName = `${item.clientFirstName} ${item.clientLastName}`.trim();
                    const { label: statusLabel, tone } = effectiveBookingStatus(
                      item.status ?? '',
                      item.timestamp,
                    );
                    const toneColors = {
                      success: theme.colors.success,
                      warning: theme.colors.warning,
                      danger: theme.colors.danger,
                      accent: theme.colors.accent,
                    };

                    return (
                      <View
                        key={item.bookingId}
                        style={[
                          styles.card,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
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

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: theme.colors.fg,
                            }}
                            numberOfLines={1}
                          >
                            {clientName || '—'}
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
                            {`${formatDayMonth(start)} · ${formatTimeOfDay(start)}`}
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

                        {item.status ? (
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
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
    padding: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
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
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
});
