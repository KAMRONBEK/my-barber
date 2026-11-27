// Login screen. Matches OD's 03-login.html shape.
// Apple and Google sign-in are commented out until the product decides whether
// it needs them; the blocks are kept so they can be restored.

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  // Platform, // used by the commented-out Apple sign-in button
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { BackButton } from '../atoms/BackButton';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { ScreenLayout } from '../templates/ScreenLayout';
import { PhoneInput } from '../molecules/PhoneInput';
import { phoneFromLocal } from '../lib/phone';
import { loginClient, loginBarber } from '../lib/api';
import { useAuthStore } from '../lib/auth';
import { authErrorKey } from '../lib/authErrors';
import { getItem } from '../lib/storage';
import type { AppTheme } from '../lib/restyle';

// There is no self-service password reset (no email or SMS), so the link calls
// support and only appears when a support number is configured.
const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim();

export const LoginScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);

  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  // Clients sign in with their phone; older accounts still have a username.
  const [byUsername, setByUsername] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaTapCount, setQaTapCount] = useState(0);
  const [role, setRole] = useState<'client' | 'barber' | null>(null);

  useEffect(() => {
    async function loadRole() {
      const r = await getItem('role');
      if (r === 'client' || r === 'barber') setRole(r);
    }
    void loadRole();
  }, []);

  const usesPhone = role !== 'barber' && !byUsername;
  const identifier = usesPhone ? (phoneFromLocal(phone) ?? '') : username.trim();

  async function onSubmit() {
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);
    try {
      if (role === 'barber') {
        const { token, barber } = await loginBarber(identifier, password);
        await signIn(token, barber, 'barber');
      } else {
        const { token, client } = await loginClient(identifier, password);
        await signIn(token, client, 'client');
      }
      // The root layout navigates once the session exists.
    } catch (e) {
      setError(t(authErrorKey(e, 'auth.loginFailed')));
    } finally {
      setSubmitting(false);
    }
  }

  function onForgotPassword() {
    Alert.alert(
      t('auth.forgotPassword'),
      t('auth.forgotPasswordHelp', { phone: SUPPORT_PHONE }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.callSupport'), onPress: () => void Linking.openURL(`tel:${SUPPORT_PHONE}`) },
      ],
    );
  }

  // function onAppleSignIn() {
  //   // TODO: implement with expo-apple-authentication once installed.
  //   // import * as AppleAuthentication from 'expo-apple-authentication';
  //   // const credential = await AppleAuthentication.signInAsync({ ... });
  // }
  //
  // function onGoogleSignIn() {
  //   // TODO: implement with @react-native-google-signin/google-signin once installed.
  //   // import { GoogleSignin } from '@react-native-google-signin/google-signin';
  //   // const { idToken } = await GoogleSignin.signIn();
  // }

  function handleQaTap() {
    const next = (qaTapCount + 1) % 3;
    setQaTapCount(next);
    setByUsername(next !== 0);
    if (next === 1) {
      setUsername('client@test.local');
      setPassword('DevTest12345');
    } else if (next === 2) {
      setUsername('barber@test.local');
      setPassword('DevTest12345');
    } else {
      setUsername('');
      setPassword('');
    }
  }

  return (
    <ScreenLayout>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.top}>
          {router.canGoBack() ? (
            <BackButton testID="login-back" />
          ) : (
            <Pressable
              onPress={() => router.push('/select-role')}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  opacity: pressed ? 0.85 : 1,
                  backgroundColor: theme.colors.surface2,
                  borderColor: theme.colors.border,
                  width: undefined,
                  paddingHorizontal: 12,
                },
              ]}
              accessibilityRole="button"
              testID="login-switch-role"
            >
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: 12,
                  fontWeight: '500',
                }}
                numberOfLines={1}
              >
                {t('auth.switchRole')}
              </Text>
            </Pressable>
          )}
          {__DEV__ && (
            <Pressable
              onPress={handleQaTap}
              style={styles.qaBtn}
              testID="login-qa-fill"
            />
          )}
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              {t(
                role === 'barber'
                  ? 'auth.signInBodyBarber'
                  : usesPhone
                    ? 'auth.signInBodyPhone'
                    : 'auth.signInBody',
              )}
            </Text>
          </View>

          {/* Apple and Google sign-in, disabled until we decide we need them.
          <View style={styles.social}>
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
          */}

          <View style={styles.body}>
            {usesPhone ? (
              <PhoneInput
                label={t('signup.phone')}
                value={phone}
                onChangeText={setPhone}
                testID="login-phone"
              />
            ) : (
              <Input
                label={t('auth.username')}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                testID="login-username"
              />
            )}
            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              testID="login-password"
              errorText={error ?? undefined}
            />

            {role !== 'barber' && (
              <Pressable
                onPress={() => {
                  setByUsername((v) => !v);
                  setError(null);
                }}
                style={styles.switchWrap}
                accessibilityRole="button"
                testID="login-switch-identifier"
              >
                <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '500' }}>
                  {t(byUsername ? 'auth.signInByPhone' : 'auth.signInByUsername')}
                </Text>
              </Pressable>
            )}

            {SUPPORT_PHONE ? (
              <Pressable
                onPress={onForgotPassword}
                style={styles.forgotWrap}
                accessibilityRole="link"
                testID="login-forgot-password"
              >
                <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '500' }}>
                  {t('auth.forgotPassword')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.foot}>
            <Button
              fullWidth
              label={submitting ? t('common.loading') : t('auth.signIn')}
              onPress={onSubmit}
              disabled={
                !identifier || password.length === 0 || submitting
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
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    paddingTop: 8,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  head: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
  },
  // social, socialBtn, googleBadge and the divider styles, for the disabled buttons:
  // social: {
  //   paddingHorizontal: 24,
  //   gap: 10,
  // },
  // socialBtn: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   height: 50,
  //   borderRadius: 999,
  //   paddingHorizontal: 20,
  //   gap: 8,
  // },
  // googleBadge: {
  //   width: 22,
  //   height: 22,
  //   borderRadius: 4,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  // dividerRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   paddingHorizontal: 24,
  //   marginVertical: 16,
  // },
  // dividerLine: {
  //   flex: 1,
  //   height: StyleSheet.hairlineWidth,
  // },
  body: {
    paddingHorizontal: 24,
  },
  switchWrap: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 4,
  },
  foot: { padding: 24 },
  qaBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
  },
});
