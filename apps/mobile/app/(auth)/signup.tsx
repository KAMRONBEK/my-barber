// Sign-up, step 1: who you are. A client gives a name and phone; a barber the
// full application. Step 2 (signup-password) sets the password and creates the
// account.

import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../../src/atoms/Text';
import { BackButton } from '../../src/atoms/BackButton';
import { Input, type InputProps } from '../../src/atoms/Input';
import { Button } from '../../src/atoms/Button';
import { Icon } from '../../src/atoms/Icon';
import { PhoneInput } from '../../src/molecules/PhoneInput';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import type { UserRole } from '../../src/lib/auth';
import { useLocationPickerStore, type PickedLocation } from '../../src/lib/locationPicker';
import {
  EMPTY_SIGNUP_VALUES,
  buildBarberSignup,
  buildClientSignup,
  maskDate,
  maskTime,
  type SignupDetails,
  type SignupErrors,
  type SignupField,
} from '../../src/lib/signupForm';
import { useSignupDraftStore } from '../../src/lib/signupDraft';
import { getItem, STORAGE_KEYS } from '../../src/lib/storage';
import type { AppTheme } from '../../src/lib/restyle';

export default function SignupScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const setDraft = useSignupDraftStore((s) => s.setDraft);
  const rejected = useSignupDraftStore((s) => s.rejected);
  const clearRejected = useSignupDraftStore((s) => s.clearRejected);

  const [role, setRole] = useState<UserRole>('client');
  const [values, setValues] = useState(EMPTY_SIGNUP_VALUES);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [point, setPoint] = useState<PickedLocation | null>(null);

  const picked = useLocationPickerStore((s) => s.result);
  const clearPicked = useLocationPickerStore((s) => s.clear);

  useEffect(() => {
    void getItem(STORAGE_KEYS.role).then((stored) => {
      if (stored === 'barber') setRole('barber');
    });
  }, []);

  // The map screen hands its result back through the picker store.
  useEffect(() => {
    if (!picked) return;
    setPoint(picked);
    setValues((v) => ({ ...v, address: picked.address }));
    setErrors((e) => ({ ...e, address: undefined }));
    clearPicked();
  }, [picked, clearPicked]);

  // Step 2 sends us back when the phone or username is already taken.
  useEffect(() => {
    if (!rejected) return;
    setErrors(rejected);
    setFailure(t('signup.errors.checkFields'));
    clearRejected();
  }, [rejected, clearRejected, t]);

  const isBarber = role === 'barber';

  function field(
    name: SignupField,
    label: string,
    props: InputProps = {},
    mask?: (text: string) => string,
  ) {
    const errorKey = errors[name];
    return (
      <Input
        label={label}
        value={values[name]}
        onChangeText={(text) => {
          setValues((v) => ({ ...v, [name]: mask ? mask(text) : text }));
          setErrors((e) => ({ ...e, [name]: undefined }));
          setFailure(null);
        }}
        autoCorrect={false}
        errorText={errorKey ? t(errorKey) : undefined}
        testID={`signup-${name}`}
        {...props}
      />
    );
  }

  function onContinue() {
    Keyboard.dismiss();
    const result = isBarber
      ? { role: 'barber' as const, form: buildBarberSignup(values, point) }
      : { role: 'client' as const, form: buildClientSignup(values) };
    if (!result.form.ok) {
      setErrors(result.form.errors);
      setFailure(t('signup.errors.checkFields'));
      return;
    }
    setFailure(null);
    setDraft({ role: result.role, body: result.form.body } as SignupDetails);
    router.push('/(auth)/signup-password' as any);
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
          // The phone and date pads have no "done" key; dragging closes them.
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
            {t(isBarber ? 'signup.barberTitle' : 'signup.clientTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {t(isBarber ? 'signup.barberBody' : 'signup.clientBody')}
          </Text>

          {field('firstName', t('signup.firstName'), { textContentType: 'givenName' })}
          {field(
            'lastName',
            t(isBarber ? 'signup.lastName' : 'signup.lastNameOptional'),
            { textContentType: 'familyName' },
          )}
          {isBarber &&
            field('username', t('auth.username'), {
              autoCapitalize: 'none',
              textContentType: 'username',
            })}
          <PhoneInput
            label={t('signup.phone')}
            value={values.phone}
            onChangeText={(phone) => {
              setValues((v) => ({ ...v, phone }));
              setErrors((e) => ({ ...e, phone: undefined }));
              setFailure(null);
            }}
            errorText={errors.phone ? t(errors.phone) : undefined}
            testID="signup-phone"
          />

          {isBarber && (
            <>
              {field('address', t('signup.address'))}
              <Pressable
                onPress={() => {
                  clearPicked();
                  router.push('/location-picker' as any);
                }}
                style={styles.mapLink}
                accessibilityRole="button"
                testID="signup-pick-location"
              >
                <Icon name={point ? 'check' : 'pin'} size={16} color={theme.colors.accent} />
                <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '600' }}>
                  {t(point ? 'signup.pointSelected' : 'signup.pickOnMap')}
                </Text>
              </Pressable>
              {field(
                'birthDate',
                t('signup.birthDate'),
                { keyboardType: 'number-pad', placeholder: t('signup.birthDateHint') },
                maskDate,
              )}
              <View style={styles.row}>
                <View style={styles.flex}>
                  {field('opensAt', t('signup.opensAt'), { keyboardType: 'number-pad' }, maskTime)}
                </View>
                <View style={styles.flex}>
                  {field('closesAt', t('signup.closesAt'), { keyboardType: 'number-pad' }, maskTime)}
                </View>
              </View>
            </>
          )}

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
            label={t('common.continue')}
            onPress={onContinue}
            testID="signup-continue"
          />
          <View style={{ height: 12 }} />
          <Button
            fullWidth
            variant="ghost"
            label={t('signup.haveAccount')}
            onPress={() => router.replace('/(auth)/login' as any)}
            testID="signup-to-login"
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
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 16,
    paddingVertical: 4,
  },
  row: { flexDirection: 'row', gap: 12 },
});
