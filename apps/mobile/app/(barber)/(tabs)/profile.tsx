// Barber Profile tab screen.
// Full profile with info card, rating, stats, menu items.

import React, { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../src/atoms/Text';
import { Button } from '../../../src/atoms/Button';
import { Avatar } from '../../../src/atoms/Avatar';
import { Badge } from '../../../src/atoms/Badge';
import { Icon, type IconName } from '../../../src/atoms/Icon';
import { ScreenLayout } from '../../../src/templates/ScreenLayout';
import { HelpSheet, type HelpSheetRef } from '../../../src/molecules/HelpSheet';
import { useAuthStore } from '../../../src/lib/auth';
import { clearPushToken } from '../../../src/lib/pushToken';
import { useAppearanceStore, type AppearanceMode } from '../../../src/lib/appearance';
import { useLocaleStore } from '../../../src/lib/locale';
import type { SupportedLocale } from '../../../src/lib/i18n';
import { getBarberMe, getBarberBookings, getBarberEarnings } from '../../../src/lib/api';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../../src/navigation/BarberTabBar';
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

const APPEARANCE_LABEL_KEYS: Record<AppearanceMode, string> = {
  system: 'profile.appearanceSystem',
  light: 'profile.appearanceLight',
  dark: 'profile.appearanceDark',
};

const LANGUAGE_LABEL_KEYS: Record<SupportedLocale, string> = {
  uz: 'profile.languageUz',
  ru: 'profile.languageRu',
};

export default function BarberProfileScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const barber = useAuthStore((s) => s.barber);
  const signOut = useAuthStore((s) => s.signOut);
  const isAuthenticated = !!useAuthStore((s) => s.token);
  const appearanceMode = useAppearanceStore((s) => s.mode);
  const locale = useLocaleStore((s) => s.locale);

  const helpSheetRef = useRef<HelpSheetRef>(null);

  const insets = useSafeAreaInsets();
  const tabBarPadding =
    BARBER_TAB_BAR_PILL_HEIGHT +
    Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) +
    8;

  async function onSignOut() {
    // Best-effort — needs the still-valid JWT, so this must run before
    // signOut() clears it. A failure here shouldn't block sign-out.
    await clearPushToken('barber');
    await signOut();
  }

  const barberMeQuery = useQuery({
    queryKey: ['barber', 'me'],
    queryFn: getBarberMe,
    staleTime: 60 * 1000,
    enabled: isAuthenticated,
  });
  const bookingsQuery = useQuery({
    queryKey: ['barber', 'bookings', 'all'],
    queryFn: () => getBarberBookings(),
    staleTime: 60 * 1000,
    enabled: isAuthenticated,
  });

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const earningsQuery = useQuery({
    queryKey: ['barber', 'earnings', formatISODate(monthStart), formatISODate(monthEnd)],
    queryFn: () => getBarberEarnings(formatISODate(monthStart), formatISODate(monthEnd)),
    staleTime: 60 * 1000,
    enabled: isAuthenticated,
  });

  // "This month" — same window as /earnings' default view, so the number
  // shown here matches what tapping through to it shows.
  const bookingsCount = (bookingsQuery.data ?? []).filter((b) => {
    const d = new Date(b.timestamp);
    return d >= monthStart && d <= monthEnd;
  }).length;
  const earningsTotal = earningsQuery.data?.summary.gross_total ?? 0;
  const rating = barberMeQuery.data?.barber.ratingAverage ?? 0;
  const reviewCount = barberMeQuery.data?.barber.ratingCount ?? 0;

  return (
    <ScreenLayout>
      {/* Fixed header — stays put while the content below scrolls */}
      <View style={styles.header}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: theme.colors.fg,
          }}
        >
          {t('tabs.profile')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* ID card */}
        <View
          style={[
            styles.idCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Avatar
            size={88}
            uri={barber?.avatar ?? undefined}
            initials={`${barber?.firstName?.[0] ?? ''}${barber?.lastName?.[0] ?? ''}`}
            ring
          />
          <View style={{ marginTop: 16 }}>
            <Badge label={t('profile.role.barber')} tone="success" />
          </View>
          <Text
            style={{
              marginTop: 8,
              fontSize: 22,
              fontWeight: '700',
              color: theme.colors.fg,
              letterSpacing: -0.4,
            }}
          >
            {barber
              ? `${barber.firstName} ${barber.lastName}`
              : t('common.loading')}
          </Text>
          {barber?.phone ? (
            <Text
              style={{
                marginTop: 4,
                color: theme.colors.muted,
                fontSize: 14,
              }}
            >
              {barber.phone}
            </Text>
          ) : null}

          {/* Rating row */}
          <View style={styles.ratingRow}>
            <Icon name="star" size={16} color={theme.colors.warning} />
            <Text
              style={{
                marginLeft: 6,
                fontSize: 15,
                fontWeight: '600',
                color: theme.colors.fg,
              }}
            >
              {rating > 0 ? rating.toFixed(1) : '—'}
            </Text>
            <Text
              style={{
                marginLeft: 6,
                fontSize: 13,
                color: theme.colors.muted,
              }}
            >
              {t('barber.ratingReviews', { count: reviewCount })}
            </Text>
          </View>
        </View>

        {/* Stats divider */}
        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Pressable
            style={styles.stat}
            onPress={() => router.push('/bookings-history')}
            accessibilityRole="button"
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: theme.colors.fg,
                fontVariant: ['tabular-nums'],
              }}
            >
              {bookingsCount}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
              {t('bookings.title')}
            </Text>
          </Pressable>
          <View
            style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
          />
          <Pressable
            style={styles.stat}
            onPress={() => router.push('/earnings')}
            accessibilityRole="button"
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: theme.colors.fg,
                fontVariant: ['tabular-nums'],
              }}
            >
              {(earningsTotal / 1000).toFixed(0)}k
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
              {t('tabs.earnings')}
            </Text>
          </Pressable>
        </View>

        {/* Menu sections */}
        <SectionHeading title={t('profile.section.account')} />
        <Menu>
          <MenuRow
            icon="clock"
            label={t('pending.title')}
            onPress={() => router.push('/pending')}
          />
          <MenuRow
            icon="user"
            label={t('barber.portfolio')}
            onPress={() => router.push('/portfolio-edit')}
          />
        </Menu>

        <SectionHeading title={t('profile.section.settings')} />
        <Menu>
          <MenuRow
            icon="moon"
            label={t('profile.appearance')}
            value={t(APPEARANCE_LABEL_KEYS[appearanceMode])}
            onPress={() => router.push('/appearance')}
          />
          <MenuRow
            icon="globe"
            label={t('profile.language')}
            value={t(LANGUAGE_LABEL_KEYS[locale])}
            onPress={() => router.push('/language')}
          />
        </Menu>

        <SectionHeading title={t('profile.section.help')} />
        <Menu>
          <MenuRow
            icon="mail"
            label={t('profile.help')}
            onPress={() => helpSheetRef.current?.open()}
          />
          <Pressable
            onPress={onSignOut}
            style={[styles.menuRow, { borderTopColor: theme.colors.border }]}
            testID="barber-signout"
            accessibilityRole="button"
          >
            <View
              style={[
                styles.menuRowIc,
                {
                  backgroundColor: theme.colors.dangerSoft,
                  borderColor: 'transparent',
                },
              ]}
            >
              <Icon name="logout" size={16} color={theme.colors.danger} />
            </View>
            <Text
              style={{
                flex: 1,
                fontWeight: '500',
                fontSize: 15,
                color: theme.colors.danger,
              }}
            >
              {t('profile.signOut')}
            </Text>
          </Pressable>
        </Menu>
      </ScrollView>
      <HelpSheet ref={helpSheetRef} />
    </ScreenLayout>
  );
}

