// Home-screen "Upcoming · Today" banner. Stylized warm gradient — matches OD's
// `.upcoming` card in 07-dashboard.html. Optional: when no upcoming booking
// is present we render a "browse" prompt instead.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import type { AppTheme } from '../lib/restyle';
import {
  formatTimeOfDay,
  formatWeekdayLong,
  formatDayMonth,
} from '../lib/format';

export interface UpcomingBannerProps {
  bookingTimestamp?: string | null;
  serviceLabel?: string | null;
  subtitle?: string | null;
  /** When true the banner renders nothing — avoids misleading "no bookings"
   *  state when the real cause is a network or auth error. */
  isError?: boolean;
  onPress?: () => void;
}

export const UpcomingBanner: React.FC<UpcomingBannerProps> = ({
  bookingTimestamp,
  serviceLabel,
  subtitle,
  isError,
  onPress,
}) => {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();

  // On error: render nothing so the user isn't misled by "no bookings" text.
  if (isError) return null;

  if (!bookingTimestamp) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.empty,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        accessibilityRole="button"
      >
        <Text style={{ color: theme.colors.fg, fontSize: 15, fontWeight: '600' }}>
          {t('home.noUpcoming')}
        </Text>
        <Text style={{ marginTop: 6, color: theme.colors.muted, fontSize: 13 }}>
          {t('home.browse')}
        </Text>
      </Pressable>
    );
  }

  const dt = new Date(bookingTimestamp);
  const weekday = formatWeekdayLong(dt);
  const day = formatDayMonth(dt);
  const time = formatTimeOfDay(dt);
  const isToday = isSameLocalDay(dt, new Date());

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: '#1d150f',
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('home.viewBooking')}
    >
      <View style={[styles.pill, { borderColor: 'rgba(255,255,255,0.2)' }]}>
        <View
          style={[styles.pillDot, { backgroundColor: theme.colors.success }]}
        />
        <Text
          style={{
            color: '#fff',
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {t('home.upcomingEyebrow')}
        </Text>
      </View>

      <View style={styles.bottom}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {isToday ? `${t('home.upcomingEyebrow')} · ${time}` : `${weekday} · ${day} · ${time}`}
          </Text>
          <Text
            style={{
              marginTop: 6,
              color: '#fff',
              fontSize: 22,
              fontWeight: '600',
              letterSpacing: -0.4,
            }}
            numberOfLines={1}
          >
            {serviceLabel ?? ''}
          </Text>
          {subtitle ? (
            <Text
              style={{
                marginTop: 4,
                color: 'rgba(255,255,255,0.75)',
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.cta,
            { backgroundColor: 'rgba(255,255,255,0.96)' },
          ]}
        >
          <Icon name="arrow-right" size={18} color="#15110d" />
        </View>
      </View>
    </Pressable>
  );
};

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const styles = StyleSheet.create({
  card: {
    height: 168,
    padding: 16,
    borderRadius: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  empty: {
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  cta: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
