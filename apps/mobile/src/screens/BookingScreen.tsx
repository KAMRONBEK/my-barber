// Booking screen wrapper. Reads the barber from the banner cache, hands
// it to <BookingForm/> and provides the navigation header.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import { Avatar } from '../atoms/Avatar';
import { BookingForm } from '../organisms/BookingForm';
import { ScreenLayout } from '../templates/ScreenLayout';
import { getBanner, type ApiBarber } from '../lib/api';
import { queryKeys, STALE } from '../lib/query';
import type { AppTheme } from '../lib/restyle';

export const BookingScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const { barberId } = useLocalSearchParams<{ barberId: string }>();

  const bannerQuery = useQuery({
    queryKey: queryKeys.banner,
    queryFn: getBanner,
    staleTime: STALE.banner,
  });

  const barber: ApiBarber | undefined = (bannerQuery.data ?? []).find(
    (b) => b.id === barberId,
  );

  if (!barber) {
    return (
      <ScreenLayout>
        <Header onBack={() => router.back()} title={t('booking.title')} />
        <View style={styles.center}>
          <Text style={{ color: theme.colors.muted }}>
            {bannerQuery.isLoading ? t('common.loading') : t('common.empty')}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <Header onBack={() => router.back()} title={t('booking.title')} />

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
            {barber.firstName} {barber.lastName} · Lochin Barbershop
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontSize: 12,
              color: theme.colors.muted,
            }}
            numberOfLines={1}
          >
            {t('barber.openUntil', { time: '21:00' })}
          </Text>
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

const Header: React.FC<{ onBack: () => void; title: string }> = ({
  onBack,
  title,
}) => {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.head}>
      <Pressable
        onPress={onBack}
        style={[
          styles.iconBtn,
          {
            backgroundColor: theme.colors.surface2,
            borderColor: theme.colors.border,
          },
        ]}
        accessibilityLabel="back"
      >
        <Icon name="back" size={18} color={theme.colors.fg} />
      </Pressable>
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: '600',
          color: theme.colors.fg,
        }}
      >
        {title}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
