// Notifications screen. Fetches from GET /client/notifications.
// Grouped notification rows with icon badges, relative timestamps,
// Accept/Reject inline actions for booking-request types.

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { BackButton, BACK_BUTTON_SIZE } from '../src/atoms/BackButton';
import { Button } from '../src/atoms/Button';
import { Icon, type IconName } from '../src/atoms/Icon';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { api } from '../src/lib/api';
import type { AppTheme } from '../src/lib/restyle';

interface NotificationItem {
  id: string;
  type: 'booking_confirmed' | 'booking_reminder' | 'booking_request' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

async function fetchNotifications(): Promise<NotificationItem[]> {
  const r = await api.get<{ ok: boolean; data: NotificationItem[] }>(
    '/client/notifications',
  );
  return r.data.data ?? [];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Hozirgina';
  if (mins < 60) return `${mins} daq. oldin`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  const days = Math.floor(hrs / 24);
  return `${days} kun oldin`;
}

const TYPE_CONFIG: Record<
  NotificationItem['type'],
  { icon: IconName; color: string }
> = {
  booking_confirmed: { icon: 'check', color: '#2f9d5e' },
  booking_reminder: { icon: 'bell', color: '#d4a043' },
  booking_request: { icon: 'calendar', color: '#4673c0' },
  system: { icon: 'mail', color: '#6b6056' },
};

export default function NotificationsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 15_000,
  });

  const notifications = data ?? [];

  async function markAllRead() {
    try {
      await api.patch('/client/notifications/read-all');
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // Fail silently — endpoint may not exist yet
    }
  }

  async function handleBookingAction(id: string, action: 'accept' | 'reject') {
    try {
      await api.post(`/client/bookings/${id}/${action}`);
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // Fail silently
    }
  }

  return (
    <ScreenLayout>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: theme.colors.fg,
            flex: 1,
            textAlign: 'center',
          }}
        >
          {t('notifications.title')}
        </Text>
        {/* Mark all read */}
        <Pressable onPress={markAllRead} style={styles.markAllBtn}>
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: 12,
              fontWeight: '500',
              textAlign: 'right',
            }}
          >
            {t('notifications.markAllRead')}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.danger, marginBottom: 12 }}>
            {t('common.error')}
          </Text>
          <Button label={t('common.retry')} onPress={() => refetch()} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: theme.colors.surface2 },
            ]}
          >
            <Icon name="bell" size={32} color={theme.colors.muted2} />
          </View>
          <Text
            style={{
              marginTop: 16,
              fontSize: 17,
              fontWeight: '600',
              color: theme.colors.fg,
              textAlign: 'center',
            }}
          >
            {t('notifications.emptyTitle')}
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 14,
              color: theme.colors.muted,
              textAlign: 'center',
              paddingHorizontal: 40,
            }}
          >
            {t('notifications.emptyBody')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
            return (
              <View
                key={notif.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: notif.isRead
                      ? theme.colors.surface
                      : theme.colors.surface2,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {/* Unread dot */}
                {!notif.isRead ? (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: theme.colors.info },
                    ]}
                  />
                ) : (
                  <View style={styles.unreadDotPlaceholder} />
                )}

                {/* Coloured icon badge */}
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: `${cfg.color}22` },
                  ]}
                >
                  <Icon name={cfg.icon} size={18} color={cfg.color} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                  <View style={styles.contentHead}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: notif.isRead ? '500' : '700',
                        color: theme.colors.fg,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {notif.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.colors.muted2,
                        marginLeft: 8,
                      }}
                    >
                      {relativeTime(notif.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.muted,
                      marginTop: 2,
                      lineHeight: 18,
                    }}
                    numberOfLines={2}
                  >
                    {notif.body}
                  </Text>

                  {/* Inline Accept/Reject for booking_request type */}
                  {notif.type === 'booking_request' ? (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() =>
                          handleBookingAction(notif.id, 'accept')
                        }
                        style={[
                          styles.actionBtn,
                          { backgroundColor: theme.colors.successSoft },
                        ]}
                      >
                        <Text
                          style={{
                            color: theme.colors.success,
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {t('notifications.accept')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          handleBookingAction(notif.id, 'reject')
                        }
                        style={[
                          styles.actionBtn,
                          { backgroundColor: theme.colors.dangerSoft },
                        ]}
                      >
                        <Text
                          style={{
                            color: theme.colors.danger,
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {t('notifications.reject')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  markAllBtn: { width: 80 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  unreadDotPlaceholder: {
    width: 8,
    flexShrink: 0,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  contentHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
});
