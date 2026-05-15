// TODO: Implement sign-up step 2 — password entry with strength indicator.
//       Design reference: OD screen 05-signup-password.html
//       Password strength rules: min 8 chars, at least one number, one uppercase.
//       On success POST /auth/client/register and navigate to /(auth)/otp.

import React, { useState, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../../src/atoms/Text';
import { Input } from '../../src/atoms/Input';
import { Button } from '../../src/atoms/Button';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import type { AppTheme } from '../../src/lib/restyle';

type StrengthLevel = 'weak' | 'fair' | 'strong';

function getStrength(pw: string): StrengthLevel {
  if (pw.length < 6) return 'weak';
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  if (pw.length >= 8 && hasUpper && hasNumber) return 'strong';
  if (pw.length >= 6) return 'fair';
  return 'weak';
}

export default function SignupPasswordScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => getStrength(password), [password]);

  const strengthColor = {
    weak: theme.colors.danger,
    fair: theme.colors.warning,
    strong: theme.colors.success,
  }[strength];

  async function onContinue() {
    setSubmitting(true);
    setError(null);
    try {
      // TODO: POST /auth/client/register with { email, password }
      //       then navigate to OTP screen passing the email/phone for verification
      router.push({ pathname: '/(auth)/otp', params: { email } });
    } catch {
      setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
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
            {t('auth.choosePassword')}
          </Text>
          <Text
            style={{
              marginTop: 6,
              color: theme.colors.muted,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {t('auth.passwordSubtitle')}
          </Text>
          {email ? (
            <Text style={{ marginTop: 4, color: theme.colors.muted2, fontSize: 13 }}>
              {email}
            </Text>
          ) : null}
        </View>

        <View style={styles.body}>
          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            testID="signup-password"
            errorText={error ?? undefined}
          />

          {/* Strength bar — segmented progress indicator with label */}
          {password.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['weak', 'fair', 'strong'] as StrengthLevel[]).map((level, i) => {
                  const levels: StrengthLevel[] = ['weak', 'fair', 'strong'];
                  const active = levels.indexOf(strength) >= i;
                  return (
                    <View
                      key={level}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: active ? strengthColor : theme.colors.border,
                      }}
                    />
                  );
                })}
              </View>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: '600',
                  color: strengthColor,
                }}
              >
                {strength === 'weak'
                  ? t('auth.passwordWeak')
                  : strength === 'fair'
                  ? t('auth.passwordFair')
                  : t('auth.passwordStrong')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.foot}>
          <Button
            fullWidth
            label={submitting ? t('common.loading') : t('common.continue')}
            onPress={onContinue}
            disabled={strength === 'weak' || submitting}
            loading={submitting}
            testID="signup-password-continue"
          />
          <View style={{ height: 12 }} />
          <Button
            fullWidth
            variant="ghost"
            label={t('common.back')}
            onPress={() => router.back()}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  body: { flex: 1, paddingHorizontal: 24 },
  foot: { padding: 24 },
});
