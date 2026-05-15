// TODO: Implement OTP verification screen.
//       Design reference: OD screen 06-otp.html — 6 individual digit boxes.
//       Flow: after sign-up the API sends an OTP to the user's phone/email;
//       the user enters it here to activate their account.
//       Wire to POST /auth/client/verify-otp { email, otp } once that
//       endpoint ships. On success navigate to /(tabs).

import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../../src/atoms/Text';
import { Button } from '../../src/atoms/Button';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import type { AppTheme } from '../../src/lib/restyle';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const { email, phone } = useLocalSearchParams<{ email: string; phone: string }>();

  // Mask phone: show only last 4 digits, e.g. "+998 ** *** 4321"
  const maskedPhone = phone
    ? phone.slice(0, 4) + ' ** *** ' + phone.slice(-4)
    : email
    ? `${email.slice(0, 3)}***@${email.split('@')[1] ?? ''}`
    : '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  function onDigitChange(index: number, value: string) {
    const sanitised = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = sanitised;
    setDigits(next);
    if (sanitised && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function onKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  const code = digits.join('');
  const isComplete = code.length === OTP_LENGTH;

  async function onVerify() {
    setSubmitting(true);
    setError(null);
    try {
      // TODO: POST /auth/client/verify-otp { email, otp: code }
      //       then sign in with returned JWT via useAuthStore.signIn()
      router.replace('/(tabs)');
    } catch {
      setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenLayout>
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
          {t('auth.verification')}
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
          {t('auth.enterCode')}
        </Text>
        {maskedPhone ? (
          <Text style={{ marginTop: 6, color: theme.colors.muted, fontSize: 14, lineHeight: 21 }}>
            {t('auth.enterCodeSubtitle', { phone: maskedPhone })}
          </Text>
        ) : null}
      </View>

      {/* 6-box digit input */}
      <View style={styles.boxes}>
        {digits.map((digit, i) => (
          <TextInput
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            value={digit}
            onChangeText={(v) => onDigitChange(i, v)}
            onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            style={[
              styles.box,
              {
                backgroundColor: theme.colors.surface,
                borderColor: digit ? theme.colors.accent : theme.colors.border,
                color: theme.colors.fg,
                fontSize: 22,
                fontWeight: '700',
              },
            ]}
            textAlign="center"
            testID={`otp-digit-${i}`}
          />
        ))}
      </View>

      {error ? (
        <Text
          style={{
            color: theme.colors.danger,
            fontSize: 13,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {error}
        </Text>
      ) : null}

      <View style={styles.foot}>
        <Button
          fullWidth
          label={submitting ? t('common.loading') : t('common.confirm')}
          onPress={onVerify}
          disabled={!isComplete || submitting}
          loading={submitting}
          testID="otp-verify"
        />
        <View style={{ height: 12 }} />
        <Button
          fullWidth
          variant="ghost"
          label={t('common.back')}
          onPress={() => router.back()}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  boxes: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foot: {
    padding: 24,
    marginTop: 'auto',
  },
});
