// What a barber sees until an admin approves the account, or after it was
// rejected or suspended. The root layout leaves this screen automatically as
// soon as the stored status becomes "approved".

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../src/atoms/Text';
import { Button } from '../src/atoms/Button';
import { Icon } from '../src/atoms/Icon';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { refreshBarberProfile } from '../src/lib/approval';
import { useAuthStore } from '../src/lib/auth';
import { authErrorKey } from '../src/lib/authErrors';
import { clearPushToken } from '../src/lib/pushToken';
import type { AppTheme } from '../src/lib/restyle';

const POLL_INTERVAL_MS = 20_000;

export default function AwaitingApprovalScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const barber = useAuthStore((s) => s.barber);
  const signOut = useAuthStore((s) => s.signOut);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const status =
    barber?.approval_status === 'rejected' || barber?.approval_status === 'suspended'
      ? barber.approval_status
      : 'pending';

  useEffect(() => {
    if (status !== 'pending') return undefined;
    const timer = setInterval(() => {
      refreshBarberProfile().catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status]);

  async function onCheck() {
    setChecking(true);
    setNotice(null);
    try {
      await refreshBarberProfile();
      setNotice(t('approval.unchanged'));
    } catch (error) {
      setNotice(t(authErrorKey(error, 'common.error')));
    } finally {
      setChecking(false);
    }
  }

  async function onSignOut() {
    // Needs the still-valid token, so it runs before the session is cleared.
    await clearPushToken('barber');
    await signOut();
  }

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.badge, { backgroundColor: theme.colors.surface2 }]}>
          <Icon
            name={status === 'pending' ? 'clock' : 'x'}
            size={30}
            color={status === 'pending' ? theme.colors.accent : theme.colors.danger}
          />
        </View>
        <Text style={[styles.title, { color: theme.colors.fg }]} testID="approval-title">
          {t(`approval.${status}.title`)}
        </Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          {t(`approval.${status}.body`)}
        </Text>
        {status !== 'pending' && barber?.approval_message ? (
          <Text style={[styles.body, { color: theme.colors.fg }]}>
            {barber.approval_message}
          </Text>
        ) : null}
        {notice ? (
          <Text style={[styles.body, { color: theme.colors.muted }]}>{notice}</Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            fullWidth
            label={t('approval.check')}
            onPress={onCheck}
            loading={checking}
            testID="approval-check"
          />
          <Button
            fullWidth
            variant="secondary"
            label={t('approval.language')}
            onPress={() => router.push('/language' as any)}
            testID="approval-language"
          />
          <Button
            fullWidth
            variant="ghost"
            label={t('auth.signOut')}
            onPress={onSignOut}
            testID="approval-sign-out"
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 10,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 22,
    gap: 12,
  },
});
