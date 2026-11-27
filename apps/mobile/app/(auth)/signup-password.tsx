// Sign-up, step 2: the password, typed twice to catch typos. Creating the
// account signs the user in; the root layout then navigates.

import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../../src/atoms/Text';
import { BackButton } from '../../src/atoms/BackButton';
import { Input } from '../../src/atoms/Input';
import { Button } from '../../src/atoms/Button';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { registerBarber, registerClient } from '../../src/lib/api';
import { useAuthStore } from '../../src/lib/auth';
import { authErrorKey } from '../../src/lib/authErrors';
import { useSignupDraftStore } from '../../src/lib/signupDraft';
import { passwordErrors, type PasswordErrors } from '../../src/lib/signupForm';
import type { AppTheme } from '../../src/lib/restyle';

export default function SignupPasswordScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);
  const draft = useSignupDraftStore((s) => s.draft);
  const reject = useSignupDraftStore((s) => s.reject);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Opened without the first step (a deep link, or a reloaded app).
  useEffect(() => {
    if (!draft) router.replace('/(auth)/signup' as any);
  }, [draft, router]);

  async function onSubmit() {
    if (!draft) return;
    Keyboard.dismiss();
    const problems = passwordErrors(password, confirm);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);
    setFailure(null);
    try {
      if (draft.role === 'barber') {
        const { token, barber } = await registerBarber({ ...draft.body, password });
        await signIn(token, barber, 'barber');
      } else {
        const { token, client } = await registerClient({ ...draft.body, password });
        await signIn(token, client, 'client');
      }
    } catch (error) {
      const key = authErrorKey(error, 'signup.errors.failed');
      // A taken phone or username is fixed on the first screen.
      if (key === 'signup.errors.phoneTaken') {
        reject({ phone: key });
        router.back();
      } else if (key === 'signup.errors.usernameTaken') {
        reject({ username: key });
        router.back();
      } else {
        setFailure(t(key));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenLayout>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.top}>
          <BackButton />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
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
              marginTop: 10,
              fontSize: 28,
              fontWeight: '700',
              color: theme.colors.fg,
              letterSpacing: -0.6,
            }}
          >
            {t('signup.passwordTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {t('signup.passwordBody')}
          </Text>

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({});
              setFailure(null);
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            placeholder={t('signup.passwordHint')}
            errorText={errors.password ? t(errors.password) : undefined}
            testID="signup-password"
          />
          <Input
            label={t('signup.passwordRepeat')}
            value={confirm}
            onChangeText={(text) => {
              setConfirm(text);
              setErrors({});
              setFailure(null);
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            errorText={errors.confirm ? t(errors.confirm) : undefined}
            testID="signup-password-confirm"
          />

          {failure ? (
            <Text
              style={{ color: theme.colors.danger, fontSize: 13, marginBottom: 12 }}
              accessibilityRole="alert"
            >
              {failure}
            </Text>
          ) : null}

          <Button
            fullWidth
            label={t('auth.createAccount')}
            onPress={onSubmit}
            loading={submitting}
            testID="signup-submit"
          />
        </ScrollView>
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
  },
});
