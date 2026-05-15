// Login screen. Matches OD's 03-login.html shape.
// Social auth: Apple Sign-In (iOS only, expo-apple-authentication TODO),
// Google Sign-In (stub Pressable, @react-native-google-signin TODO).

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { ScreenLayout } from '../templates/ScreenLayout';
import { loginClient } from '../lib/api';
import { useAuthStore } from '../lib/auth';
import type { AppTheme } from '../lib/restyle';

export const LoginScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const { token, client } = await loginClient(username.trim(), password);
      await signIn(token, client);
      router.replace('/(tabs)');
    } catch {
      setError(t('auth.loginFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  function onAppleSignIn() {
    // TODO: implement with expo-apple-authentication once installed.
    // import * as AppleAuthentication from 'expo-apple-authentication';
    // const credential = await AppleAuthentication.signInAsync({ ... });
  }

  function onGoogleSignIn() {
    // TODO: implement with @react-native-google-signin/google-signin once installed.
    // import { GoogleSignin } from '@react-native-google-signin/google-signin';
    // const { idToken } = await GoogleSignin.signIn();
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
            {t('auth.welcomeBack')}
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
            {t('auth.signInTitle')}
          </Text>
          <Text
            style={{
              marginTop: 6,
              color: theme.colors.muted,
              fontSize: 15,
            }}
          >
            {t('auth.signInBody')}
          </Text>
        </View>

        {/* Social auth buttons */}
        <View style={styles.social}>
          {/* Apple Sign-In — iOS only */}
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={onAppleSignIn}
              style={({ pressed }) => [
                styles.socialBtn,
                {
                  backgroundColor: theme.colors.fg,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              testID="login-apple"
            >
              {/* Apple logo glyph — rendered as a text character */}
              <Text
                style={{ color: theme.colors.bg, fontSize: 18, marginRight: 8 }}
              >

              </Text>
              <Text
                style={{
                  color: theme.colors.bg,
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                {t('auth.continueWithApple')}
              </Text>
            </Pressable>
          ) : null}

          {/* Google Sign-In */}
          <Pressable
            onPress={onGoogleSignIn}
            style={({ pressed }) => [
              styles.socialBtn,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            testID="login-google"
          >
            {/* Google G pill using SVG-less text placeholder */}
            <View
              style={[
                styles.googleBadge,
                { backgroundColor: '#4285F4' },
              ]}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>G</Text>
            </View>
            <Text
              style={{
                color: theme.colors.fg,
                fontSize: 15,
                fontWeight: '600',
              }}
            >
              {t('auth.continueWithGoogle')}
            </Text>
          </Pressable>
        </View>

        {/* OR divider */}
        <View style={styles.dividerRow}>
          <View
            style={[styles.dividerLine, { backgroundColor: theme.colors.border }]}
          />
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1.4,
              marginHorizontal: 12,
            }}
          >
            {t('auth.orContinueWith')}
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: theme.colors.border }]}
          />
        </View>

        <View style={styles.body}>
          <Input
            label={t('auth.username')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            testID="login-username"
          />
          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            testID="login-password"
            errorText={error ?? undefined}
          />

          {/* Forgot password */}
          <Pressable
            onPress={() => router.push('/forgot-password')}
            style={styles.forgotWrap}
            accessibilityRole="link"
            testID="login-forgot-password"
          >
            <Text
              style={{
                color: theme.colors.accent,
                fontSize: 13,
                fontWeight: '500',
              }}
            >
              {t('auth.forgotPassword')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.foot}>
          <Button
            fullWidth
            label={submitting ? t('common.loading') : t('auth.signIn')}
            onPress={onSubmit}
            disabled={
              !username.trim() || password.length === 0 || submitting
            }
            loading={submitting}
            testID="login-submit"
          />
          <View style={{ height: 12 }} />
          <Button
            fullWidth
            variant="ghost"
            label={t('auth.createAccount')}
            onPress={() => router.push('/(auth)/signup')}
            testID="login-create-account"
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  social: {
    paddingHorizontal: 24,
    gap: 10,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 999,
    paddingHorizontal: 20,
    gap: 8,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  body: {
    paddingHorizontal: 24,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 4,
  },
  foot: { padding: 24 },
});
