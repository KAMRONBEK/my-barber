import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Text } from '../../../src/atoms/Text';
import { Icon } from '../../../src/atoms/Icon';
import { Button } from '../../../src/atoms/Button';
import { ScreenLayout } from '../../../src/templates/ScreenLayout';
import {
  getBarberBookings,
  getUnreadNotificationCount,
  patchBookingStatus,
} from '../../../src/lib/api';
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatDurationMinutes,
  formatTimeRange,
  formatUZS,
} from '../../../src/lib/format';
import { hapticToggle } from '../../../src/lib/haptics';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../../src/navigation/BarberTabBar';
import type { AppTheme } from '../../../src/lib/restyle';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 09:00 – 20:00

// Local calendar date, not UTC — .toISOString() converts through UTC first,
// which rolls a local midnight back to the previous day in any timezone
// ahead of UTC (e.g. UTC+5). Day cells in the week strip are normalized to
// local midnight (see getWeekStartNormalized), so using toISOString() here
// meant re-selecting a day (including "today" after navigating away) could
// silently query bookings for the wrong date.
function isoDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTime(iso: string) {
  const d = new Date(iso);
  return { hour: d.getHours(), minute: d.getMinutes() };
}

function getWeekStart(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const nd = new Date(d);
  nd.setDate(diff);
  return nd;
}

