// TODO: Implement the Barber Requests screen.
//       Design reference: OD screen 15 — list of incoming booking requests
//       with Accept / Decline CTAs per item.
//       Data source: GET /barber/requests?status=pending (endpoint not yet shipped).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../../src/atoms/Text';
import { Badge } from '../../src/atoms/Badge';
import { Button } from '../../src/atoms/Button';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import type { AppTheme } from '../../src/lib/restyle';

export default function BarberRequestsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScreenLayout>
      <View style={styles.header}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        <Badge label={t('profile.role.barber')} tone="success" />
      </View>
      <View style={styles.center}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.fg }}>
          {/* TODO: add i18n key barber.requests */}
          Requests
        </Text>
        <Text style={{ marginTop: 8, color: theme.colors.muted, fontSize: 14 }}>
          Barber workspace — coming soon
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