const SectionHeading: React.FC<{ title: string }> = ({ title }) => {
  const theme = useTheme<AppTheme>();
  return (
    <Text
      style={{
        marginTop: 16,
        marginHorizontal: 24,
        marginBottom: 8,
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.muted,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
      }}
    >
      {title}
    </Text>
  );
};

const Menu: React.FC<React.PropsWithChildren> = ({ children }) => {
  const theme = useTheme<AppTheme>();
  return (
    <View
      style={[
        styles.menu,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
};

const MenuRow: React.FC<{
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
}> = ({ icon, label, value, onPress }) => {
  const theme = useTheme<AppTheme>();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuRow, { borderTopColor: theme.colors.border }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View
        style={[
          styles.menuRowIc,
          {
            backgroundColor: theme.colors.surface2,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Icon name={icon} size={16} color={theme.colors.fg2} />
      </View>
      <Text
        style={{
          flex: 1,
          fontWeight: '500',
          fontSize: 15,
          color: theme.colors.fg,
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text style={{ color: theme.colors.muted, fontSize: 13, marginRight: 6 }}>
          {value}
        </Text>
      ) : null}
      <Icon name="arrow-right" size={18} color={theme.colors.muted2} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  idCard: {
    marginHorizontal: 20,
    marginTop: 6,
    padding: 22,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  menu: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuRowIc: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