function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthYearLabel(d: Date, t: (k: string) => string) {
  const months = [
    'month.0', 'month.1', 'month.2', 'month.3', 'month.4', 'month.5',
    'month.6', 'month.7', 'month.8', 'month.9', 'month.10', 'month.11',
  ];
  const monthName = t(months[d.getMonth()]);
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized} ${d.getFullYear()}`;
}

function getWeekStartNormalized(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return getWeekStart(nd);
}

interface WeekDayItemProps {
  date: Date;
  selected: boolean;
  dots: number;
  isPast: boolean;
  onPress: (date: Date) => void;
}

const WeekDayItem = React.memo(function WeekDayItem({
  date,
  selected,
  dots,
  isPast,
  onPress,
}: WeekDayItemProps) {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => onPress(date)}
      style={[
        styles.weekDay,
        {
          borderColor: theme.colors.border,
          backgroundColor: selected
            ? theme.colors.accent
            : theme.colors.surface,
          opacity: isPast && !selected ? 0.6 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '500',
          color: selected ? theme.colors.onAccent : theme.colors.muted,
          textTransform: 'uppercase',
        }}
      >
        {t(`weekday.short.${date.getDay()}`)}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontSize: 18,
          fontWeight: '700',
          color: selected ? theme.colors.onAccent : theme.colors.fg,
          fontVariant: ['tabular-nums'],
        }}
      >
        {date.getDate()}
      </Text>
      {dots > 0 && (
        <View style={styles.dotRow}>
          {Array.from({ length: dots }).map((_, j) => (
            <View
              key={j}
              style={[
                styles.dot,
                {
                  backgroundColor: selected
                    ? theme.colors.onAccent
                    : theme.colors.accent,
                  opacity: j < dots - 1 ? 0.4 : 1,
                },
              ]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
});

export default function BarberCalendarScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadNotificationCount,
    staleTime: 15_000,
  });
  const hasUnreadNotifications = (unreadQuery.data ?? 0) > 0;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const sheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);
  const scrollRef = useRef<ScrollView>(null);

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

  const tabBarPadding =
    BARBER_TAB_BAR_PILL_HEIGHT +
    Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) +
    8;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const dateStr = isoDate(selectedDate);

  const bookingsQuery = useQuery({
    queryKey: ['barber-bookings', dateStr],
    queryFn: () => getBarberBookings(dateStr),
    staleTime: 30_000,
  });

  const bookings = bookingsQuery.data ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    hapticToggle();
    setRefreshing(true);
    try {
      await bookingsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [bookingsQuery]);

  // Week slider data is computed below in the component body.

  const todayBookings = useMemo(
    () =>
      bookings.filter((b) => isSameDay(new Date(b.timestamp), selectedDate)),
    [bookings, selectedDate]
  );

  const totalHours = useMemo(() => {
    return todayBookings.reduce((acc, b) => {
      const dur =
        b.services?.reduce((s: number, svc: any) => s + (svc.durationMinutes ?? 45), 0) ?? 45;
      return acc + dur / 60;
    }, 0);
  }, [todayBookings]);

  const earningsToday = useMemo(() => {
    return todayBookings.reduce((acc, b) => {
      return acc + (b.services?.reduce((s: number, svc: any) => s + (svc.price ?? 0), 0) ?? 0);
    }, 0);
  }, [todayBookings]);

  const bookingCountsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const key = new Date(b.timestamp).toDateString();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [bookings]);

  const bookingDotsForDay = useCallback(
    (d: Date) => {
      const count = bookingCountsByDay.get(d.toDateString()) ?? 0;
      if (count === 0) return 0;
      if (count <= 2) return 1;
      if (count <= 4) return 2;
      return 3;
    },
    [bookingCountsByDay]
  );

  const goPrevMonth = () => {
    isUserScrollingRef.current = false;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() - 1);
      return nd;
    });
  };

  const goNextMonth = () => {
    isUserScrollingRef.current = false;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + 1);
      return nd;
    });
  };

  const goToday = () => {
    isUserScrollingRef.current = false;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    const today = new Date();
    setSelectedDate(today);
    setTimeout(() => {
      const hour = today.getHours();
      if (hour >= 9 && hour <= 20) {
        const y = (hour - 9) * 64;
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
      }
    }, 300);
  };

  // --- Horizontally scrollable week slider ---
  const { width: screenWidth } = useWindowDimensions();
  const weekPageWidth = screenWidth - 40; // paddingHorizontal 20*2

  const WEEKS_BEFORE = 26;
  const WEEKS_AFTER = 26;
  const TOTAL_WEEKS = WEEKS_BEFORE + WEEKS_AFTER + 1;

  const weeksData = useMemo(() => {
    const today = new Date();
    const currentWeekStart = getWeekStartNormalized(today);
    return Array.from({ length: TOTAL_WEEKS }, (_, i) =>
      addDays(new Date(currentWeekStart), (i - WEEKS_BEFORE) * 7)
    );
  }, []);

  const getIndexForDate = useCallback(
    (date: Date) => {
      const targetWeekStart = getWeekStartNormalized(date);
      const anchorWeekStart = weeksData[WEEKS_BEFORE];
      const diffDays = Math.round(
        (targetWeekStart.getTime() - anchorWeekStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const diffWeeks = Math.round(diffDays / 7);
      const index = WEEKS_BEFORE + diffWeeks;
      return Math.max(0, Math.min(TOTAL_WEEKS - 1, index));
    },
    [weeksData]
  );

  const flatListRef = useRef<FlatList<Date>>(null);
  const visibleIndexRef = useRef<number>(WEEKS_BEFORE);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll week slider when selectedDate changes (e.g. month nav, goToday)
  useEffect(() => {
    if (isUserScrollingRef.current) return;
    const targetIndex = getIndexForDate(selectedDate);
    if (targetIndex !== visibleIndexRef.current) {
      visibleIndexRef.current = targetIndex;
      // Defer to avoid race with FlatList layout
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true });
      });
    }
  }, [selectedDate, getIndexForDate]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      const index = Math.round(x / weekPageWidth);
      if (index < 0 || index >= TOTAL_WEEKS) return;
      if (index === visibleIndexRef.current) return;
      visibleIndexRef.current = index;
      const newWeekStart = weeksData[index];
      const dayIndex =
        selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;
      const newSelected = addDays(new Date(newWeekStart), dayIndex);
      setSelectedDate(newSelected);
    },
    [weekPageWidth, weeksData, selectedDate]
  );

  const handleScrollBeginDrag = useCallback(() => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    // Clear user-scroll flag after momentum settles.
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 500);
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScrollEnd(event);
      isUserScrollingRef.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    },
    [handleScrollEnd]
  );

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);

  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(new Date(date));
  }, []);

  const renderWeekItem = useCallback(
    ({ item: weekStart }: { item: Date }) => {
      const days = Array.from({ length: 7 }, (_, i) =>
        addDays(new Date(weekStart), i)
      );
      return (
        <View style={{ width: weekPageWidth, flexDirection: 'row', gap: 6 }}>
          {days.map((d) => {
            const active = isSameDay(d, selectedDate);
            const dots = bookingDotsForDay(d);
            const isPast = d < todayStart;
            return (
              <WeekDayItem
                key={d.toISOString()}
                date={d}
                selected={active}
                dots={dots}
                isPast={isPast}
                onPress={handleDayPress}
              />
            );
          })}
        </View>
      );
    },
    [weekPageWidth, selectedDate, bookingDotsForDay, todayStart, handleDayPress]
  );

  const showBookingActions = (booking: any) => {
    setActiveBooking(booking);
    sheetRef.current?.present();
  };

  const handleCancelBooking = () => {
    if (!activeBooking) return;
    sheetRef.current?.dismiss();
    Alert.alert(
      t('confirmation.cancelConfirmTitle'),
      t('confirmation.cancelConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('confirmation.cancelBooking'),
          style: 'destructive',
          onPress: async () => {
            try {
              await patchBookingStatus(activeBooking.bookingId, 'cancelled');
              bookingsQuery.refetch();
            } catch {
              Alert.alert(t('common.error'), t('booking.createError'));
            }
          },
        },
      ]
    );
  };

  const handleBlockTime = (hour: number) => {
    Alert.alert(
      'Vaqtni bloklash',
      `${hour}:00 – ${hour + 1}:00 vaqtini bloklashni xohlaysizmi?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Bloklash',
          onPress: () => {
            // TODO: wire to availability API when ready
          },
        },
      ]
    );
  };

  const isToday = isSameDay(selectedDate, now);
  const nowHour = now.getHours();
  const nowMinute = now.getMinutes();

  return (
    <ScreenLayout>
      {/* Fixed header — stays put while the content below scrolls */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable onPress={goPrevMonth} style={styles.iconBtn}>
            <Icon name="chevron-left" size={18} color={theme.colors.fg} />
          </Pressable>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: theme.colors.fg,
              letterSpacing: -0.4,
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            {monthYearLabel(selectedDate, t)}
          </Text>
          <Pressable onPress={goNextMonth} style={styles.iconBtn}>
            <Icon name="chevron-right" size={18} color={theme.colors.fg} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={goToday}
            style={[
              styles.todayBtn,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.colors.accent,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: theme.colors.fg,
              }}
            >
              {t('calendar.today')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/notifications')}
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
                borderWidth: StyleSheet.hairlineWidth,
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
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* index 0: Stats (scrollable) */}
        <View>
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
              <Text style={[styles.statValue, { color: theme.colors.fg }]}>
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
        </View>

        {/* index 1: Week strip (STICKY) */}
        <View
          style={{
            backgroundColor: theme.colors.bg,
            paddingHorizontal: 20,
          }}
        >
          <FlatList
            ref={flatListRef}
            data={weeksData}
            horizontal
            pagingEnabled
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            initialScrollIndex={WEEKS_BEFORE}
            getItemLayout={(_, index) => ({
              length: weekPageWidth,
              offset: weekPageWidth * index,
              index,
            })}
            keyExtractor={(_, index) => `week-${index}`}
            renderItem={renderWeekItem}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            maintainVisibleContentPosition={undefined}
          />
        </View>

        {/* index 2: Timeline (scrollable) */}
        <View>
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
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  color: theme.colors.muted,
                }}
              >
                {todayBookings.filter((b) => b.status === 'confirmed').length} ta{' '}
                tasdiqlangan,{' '}
                {todayBookings.filter((b) => b.status === 'pending_confirmation').length}{' '}
                ta kutilmoqda
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
                <Text style={{ fontSize: 10, color: theme.colors.muted }}>Band</Text>
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
                <Pressable
                  key={hour}
                  onLongPress={() => handleBlockTime(hour)}
                  delayLongPress={400}
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
                        b.services?.map((s: any) => s.name).join(' + ') ?? '';
                      const { minute } = parseTime(b.timestamp);
                      const duration =
                        b.services?.reduce(
                          (s: number, svc: any) => s + (svc.durationMinutes ?? 45),
                          0
                        ) ?? 45;
                      const end = new Date(b.timestamp);
                      end.setMinutes(end.getMinutes() + duration);
                      const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

                      return (
                        <Pressable
                          key={b.bookingId}
                          onPress={() => showBookingActions(b)}
                          onLongPress={() => showBookingActions(b)}
                          delayLongPress={300}
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
                            {`${hour.toString().padStart(2, '0')}:${minute
                              .toString()
                              .padStart(2, '0')} – ${endStr} · ${serviceNames}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* NOW line */}
                  {isToday && nowHour === hour && (
                    <View
                      style={[
                        styles.nowLine,
                        {
                          top: (nowMinute / 60) * 64 + 4,
                          backgroundColor: theme.colors.danger,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.nowDot,
                          {
                            backgroundColor: theme.colors.danger,
                            shadowColor: theme.colors.danger,
                          },
                        ]}
                      />
                      <Text
                        style={{
                          position: 'absolute',
                          left: -44,
                          top: -16,
                          fontSize: 10,
                          fontWeight: '700',
                          color: theme.colors.danger,
                        }}
                      >
                        HOZIR · {nowHour.toString().padStart(2, '0')}:{nowMinute.toString().padStart(2, '0')}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Booking actions bottom sheet — sized to its content (enableDynamicSizing)
          rather than a guessed percentage, and BottomSheetModal (portaled via
          BottomSheetModalProvider in app/_layout.tsx) rather than plain
          BottomSheet so it renders above the tab bar instead of clipping
          behind it. */}
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderSheetBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
        }}
        handleIndicatorStyle={{
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.colors.border,
        }}
      >
        <BottomSheetView style={{ padding: 20, gap: 12 }}>
          {activeBooking && (
            <>
              {(() => {
                const duration: number =
                  activeBooking.services?.reduce(
                    (s: number, svc: any) => s + (svc.durationMinutes ?? 45),
                    0,
                  ) ?? 45;
                const price: number =
                  activeBooking.services?.reduce(
                    (s: number, svc: any) => s + (svc.price ?? 0),
                    0,
                  ) ?? 0;
                const toneColors = {
                  success: theme.colors.success,
                  danger: theme.colors.danger,
                  accent: theme.colors.accent,
                };
                const tone = bookingStatusTone(activeBooking.status);

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
                        {activeBooking.clientFirstName} {activeBooking.clientLastName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.colors.muted,
                          marginTop: 4,
                        }}
                      >
                        {activeBooking.services
                          ?.map((s: any) => s.name)
                          .join(' + ') ?? ''}
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
                          {bookingStatusLabel(activeBooking.status)}
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
                          {t('requests.when')}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color: theme.colors.fg,
                          }}
                        >
                          {formatTimeRange(new Date(activeBooking.timestamp), duration)}
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
                          {formatUZS(price)}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()}

              {activeBooking.status !== 'cancelled' && (
                <Button
                  variant="destructive"
                  label={t('confirmation.cancelBooking')}
                  onPress={handleCancelBooking}
                  fullWidth
                />
              )}
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
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
    backgroundColor: 'transparent',
    position: 'relative',
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
  todayBtn: {
    height: 36,
    borderRadius: 999,
    paddingHorizontal: 14,
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
  weekNavBtn: {
    width: 28,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 80,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    position: 'relative',
  },
  bookingBlock: {
    borderRadius: 8,
    padding: 8,
    marginVertical: 2,
  },
  nowLine: {
    position: 'absolute',
    left: 48,
    right: 0,
    height: 1,
    zIndex: 4,
  },
  nowDot: {
    position: 'absolute',
    left: -4,
    top: -3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
