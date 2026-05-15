// Booking confirmation. Renders a Reanimated check-ring + ticket. The
// "cancel" CTA invokes /client/bookings/:id/cancel from the brief.
//
// The booking we display comes from React Query's cache (set by the booking
// mutation). If the cache is cold (deep link / refresh), we render a fallback
// loading state and let the user back out — fetching one-off bookings is
// outside the slice scope (no /client/bookings/:id endpoint exists yet).

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import {
  bookingFromContract,
  calculateTotalDuration,
  type BookingContract,
  type Booking,
} from '@my-barber/types';
import { shadows } from '@my-barber/ui';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import { BookingTicket } from '../molecules/BookingTicket';
import { ScreenLayout } from '../templates/ScreenLayout';
import { cancelBooking } from '../lib/api';
import {
  formatTimeOfDay,
  formatDayMonth,
  formatWeekdayLong,
} from '../lib/format';
import type { AppTheme } from '../lib/restyle';

// We stash the just-created booking under this query key so the confirmation
// screen can read it after the form mutation succeeds.
const LAST_BOOKING_KEY = ['lastBooking'] as const;

export interface LastBookingStash {
  booking: BookingContract;
  /** Display name of the barber or shop, e.g. "Lochin Barbershop" */
  barberDisplay: string;
  /** Human-readable shop address, e.g. "Amir Temur 26" */
  shopDisplay: string;
}

export function stashLastBooking(
  qc: ReturnType<typeof useQueryClient>,
  stash: LastBookingStash,
) {
  qc.setQueryData(LAST_BOOKING_KEY, stash);
}

export const ConfirmationScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Find the booking in the React Query cache. The booking screen primes
  // this entry; if it's missing we render a degraded state.
  const lastStash = qc.getQueryData<LastBookingStash>(LAST_BOOKING_KEY);
  const contract: BookingContract | undefined =
    lastStash?.booking?.id === id ? lastStash.booking : undefined;
  const barberDisplay = lastStash?.barberDisplay ?? '';
  const shopDisplay = lastStash?.shopDisplay ?? '';

  const booking: Booking | undefined = contract
    ? bookingFromContract(contract)
    : undefined;

  // Animation values for the success ring + ticket.
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const ticketY = useSharedValue(40);
  const ticketOpacity = useSharedValue(0);

  useEffect(() => {
    ringOpacity.value = withTiming(1, { duration: 200 });
    ringScale.value = withSpring(1, { damping: 12, stiffness: 130 });
    ticketY.value = withDelay(180, withTiming(0, { duration: 360 }));
    ticketOpacity.value = withDelay(180, withTiming(1, { duration: 360 }));
  }, [ringOpacity, ringScale, ticketY, ticketOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));
  const ticketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ticketY.value }],
    opacity: ticketOpacity.value,
  }));

  const cancelMut = useMutation({
    mutationFn: async () => cancelBooking(id),
    onSuccess: (updated) => {
      if (lastStash) {
        qc.setQueryData(LAST_BOOKING_KEY, { ...lastStash, booking: updated });
      }
    },
  });

  const isCancelled =
    contract?.status === 'cancelled' || contract?.status === 'declined';

  if (!booking || !contract) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <Text style={{ color: theme.colors.muted }}>
            {t('common.empty')}
          </Text>
          <View style={{ height: 16 }} />
          <Button
            label={t('common.back')}
            variant="secondary"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </ScreenLayout>
    );
  }

  const start = new Date(booking.timestamp);
  const duration = calculateTotalDuration(
    booking.services.map((s) => ({ durationMinutes: undefined })),
  );

  return (
    <ScreenLayout>
      <View style={styles.scroll}>
        <Text
          style={{
            color: theme.colors.accent,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          {t('confirmation.eyebrow')}
        </Text>

        <Animated.View style={[styles.ringWrap, ringStyle]}>
          <View
            style={[
              styles.ring,
              shadows.ring,
              {
                backgroundColor: theme.colors.accent,
                shadowColor: theme.colors.accent,
              },
            ]}
          >
            <Icon name="check" size={56} color={theme.colors.onAccent} strokeWidth={2.6} />
          </View>
        </Animated.View>

        <Text
          style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 28,
            fontWeight: '700',
            color: theme.colors.fg,
            letterSpacing: -0.6,
          }}
        >
          {t('confirmation.title')}
        </Text>
        <Text
          style={{
            marginTop: 6,
            textAlign: 'center',
            paddingHorizontal: 32,
            color: theme.colors.muted,
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          {t('confirmation.body', {
            name: '—',
            dayLong: formatWeekdayLong(start),
            date: formatDayMonth(start),
            time: formatTimeOfDay(start),
          })}
        </Text>

        <Animated.View style={[styles.ticketWrap, ticketStyle]}>
          <BookingTicket
            booking={booking}
            barberDisplay={barberDisplay}
            shopDisplay={shopDisplay}
            refLabel={`MBR-${booking.id.slice(0, 6).toUpperCase()}`}
          />
        </Animated.View>

        <View style={styles.actions}>
          <Button
            variant="secondary"
            fullWidth
            label={t('confirmation.viewBookings')}
            onPress={() => router.replace('/(tabs)')}
          />
          {!isCancelled ? (
            <View style={{ height: 8 }} />
          ) : null}
          {!isCancelled ? (
            <Button
              variant="destructive"
              fullWidth
              label={
                cancelMut.isPending
                  ? t('confirmation.cancelling')
                  : t('confirmation.cancelBooking')
              }
              onPress={() => cancelMut.mutate()}
              disabled={cancelMut.isPending}
              loading={cancelMut.isPending}
              testID="confirmation-cancel"
            />
          ) : (
            <Text
              style={{
                color: theme.colors.danger,
                fontSize: 13,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              {t('confirmation.cancelledNote')}
            </Text>
          )}
        </View>

        <Text
          style={{
            marginTop: 18,
            textAlign: 'center',
            color: theme.colors.muted,
            fontSize: 12,
          }}
        >
          {t('confirmation.footnote')}
        </Text>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  ringWrap: {
    marginTop: 16,
    alignSelf: 'center',
    width: 120,
    height: 120,
  },
  ring: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketWrap: {
    marginTop: 24,
  },
  actions: {
    marginTop: 16,
  },
});
