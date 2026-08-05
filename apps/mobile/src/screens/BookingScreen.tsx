// Booking screen wrapper. Reads the barber from the banner cache, hands
// it to <BookingForm/> and provides the navigation header.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Avatar } from '../atoms/Avatar';
import { ScreenHeader } from '../molecules/ScreenHeader';
import { BookingForm } from '../organisms/BookingForm';
import { ScreenLayout } from '../templates/ScreenLayout';
import { getBarbers, type ApiBarberFull } from '../lib/api';
import { queryKeys, STALE } from '../lib/query';
import type { AppTheme } from '../lib/restyle';

export const BookingScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const { barberId } = useLocalSearchParams<{ barberId: string }>();

  // Same query as BarberShopScreen (shares its cache) — unlike /client/banner,
  // this response actually carries workingHours, which the slot grid below
  // needs for a real (non-fallback) booking window.
  const barbersQuery = useQuery({
    queryKey: queryKeys.barbers,
    queryFn: () => getBarbers(0, 50),
    staleTime: STALE.banner,
  });

  const barber: ApiBarberFull | undefined = (barbersQuery.data ?? []).find(
    (b) => b.id === barberId,
  );

  if (!barber) {
    return (
      <ScreenLayout>
        <ScreenHeader onBack={() => router.back()} title={t('booking.title')} />
        <View style={styles.center}>
          <Text style={{ color: theme.colors.muted }}>
            {barbersQuery.isLoading ? t('common.loading') : t('common.empty')}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenHeader onBack={() => router.back()} title={t('booking.title')} />

      <View
        style={[
          styles.barberLine,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Avatar
          size={48}
          uri={barber.avatar ?? undefined}
          initials={`${barber.firstName[0] ?? ''}${barber.lastName[0] ?? ''}`}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: theme.colors.fg,
            }}
            numberOfLines={1}
          >
            {barber.firstName} {barber.lastName}
          </Text>
          {barber.workingHours ? (
            <Text
              style={{
                marginTop: 2,
                fontSize: 12,
                color: theme.colors.muted,
              }}
              numberOfLines={1}
            >
              {barber.workingHours}
            </Text>
          ) : null}
        </View>
      </View>

      <BookingForm
        barber={barber}
        onBooked={(booking) =>
          router.replace(`/booking/confirmation/${booking.id}`)
        }
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  barberLine: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
