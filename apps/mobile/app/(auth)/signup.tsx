// TODO: Implement sign-up step 1 — email entry.
//       Design reference: OD screen 04-signup.html
//       Wire to POST /auth/client/register (endpoint not yet shipped).
//       On success navigate to /(auth)/signup-password passing the email as
//       a route param.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../../src/atoms/Text';
import { BackButton } from '../../src/atoms/BackButton';
import { Input } from '../../src/atoms/Input';
import { Button } from '../../src/atoms/Button';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import type { AppTheme } from '../../src/lib/restyle';

export default function SignupScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');

  function onContinue() {
    // TODO: validate email format, then navigate to signup-password
    router.push({ pathname: '/(auth)/signup-password', params: { email: email.trim() } });
  }

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.top}>
          <BackButton />
        </View>
        <View style={styles.head}>
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {t('auth.createAccount')}
          </Text>
          <Text
            style={{
              marginTop: 14,
              fontSize: 32,
              fontWeight: '700',
              color: theme.colors.fg,
              letterSpacing: -0.6,
            }}
          >
            {t('auth.emailAddress')}
          </Text>
        </View>

        <View style={styles.body}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            keyboardType="email-address"
            testID="signup-email"
          />
        </View>

        <View style={styles.foot}>
          <Button
            fullWidth
            label={t('common.continue')}
            onPress={onContinue}
            disabled={!email.includes('@')}
            testID="signup-continue"
          />
          <View style={{ height: 12 }} />
          <Button
            fullWidth
            variant="ghost"
            label={t('auth.signIn')}
            onPress={() => router.back()}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    paddingTop: 8,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  head: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  body: { flex: 1, paddingHorizontal: 24 },
  foot: { padding: 24 },
});
