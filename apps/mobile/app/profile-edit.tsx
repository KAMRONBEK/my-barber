// Profile Edit screen. Fetches current user via GET /client/getMe.
// PATCH /client/me with changed fields on Save.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { BackButton, BACK_BUTTON_SIZE } from '../src/atoms/BackButton';
import { Input } from '../src/atoms/Input';
import { Button } from '../src/atoms/Button';
import { Icon } from '../src/atoms/Icon';
import { Avatar } from '../src/atoms/Avatar';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { getMe, api } from '../src/lib/api';
import { useAuthStore } from '../src/lib/auth';
import { queryKeys, STALE } from '../src/lib/query';
import type { AppTheme } from '../src/lib/restyle';

export default function ProfileEditScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const setClient = useAuthStore((s) => s.setClient);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    staleTime: STALE.me,
    enabled: !!useAuthStore.getState().token,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pre-fill form when profile data arrives
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setUsername(profile.username ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  async function onSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const r = await api.patch<{ ok: boolean; data: typeof profile }>(
        '/client/me',
        { firstName, lastName, username, phone, location },
      );
      if (r.data.ok && r.data.data) {
        await setClient(r.data.data as Parameters<typeof setClient>[0]);
      }
      router.back();
    } catch {
      setSaveError(t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <BackButton />
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: theme.colors.fg,
              flex: 1,
              textAlign: 'center',
            }}
          >
            {t('profileEdit.title')}
          </Text>
          <View style={{ width: BACK_BUTTON_SIZE }} />
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={{ color: theme.colors.danger }}>{t('common.error')}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar circle with camera overlay */}
            <View style={styles.avatarWrap}>
              <View>
                <Avatar
                  size={88}
                  uri={profile?.avatar ?? undefined}
                  initials={`${firstName[0] ?? ''}${lastName[0] ?? ''}`}
                  ring
                />
                <View
                  style={[
                    styles.cameraBtn,
                    { backgroundColor: theme.colors.accent },
                  ]}
                >
                  <Icon name="verified" size={14} color={theme.colors.onAccent} />
                </View>
              </View>
              <Pressable style={{ marginTop: 10 }} onPress={() => { /* TODO: image picker */ }}>
                <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: '500' }}>
                  {t('profileEdit.changePhoto')}
                </Text>
              </Pressable>
            </View>

            {/* Form fields */}
            <View style={styles.form}>
              <Input
                label={t('profileEdit.firstName')}
                value={firstName}
                onChangeText={setFirstName}
                textContentType="givenName"
                testID="edit-firstName"
              />
              <Input
                label={t('profileEdit.lastName')}
                value={lastName}
                onChangeText={setLastName}
                textContentType="familyName"
                testID="edit-lastName"
              />
              <Input
                label={t('profileEdit.username')}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                testID="edit-username"
              />
              <Input
                label={t('profileEdit.phone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                testID="edit-phone"
              />
              <Input
                label={t('profileEdit.location')}
                value={location}
                onChangeText={setLocation}
                testID="edit-location"
              />
            </View>

            {saveError ? (
              <Text
                style={{
                  color: theme.colors.danger,
                  fontSize: 13,
                  textAlign: 'center',
                  marginBottom: 8,
                  paddingHorizontal: 24,
                }}
              >
                {saveError}
              </Text>
            ) : null}

            <View style={styles.foot}>
              <Button
                fullWidth
                label={saving ? t('common.loading') : t('common.save')}
                onPress={onSave}
                disabled={saving}
                loading={saving}
                testID="edit-save"
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  scroll: {
    paddingBottom: 40,
  },
  avatarWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  form: {
    paddingHorizontal: 24,
    gap: 4,
  },
  foot: {
    padding: 24,
    paddingTop: 20,
  },
});
