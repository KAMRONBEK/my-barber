// Barber Profile tab screen.
// Full profile with info card, rating, stats, menu items.

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
import { useAuthStore } from '../../../src/lib/auth';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../../src/navigation/BarberTabBar';
import type { AppTheme } from '../../../src/lib/restyle';

export default function BarberProfileScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const barber = useAuthStore((s) => s.barber);
  const signOut = useAuthStore((s) => s.signOut);

  const insets = useSafeAreaInsets();
  const tabBarPadding =
    BARBER_TAB_BAR_PILL_HEIGHT +
    Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) +
    8;

  async function onSignOut() {
    await signOut();
  }

  // Stub counts until API returns them
  const bookingsCount = 42;
  const earningsTotal = 1250000;
  const rating = 4.9;
  const reviewCount = 128;

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
            {t('tabs.profile')}
          </Text>
        </View>

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
              {rating.toFixed(1)}
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
          <View style={styles.stat}>
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
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
          />
          <View style={styles.stat}>
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
          </View>
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
          <MenuRow
            icon="settings"
            label={t('profileEdit.title')}
            onPress={() => router.push('/settings')}
          />
        </Menu>

        <SectionHeading title={t('profile.section.help')} />
        <Menu>
          <MenuRow icon="mail" label={t('profile.help')} />
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
