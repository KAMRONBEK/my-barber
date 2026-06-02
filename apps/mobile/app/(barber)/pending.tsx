import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text } from '../../src/atoms/Text';
import { Icon } from '../../src/atoms/Icon';
import { Badge } from '../../src/atoms/Badge';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { getBarberBookings } from '../../src/lib/api';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../src/navigation/BarberTabBar';
import type { AppTheme } from '../../src/lib/restyle';

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function groupByDay(bookings: any[]) {
  const groups: Record<string, any[]> = {};
  bookings.forEach((b) => {
    const key = isoDate(new Date(b.timestamp));
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });
  return groups;
}

export default function BarberPendingScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const tabBarPadding =
    BARBER_TAB_BAR_PILL_HEIGHT +
    Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) +
    8;

  const bookingsQuery = useQuery({
    queryKey: ['barber-bookings'],
    queryFn: () => getBarberBookings(),
    staleTime: 30_000,
  });

  const bookings = bookingsQuery.data ?? [];
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const sorted = [...confirmed].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const groups = groupByDay(sorted);
  const groupKeys = Object.keys(groups).sort();

  const now = new Date();
  const nextBooking = sorted.find((b) => new Date(b.timestamp) >= now);

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(new Date(weekStart), 6);
  const thisWeek = sorted.filter((b) => {
    const d = new Date(b.timestamp);
    return d >= weekStart && d <= weekEnd;
  });

  const totalHours = thisWeek.reduce((acc, b) => {
    const dur =
      b.services?.reduce(
        (s: number, svc: any) => s + (svc.durationMinutes ?? 45),
        0,
      ) ?? 45;
    return acc + dur / 60;
  }, 0);

  return (
    <ScreenLayout>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: theme.colors.fg,
              letterSpacing: -0.6,
            }}
          >
            {t('pending.title')}
          </Text>
          {sorted.length > 0 && (
            <View
              style={[
                styles.pill,
                {
                  backgroundColor:
                    theme.colors.successSoft ?? 'rgba(34,197,94,0.12)',
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: theme.colors.success },
                ]}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: theme.colors.success,
                }}
              >
                {sorted.length} ta band
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            paddingHorizontal: 20,
            fontSize: 14,
            color: theme.colors.muted,
            marginTop: 4,
          }}
        >
          {t('pending.subtitle')}
        </Text>

        {/* Summary grid */}
        <View style={styles.summary}>
          <View
            style={[
              styles.summaryCell,
              styles.summaryPrimary,
              {
                backgroundColor: theme.colors.fg,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: 0.08,
                color: 'rgba(255,255,255,0.62)',
              }}
            >
              {t('pending.nextAppointment')}
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 22,
                fontWeight: '700',
                color: theme.colors.bg,
              }}
            >
              {nextBooking
                ? new Date(nextBooking.timestamp).toLocaleTimeString('uz-UZ', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--'}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCell,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: 0.08,
                color: theme.colors.muted,
              }}
            >
              {t('pending.thisWeek')}
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 22,
                fontWeight: '700',
                color: theme.colors.fg,
              }}
            >
              {thisWeek.length}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCell,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: 0.08,
                color: theme.colors.muted,
              }}
            >
              {t('pending.hours')}
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 22,
                fontWeight: '700',
                color: theme.colors.fg,
              }}
            >
              {totalHours.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Day groups */}
        {groupKeys.map((key, idx) => {
          const dayBookings = groups[key];
          const date = new Date(key + 'T00:00:00');
          const isToday = date.toDateString() === new Date().toDateString();
          const label = isToday
            ? t('pending.today')
            : date.toLocaleDateString('uz-UZ', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });
          const remaining = dayBookings.filter(
            (b) => new Date(b.timestamp) >= new Date(),
          ).length;

          return (
            <View key={key} style={styles.dayGroup}>
              <View style={styles.dayHead}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.08,
                    color: theme.colors.muted,
                  }}
                >
                  {label}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.muted }}>
                  {remaining} ta qoldi
                </Text>
              </View>
              {dayBookings.map((b) => {
                const isNext =
                  nextBooking && b.bookingId === nextBooking.bookingId;
                const clientName = `${b.clientFirstName} ${b.clientLastName}`;
                const serviceNames =
                  b.services?.map((s: any) => s.name).join(' · ') ?? '';
                const totalPrice =
                  b.services?.reduce(
                    (s: number, svc: any) => s + svc.price,
                    0,
                  ) ?? 0;
                const duration =
                  b.services?.reduce(
                    (s: number, svc: any) =>
                      s + (svc.durationMinutes ?? 45),
                    0,
                  ) ?? 45;
                const d = new Date(b.timestamp);
                const timeStr = d.toLocaleTimeString('uz-UZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View
                    key={b.bookingId}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isNext
                          ? theme.colors.accentSoft ?? 'rgba(234,179,8,0.12)'
                          : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.timeBlock,
                        {
                          backgroundColor: isNext
                            ? theme.colors.accent
                            : theme.colors.surface2,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: isNext
                            ? theme.colors.onAccent
                            : theme.colors.fg,
                        }}
                      >
                        {timeStr}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '500',
                          color: isNext
                            ? 'rgba(255,255,255,0.78)'
                            : theme.colors.muted,
                          marginTop: 4,
                        }}
                      >
                        {duration} {t('common.min').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: isNext
                            ? theme.colors.accent
                            : theme.colors.fg,
                        }}
                      >
                        {clientName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.colors.muted,
                          marginTop: 2,
                        }}
                      >
                        {serviceNames}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: theme.colors.fg,
                          }}
                        >
                          {totalPrice.toLocaleString('uz-UZ')} so'm
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <Pressable
                            style={[
                              styles.iconBtn,
                              {
                                backgroundColor: theme.colors.surface2,
                                borderColor: theme.colors.border,
                              },
                            ]}
                          >
                            <Icon
                              name="mail"
                              size={14}
                              color={theme.colors.muted}
                            />
                          </Pressable>
                          <Pressable
                            style={[
                              styles.iconBtn,
                              {
                                backgroundColor: theme.colors.surface2,
                                borderColor: theme.colors.border,
                              },
                            ]}
                          >
                            <Icon
                              name="phone"
                              size={14}
                              color={theme.colors.muted}
                            />
                          </Pressable>
                          <Pressable
                            style={[
                              styles.iconBtn,
                              {
                                backgroundColor: theme.colors.surface2,
                                borderColor: theme.colors.border,
                              },
                            ]}
                          >
                            <Icon
                              name="more-horizontal"
                              size={14}
                              color={theme.colors.muted}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {sorted.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 14, color: theme.colors.muted }}>
              {t('pending.empty')}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  pill: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summary: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    flexDirection: 'row',
    gap: 8,
  },
  summaryCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  summaryPrimary: {
    flex: 1.4,
    borderColor: 'transparent',
  },
  dayGroup: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  timeBlock: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
