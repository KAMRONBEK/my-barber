// Ticket-style booking detail used on the confirmation screen and as a
// stand-alone read-only display.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import {
  formatUZS,
  formatTimeRange,
  formatWeekdayShort,
  formatDayMonth,
} from '../lib/format';
import type { AppTheme } from '../lib/restyle';
import {
  calculateTotalDuration,
  type Booking,
} from '@my-barber/types';

export interface BookingTicketProps {
  booking: Booking;
  barberDisplay: string;
  shopDisplay?: string;
  refLabel?: string;
}

export const BookingTicket: React.FC<BookingTicketProps> = ({
  booking,
  barberDisplay,
  shopDisplay,
  refLabel,
}) => {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();

  const start = new Date(booking.timestamp);
  const total = booking.services.reduce((sum, s) => sum + s.price, 0);
  const duration = calculateTotalDuration(
    booking.services.map((s) => ({ durationMinutes: undefined })),
  );
  const serviceLabel = booking.services.map((s) => s.name).join(' + ');

  const statusTone =
    booking.status === 'confirmed'
      ? 'success'
      : booking.status === 'cancelled' || booking.status === 'declined'
      ? 'danger'
      : 'accent';

  return (
    <View
      style={[
        styles.ticket,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.head}>
        <Avatar size={44} initials={barberDisplay.slice(0, 2)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: theme.colors.fg,
            }}
            numberOfLines={1}
          >
            {barberDisplay}
          </Text>
          {shopDisplay ? (
            <Text
              style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}
              numberOfLines={1}
            >
              {shopDisplay}
            </Text>
          ) : null}
        </View>
        <Badge label={t(`confirmation.status`)} tone={statusTone} />
      </View>

      <View
        style={[styles.body, { borderColor: theme.colors.border }]}
      >
        <Row label={t('booking.service')} value={serviceLabel} />
        <Row
          label={t('booking.date')}
          value={`${formatWeekdayShort(start)} · ${formatDayMonth(start)}`}
        />
        <Row label={t('booking.time')} value={formatTimeRange(start, duration)} />
        <Row
          label={t('booking.total')}
          value={formatUZS(total)}
          big
        />
      </View>

      {refLabel ? (
        <View
          style={[styles.foot, { borderColor: theme.colors.border }]}
        >
          <Text style={{ color: theme.colors.muted, fontSize: 12, letterSpacing: 1 }}>
            {t('confirmation.ref')}
          </Text>
          <Text
            style={{
              color: theme.colors.fg,
              fontSize: 12,
              fontVariant: ['tabular-nums'],
            }}
          >
            {refLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const Row: React.FC<{ label: string; value: string; big?: boolean }> = ({
  label,
  value,
  big,
}) => {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{label}</Text>
      <Text
        style={{
          color: theme.colors.fg,
          fontSize: big ? 18 : 14,
          fontWeight: big ? '700' : '500',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  ticket: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
