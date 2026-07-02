// Settings screen stub. Full implementation deferred.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { ScreenHeader } from '../src/molecules/ScreenHeader';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import type { AppTheme } from '../src/lib/restyle';

export default function SettingsScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();

  return (
    <ScreenLayout>
      <ScreenHeader title={t('profile.section.settings')} />
      <View style={styles.center}>
        <Text style={{ color: theme.colors.muted }}>
          {t('common.loading')}
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
