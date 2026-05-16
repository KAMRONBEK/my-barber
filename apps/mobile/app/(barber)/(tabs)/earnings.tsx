// Barber Earnings screen.
// Month navigation, hero earnings card, bar chart breakdown, transaction list.

import React, { useMemo, useState } from 'react';
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
import { Text } from '../../../src/atoms/Text';
import { Badge } from '../../../src/atoms/Badge';
import { Icon } from '../../../src/atoms/Icon';
import { ScreenLayout } from '../../../src/templates/ScreenLayout';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../../src/navigation/BarberTabBar';
import { getBarberEarnings, type EarningsResponse } from '../../../src/lib/api';
import type { AppTheme } from '../../../src/lib/restyle';

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function monthYearLabel(d: Date, t: (k: string) => string) {
  const months = [
    'month.0',
    'month.1',
    'month.2',
    'month.3',
    'month.4',
    'month.5',
    'month.6',
    'month.7',
    'month.8',
    'month.9',
    'month.10',
    'month.11',
  ];
  return `${t(months[d.getMonth()])} ${d.getFullYear()}`;
}

export default function BarberEarningsScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const from = formatISODate(cursor);
  const to = formatISODate(endOfMonth(cursor));

  const query = useQuery<EarningsResponse, Error>({
    queryKey: ['barber-earnings', from, to],
    queryFn: () => getBarberEarnings(from, to),
    staleTime: 60 * 1000,
  });

  const data = query.data;

  const tabBarPadding =
    BARBER_TAB_BAR_PILL_HEIGHT +
    Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) +
    8;

  function prevMonth() {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const maxDaily = useMemo(() => {
    if (!data?.daily?.length) return 0;
    return Math.max(...data.daily.map((d) => d.gross_total));
  }, [data]);

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: theme.colors.fg,
            }}
          >
            {t('tabs.earnings')}
          </Text>
        </View>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <Pressable
            onPress={prevMonth}
            style={[
              styles.monthArrow,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Icon name="back" size={18} color={theme.colors.fg} />
          </Pressable>

          <View
            style={[
              styles.monthPill,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: theme.colors.fg,
              }}
            >
              {monthYearLabel(cursor, t)}
            </Text>
          </View>

          <Pressable
            onPress={nextMonth}
            style={[
              styles.monthArrow,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
            accessibilityRole="button"
          >
            <Icon name="arrow-right" size={18} color={theme.colors.fg} />
          </Pressable>
        </View>

        {query.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : query.isError ? (
          <View style={styles.centered}>
            <Text style={{ color: theme.colors.danger }}>
              {t('common.error')}
            </Text>
          </View>
        ) : data ? (
          <>
            {/* Hero card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: theme.colors.muted,
                  marginBottom: 6,
                }}
              >
                {t('earnings.totalEarnings')}
              </Text>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '700',
                  color: theme.colors.fg,
                  letterSpacing: -0.8,
                }}
              >
                {data.summary.gross_total.toLocaleString('ru-RU')}{' '}
                {t('common.sum')}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                <Badge
                  label={`${data.summary.completed_bookings} ${t('earnings.completed')}`}
                  tone="success"
                />
                {data.summary.cancelled_bookings > 0 ? (
                  <Badge
                    label={`${data.summary.cancelled_bookings} ${t('earnings.cancelled')}`}
                    tone="danger"
                  />
                ) : null}
              </View>
            </View>

            {/* Bar chart */}
            {data.daily.length > 0 ? (
              <View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: theme.colors.muted,
                    marginBottom: 14,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {t('earnings.dailyBreakdown')}
                </Text>
                <View style={styles.barsRow}>
                  {data.daily.map((day, idx) => {
                    const heightPct =
                      maxDaily > 0
                        ? Math.max(8, (day.gross_total / maxDaily) * 100)
                        : 8;
                    const dateObj = new Date(day.date);
                    const dayNum = dateObj.getDate();
                    const weekday = t(`weekday.short.${dateObj.getDay()}`);
                    return (
                      <View key={idx} style={styles.barCol}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${heightPct}%`,
                                backgroundColor: theme.colors.accent,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            color: theme.colors.muted2,
                            fontWeight: '500',
                          }}
                        >
                          {weekday}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.colors.muted,
                            fontWeight: '600',
                          }}
                        >
                          {dayNum}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Transaction list */}
            <View style={styles.sectionHeader}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: theme.colors.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {t('earnings.recentWork')}
              </Text>
            </View>

            {data.bookings.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ color: theme.colors.muted }}>
                  {t('earnings.empty')}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.listCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {data.bookings.map((b, idx) => {
                  const isCompleted = b.status === 'completed';
                  const dateObj = new Date(b.timestamp);
                  const timeStr = dateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <View
                      key={b.booking_id}
                      style={[
                        styles.txRow,
                        {
                          borderTopColor: theme.colors.border,
                          borderTopWidth:
                            idx > 0 ? StyleSheet.hairlineWidth : 0,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.txIcon,
                          {
                            backgroundColor: isCompleted
                              ? theme.colors.successSoft
                              : theme.colors.warningSoft,
                          },
                        ]}
                      >
                        <Icon
                          name="check"
                          size={14}
                          color={
                            isCompleted
                              ? theme.colors.success
                              : theme.colors.warning
                          }
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '600',
                            color: theme.colors.fg,
                          }}
                        >
                          {b.client_name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.colors.muted,
                            marginTop: 2,
                          }}
                        >
                          {timeStr}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: isCompleted
                            ? theme.colors.success
                            : theme.colors.fg,
                        }}
                      >
                        +{b.service_total.toLocaleString('ru-RU')}{' '}
                        {t('common.sum')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPill: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  heroCard: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chartCard: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  sectionHeader: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyBox: {
    marginHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  listCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
