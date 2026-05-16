import React, { useMemo, useState } from 'react';
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
import { Text } from '../../../src/atoms/Text';
import { Icon } from '../../../src/atoms/Icon';
import { Badge } from '../../../src/atoms/Badge';
import { ScreenLayout } from '../../../src/templates/ScreenLayout';
import { getBarberBookings } from '../../../src/lib/api';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../../src/navigation/BarberTabBar';
import type { AppTheme } from '../../../src/lib/restyle';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 09:00 – 20:00

function formatMonthYear(date: Date) {
  return date.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
}

function formatShortWeekday(date: Date) {
  return date.toLocaleDateString('uz-UZ', { weekday: 'short' });
}

function formatDay(date: Date) {
  return date.getDate().toString();
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function parseTime(iso: string) {
  const d = new Date(iso);
  return { hour: d.getHours(), minute: d.getMinutes() };
}

function getWeekStart(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export default function BarberCalendarScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const tabBarPadding =
    BARBER_TAB_BAR_PILL_HEIGHT +
    Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) +
    8;

  const dateStr = isoDate(selectedDate);

  const bookingsQuery = useQuery({
    queryKey: ['barber-bookings', dateStr],
    queryFn: () => getBarberBookings(dateStr),
    staleTime: 30_000,
  });

  const bookings = bookingsQuery.data ?? [];

  const weekStart = getWeekStart(new Date(selectedDate));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayBookings = bookings.filter((b) => {
    const d = new Date(b.timestamp);
    return d.toDateString() === selectedDate.toDateString();
  });

  const totalHours = useMemo(() => {
    return todayBookings.reduce((acc, b) => {
      const dur =
        b.services?.reduce((s, svc) => s + (svc.durationMinutes ?? 45), 0) ??
        45;
      return acc + dur / 60;
    }, 0);
  }, [todayBookings]);

  const earningsToday = todayBookings.reduce((acc, b) => {
    return (
      acc + (b.services?.reduce((s, svc) => s + (svc.price ?? 0), 0) ?? 0)
    );
  }, 0);

  const bookingDotsForDay = (d: Date) => {
    const dayStr = d.toDateString();
    const count = bookings.filter(
      (b) => new Date(b.timestamp).toDateString() === dayStr,
    ).length;
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    return 3;
  };

  const goPrevMonth = () => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() - 1);
      return nd;
    });
  };

  const goNextMonth = () => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + 1);
      return nd;
    });
  };

  const goToday = () => setSelectedDate(new Date());

  return (
    <ScreenLayout>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goPrevMonth} style={styles.iconBtn}>
            <Icon name="chevron-left" size={18} color={theme.colors.fg} />
          </Pressable>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: theme.colors.fg,
              letterSpacing: -0.4,
            }}
          >
            {formatMonthYear(selectedDate)}
          </Text>
          <Pressable onPress={goNextMonth} style={styles.iconBtn}>
            <Icon name="chevron-right" size={18} color={theme.colors.fg} />
          </Pressable>
        </View>

        {/* Stat strip */}
        <View style={styles.statStrip}>
          <View
            style={[
              styles.statCell,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
              {t('calendar.todayBookings')}
            </Text>
            <Text
              style={[styles.statValue, { color: theme.colors.fg }]}
            >
              {todayBookings.length}{' '}
              <Text style={{ color: theme.colors.accent }}>marta</Text>
            </Text>
          </View>
          <View
            style={[
              styles.statCell,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
              {t('calendar.hoursBooked')}
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.fg }]}>
              {totalHours.toFixed(1)}{' '}
              <Text style={{ color: theme.colors.accent }}>soat</Text>
            </Text>
          </View>
          <View
            style={[
              styles.statCell,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
              {t('calendar.earnings')}
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.fg }]}>
              {earningsToday.toLocaleString('uz-UZ')}
            </Text>
          </View>
        </View>

        {/* Week strip */}
        <View style={styles.weekStrip}>
          {weekDays.map((d, i) => {
            const isActive = d.toDateString() === selectedDate.toDateString();
            const dots = bookingDotsForDay(d);
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedDate(new Date(d))}
                style={[
                  styles.weekDay,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: isActive
                      ? theme.colors.accent
                      : theme.colors.surface,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '500',
                    color: isActive ? theme.colors.onAccent : theme.colors.muted,
                    textTransform: 'uppercase',
                  }}
                >
                  {formatShortWeekday(d)}
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 18,
                    fontWeight: '700',
                    color: isActive ? theme.colors.onAccent : theme.colors.fg,
                  }}
                >
                  {formatDay(d)}
                </Text>
                {dots > 0 && (
                  <View style={styles.dotRow}>
                    {Array.from({ length: dots }).map((_, j) => (
                      <View
                        key={j}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: isActive
                              ? theme.colors.onAccent
                              : theme.colors.accent,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Today button */}
        <Pressable onPress={goToday} style={{ alignSelf: 'flex-end', marginRight: 20, marginTop: 4 }}>
          <Badge label={t('calendar.today')} tone="accent" />
        </Pressable>

        {/* Timeline head */}
        <View style={styles.timelineHead}>
          <View>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: theme.colors.fg,
              }}
            >
              {selectedDate.toLocaleDateString('uz-UZ', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: theme.colors.muted }}>
              {todayBookings.length} ta tasdiqlangan
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: theme.colors.success,
                }}
              />
              <Text style={{ fontSize: 10, color: theme.colors.muted }}>
                Band
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: theme.colors.warning,
                }}
              />
              <Text style={{ fontSize: 10, color: theme.colors.muted }}>
                Kutilmoqda
              </Text>
            </View>
          </View>
        </View>

        {/* Day timeline */}
        <View style={styles.timeline}>
          {HOURS.map((hour) => {
            const hourBookings = todayBookings.filter((b) => {
              const { hour: h } = parseTime(b.timestamp);
              return h === hour;
            });

            return (
              <View
                key={hour}
                style={[
                  styles.hourRow,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Text
                  style={{
                    width: 48,
                    fontSize: 11,
                    fontWeight: '600',
                    color: theme.colors.muted,
                  }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </Text>
                <View style={{ flex: 1, gap: 4 }}>
                  {hourBookings.map((b) => {
                    const isConfirmed = b.status === 'confirmed';
                    const clientName = `${b.clientFirstName} ${b.clientLastName}`;
                    const serviceNames =
                      b.services?.map((s) => s.name).join(' + ') ?? '';
                    const { minute } = parseTime(b.timestamp);
                    const duration =
                      b.services?.reduce(
                        (s, svc) => s + (svc.durationMinutes ?? 45),
                        0,
                      ) ?? 45;
                    const end = new Date(b.timestamp);
                    end.setMinutes(end.getMinutes() + duration);
                    const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

                    return (
                      <View
                        key={b.bookingId}
                        style={[
                          styles.bookingBlock,
                          {
                            backgroundColor: isConfirmed
                              ? theme.colors.successSoft ?? 'rgba(34,197,94,0.12)'
                              : theme.colors.warningSoft ?? 'rgba(234,179,8,0.12)',
                            borderLeftWidth: 3,
                            borderLeftColor: isConfirmed
                              ? theme.colors.success
                              : theme.colors.warning,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: theme.colors.fg,
                          }}
                        >
                          {clientName}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.colors.muted,
                            marginTop: 2,
                          }}
                        >
                          {`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} – ${endStr} · ${serviceNames}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statStrip: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  statValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
  },
  weekStrip: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 6,
  },
  weekDay: {
    flex: 1,
    aspectRatio: 1 / 1.15,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dotRow: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  timelineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  timeline: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  bookingBlock: {
    borderRadius: 8,
    padding: 8,
    marginVertical: 2,
  },
});
