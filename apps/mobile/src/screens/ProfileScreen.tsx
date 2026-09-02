// Profile / settings screen. Reads /client/getMe, shows ID card + stats
// divider + sectioned menu.

import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { Icon, type IconName } from '../atoms/Icon';
import { ScreenLayout } from '../templates/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../navigation/GlassTabBar';
import { HelpSheet, type HelpSheetRef } from '../molecules/HelpSheet';
import { getMe } from '../lib/api';
import { useAuthStore } from '../lib/auth';
import { clearPushToken } from '../lib/pushToken';
import { useAppearanceStore, type AppearanceMode } from '../lib/appearance';
import { useLocaleStore } from '../lib/locale';
import { useFavoriteBarbers } from '../hooks/useFavoriteBarbers';
import { COMPLETED_CUTS_QUERY_KEY, fetchCompletedCuts } from '../lib/bookings';
import type { SupportedLocale } from '../lib/i18n';
import { queryKeys, STALE } from '../lib/query';
import type { AppTheme } from '../lib/restyle';

const APPEARANCE_LABEL_KEYS: Record<AppearanceMode, string> = {
  system: 'profile.appearanceSystem',
  light: 'profile.appearanceLight',
  dark: 'profile.appearanceDark',
};

const LANGUAGE_LABEL_KEYS: Record<SupportedLocale, string> = {
  uz: 'profile.languageUz',
  ru: 'profile.languageRu',
};

export const ProfileScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();

  const client = useAuthStore((s) => s.client);
  const setClient = useAuthStore((s) => s.setClient);
  const signOut = useAuthStore((s) => s.signOut);
  const appearanceMode = useAppearanceStore((s) => s.mode);
  const locale = useLocaleStore((s) => s.locale);
  const { favorites } = useFavoriteBarbers();

  const helpSheetRef = useRef<HelpSheetRef>(null);

  const insets = useSafeAreaInsets();
  const tabBarPadding = TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_BOTTOM_OFFSET) + 8;

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    staleTime: STALE.me,
    enabled: !!useAuthStore.getState().token,
  });

  useEffect(() => {
    if (meQuery.data) {
      void setClient(meQuery.data);
    }
  }, [meQuery.data, setClient]);

  const profile = meQuery.data ?? client;

  const displayHandle = profile?.username
    ? profile.username.includes('@')
      ? `@${profile.username.split('@')[0]}`
      : `@${profile.username}`
    : null;

  async function onSignOut() {
    // Best-effort — needs the still-valid JWT, so this must run before
    // signOut() clears it. A failure here shouldn't block sign-out.
    await clearPushToken('client');
    await signOut();
  }

  async function onShare() {
    const name = profile
      ? `${profile.firstName} ${profile.lastName}`
      : 'My Barber';
    await Share.share({
      message: `My Barber profilim: https://my-barber.uz/u/${profile?.username ?? ''}`,
      title: name,
    });
  }

  // Count reflects the most recent page (there's no aggregate count
  // endpoint) — accurate up to the fetch limit, not a true lifetime total
  // once a client has more than that many completed cuts. Shares its query
  // key/fetcher with cuts-history.tsx — using a different queryFn under the
  // same key previously poisoned the cache with mismatched data shapes.
  const completedCutsQuery = useQuery({
    queryKey: COMPLETED_CUTS_QUERY_KEY,
    queryFn: fetchCompletedCuts,
    staleTime: 60 * 1000,
    enabled: !!useAuthStore.getState().token,
  });
  const cutsCount = completedCutsQuery.data?.length ?? 0;
  const savedCount = favorites.length;

  return (
    <ScreenLayout>
      {/* Header action row */}
      <View style={styles.headerRow}>
        {/* Share icon — left */}
        <Pressable
          onPress={onShare}
          style={[
            styles.headerBtn,
            { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
        >
          <Icon name="share" size={17} color={theme.colors.fg} />
        </Pressable>

        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: theme.colors.fg,
            textAlign: 'center',
          }}
        >
          {t('profile.title')}
        </Text>

        {/* Spacer — balances the share button so the title stays centered */}
        <View style={{ width: 36 }} />
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
            uri={profile?.avatar ?? undefined}
            initials={`${profile?.firstName?.[0] ?? ''}${profile?.lastName?.[0] ?? ''}`}
            ring
          />
          <View style={{ marginTop: 16 }}>
            <Badge label={t('profile.role.client')} tone="accent" />
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
            {profile
              ? `${profile.firstName} ${profile.lastName}`
              : t('common.loading')}
          </Text>
          {displayHandle ? (
            <Text
              style={{
                marginTop: 4,
                color: theme.colors.muted,
                fontSize: 12,
              }}
            >
              {displayHandle}
            </Text>
          ) : null}
          {profile?.phone ? (
            <Text
              style={{
                marginTop: 2,
                color: theme.colors.muted2,
                fontSize: 12,
              }}
            >
              {profile.phone}
            </Text>
          ) : null}
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
            onPress={() => router.push('/cuts-history')}
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
              {cutsCount}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
              {t('profile.stats.cuts')}
            </Text>
          </Pressable>
          <View
            style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
          />
          <Pressable
            style={styles.stat}
            onPress={() => router.push('/saved-barbers')}
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
              {savedCount}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
              {t('profile.stats.saved')}
            </Text>
          </Pressable>
        </View>

        {/* Account */}
        <SectionHeading title={t('profile.section.account')} />
        <Menu>
          <MenuRow
            icon="user"
            label={t('profile.edit')}
            onPress={() => router.push('/profile-edit')}
          />
        </Menu>

        {/* Settings */}
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

        {/* Help */}
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
            testID="profile-signout"
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
};

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCard: {
    marginHorizontal: 20,
    marginTop: 6,
    padding: 22,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
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
