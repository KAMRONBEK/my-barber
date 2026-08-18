import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../../src/atoms/Text';
import { Button } from '../../../src/atoms/Button';
import { Badge } from '../../../src/atoms/Badge';
import { ScreenLayout } from '../../../src/templates/ScreenLayout';
import { getBarberBookings, patchBookingStatus } from '../../../src/lib/api';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../../src/navigation/BarberTabBar';
import type { AppTheme } from '../../../src/lib/restyle';

type FilterTab = 'incoming' | 'declined';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hozir';
  if (mins < 60) return `${mins} min oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

export default function BarberRequestsScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('incoming');

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

  const filtered = bookings.filter((b) => {
    if (activeTab === 'incoming') return b.status === 'pending_confirmation';
    return b.status === 'declined';
  });

  const incomingCount = bookings.filter(
    (b) => b.status === 'pending_confirmation',
  ).length;

  const confirmMutation = useMutation({
    mutationFn: (bookingId: string) =>
      patchBookingStatus(bookingId, 'confirmed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-bookings'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (bookingId: string) =>
      patchBookingStatus(bookingId, 'declined'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-bookings'] });
    },
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'incoming', label: t('requests.incoming') },
    { key: 'declined', label: t('requests.declined') },
  ];

  return (
    <ScreenLayout>
      {/* Fixed header — stays put while the content below scrolls */}
      <View style={styles.header}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: theme.colors.fg,
            letterSpacing: -0.6,
          }}
        >
          {t('requests.title')}
        </Text>
        {incomingCount > 0 && (
          <View style={styles.countBadge}>
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.colors.accent },
              ]}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: theme.colors.accent,
              }}
            >
              {incomingCount} ta yangi
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          paddingHorizontal: 20,
          fontSize: 14,
          color: theme.colors.muted,
          marginTop: 2,
        }}
      >
        {t('requests.subtitle')}
      </Text>

      {/* Fixed tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: isActive
                    ? theme.colors.fg
                    : theme.colors.surface,
                  borderColor: isActive
                    ? 'transparent'
                    : theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: isActive ? theme.colors.bg : theme.colors.muted,
                }}
              >
                {tab.label}
              </Text>
              {tab.key === 'incoming' && incomingCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isActive
                        ? theme.colors.accent
                        : theme.colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: theme.colors.onAccent,
                    }}
                  >
                    {incomingCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
      >
        {/* Request list */}
        <View style={styles.list}>
          {filtered.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
                {t('requests.empty')}
              </Text>
            </View>
          )}
          {filtered.map((b) => {
            const clientName = `${b.clientFirstName} ${b.clientLastName}`;
            const serviceNames =
              b.services?.map((s) => s.name).join(' + ') ?? '';
            const totalPrice =
              b.services?.reduce((s, svc) => s + svc.price, 0) ?? 0;
            const duration =
              b.services?.reduce(
                (s, svc) => s + (svc.durationMinutes ?? 45),
                0,
              ) ?? 45;
            const date = new Date(b.timestamp);
            const dateStr = date.toLocaleDateString('uz-UZ', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
            const timeStr = date.toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View
                key={b.bookingId}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {/* Head */}
                <View style={styles.cardHead}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: theme.colors.surface2,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: theme.colors.fg,
                      }}
                    >
                      {clientName.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: theme.colors.fg,
                        }}
                      >
                        {clientName}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.colors.muted,
                        marginTop: 2,
                      }}
                    >
                      {timeAgo(b.timestamp)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: theme.colors.fg,
                    }}
                  >
                    {totalPrice.toLocaleString('uz-UZ')} so'm
                  </Text>
                </View>

                {/* Body */}
                <View
                  style={[
                    styles.cardBody,
                    {
                      backgroundColor: theme.colors.surface2,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardRow}>
                    <Text style={{ fontSize: 13, color: theme.colors.muted }}>
                      {t('requests.service')}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: theme.colors.fg,
                      }}
                    >
                      {serviceNames}
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
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
                      {dateStr} · {timeStr}
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
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
                      {duration} min
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                {activeTab === 'incoming' && (
                  <View style={styles.actions}>
                    <View style={{ flex: 1 }}>
                      <Button
                        variant="secondary"
                        label={t('requests.declineBtn')}
                        onPress={() => declineMutation.mutate(b.bookingId)}
                        fullWidth
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        variant="primary"
                        label={t('requests.acceptBtn')}
                        onPress={() => confirmMutation.mutate(b.bookingId)}
                        fullWidth
                      />
                    </View>
                  </View>
                )}
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  tabBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
});
