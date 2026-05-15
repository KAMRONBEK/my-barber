// Settings screen stub. Full implementation deferred.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { Button } from '../src/atoms/Button';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import type { AppTheme } from '../src/lib/restyle';

export default function SettingsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <Button
          variant="ghost"
          label={t('common.back')}
          onPress={() => router.back()}
        />
        <Text
          style={{ fontSize: 17, fontWeight: '600', color: theme.colors.fg }}
        >
          {t('profile.section.settings')}
        </Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.center}>
        <Text style={{ color: theme.colors.muted }}>
          {t('common.loading')}
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
