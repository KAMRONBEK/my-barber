// Profile / settings screen. Reads /client/getMe, shows ID card + stats
// divider + sectioned menu with marketing toggle.

import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
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
import { getMe } from '../lib/api';
import { useAuthStore } from '../lib/auth';
import { queryKeys, STALE } from '../lib/query';
import { getItem, setItem } from '../lib/storage';
import type { AppTheme } from '../lib/restyle';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();

  const client = useAuthStore((s) => s.client);
  const setClient = useAuthStore((s) => s.setClient);
  const signOut = useAuthStore((s) => s.signOut);

  const [marketingEnabled, setMarketingEnabled] = useState(false);

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

  // Load marketing preference from secure storage
  useEffect(() => {
    getItem('marketingNotifications')
      .then((val) => {
        if (val !== null) setMarketingEnabled(val === '1');
      })
      .catch(() => {});
  }, []);

  async function toggleMarketing(val: boolean) {
    setMarketingEnabled(val);
    await setItem('marketingNotifications', val ? '1' : '0');
  }

  const profile = meQuery.data ?? client;

  const displayHandle = profile?.username
    ? profile.username.includes('@')
      ? `@${profile.username.split('@')[0]}`
      : `@${profile.username}`
    : null;

  async function onSignOut() {
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

  // Stub counts until API returns them
  const cutsCount = 18;
  const savedCount = 3;

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
          }}
        >
          {t('profile.title')}
        </Text>

        {/* Right: saved heart badge + settings */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => { /* TODO: navigate to saved barbers */ }}
            style={[
              styles.headerBtn,
              { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
            ]}
            accessibilityRole="button"
          >
            <Icon name="heart" size={17} color={theme.colors.fg} />
            {savedCount > 0 ? (
              <View
                style={[
                  styles.headerBadge,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={{ color: theme.colors.onAccent, fontSize: 8, fontWeight: '700' }}
                >
                  {savedCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            style={[
              styles.headerBtn,
              { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
            ]}
            accessibilityRole="button"
          >
            <Icon name="settings" size={17} color={theme.colors.fg} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
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
          <View style={styles.stat}>
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
              {savedCount}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
              {t('profile.stats.saved')}
            </Text>
          </View>
        </View>

        {/* Account */}
        <SectionHeading title={t('profile.section.account')} />
        <Menu>
          <MenuRow
            icon="user"
            label={t('profile.edit')}
            onPress={() => router.push('/profile-edit')}
          />
          <MenuRow
            icon="phone"
            label={t('profile.phoneSecurity')}
            value={profile?.phone ?? ''}
          />
          <MenuRow icon="pin" label={t('profile.primaryLocation')} value="Mirzo-Ulug'bek" />
        </Menu>

        {/* Settings */}
        <SectionHeading title={t('profile.section.settings')} />
        <Menu>
          <MenuRow icon="bell" label={t('profile.notifications')} />
          {/* Marketing notifications toggle */}
          <View
            style={[
              styles.toggleRow,
              { borderTopColor: theme.colors.border },
            ]}
          >
            <View
              style={[
                styles.menuRowIc,
                { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
              ]}
            >
              <Icon name="mail" size={16} color={theme.colors.fg2} />
            </View>
            <Text
              style={{
                flex: 1,
                fontWeight: '500',
                fontSize: 15,
                color: theme.colors.fg,
              }}
            >
              {t('profile.marketing')}
            </Text>
            <Switch
              value={marketingEnabled}
              onValueChange={toggleMarketing}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent,
              }}
              thumbColor={theme.colors.surface}
            />
          </View>
          <MenuRow icon="moon" label={t('profile.appearance')} value={t('profile.appearanceSystem')} />
        </Menu>

        {/* Help */}
        <SectionHeading title={t('profile.section.help')} />
        <Menu>
          <MenuRow icon="mail" label={t('profile.help')} />
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
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
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
  toggleRow: {
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
