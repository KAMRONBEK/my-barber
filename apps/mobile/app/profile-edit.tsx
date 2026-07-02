// Profile Edit screen. Fetches current user via GET /client/getMe.
// PUT /client/update with changed fields on Save.

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
import { isAxiosError } from 'axios';
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
import { useLocationPickerStore } from '../src/lib/locationPicker';
import type { AppTheme } from '../src/lib/restyle';

export default function ProfileEditScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const setClient = useAuthStore((s) => s.setClient);

  const { data: profile, isLoading, isError, refetch } = useQuery({
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

  const pickedLocation = useLocationPickerStore((s) => s.result);
  const clearPickedLocation = useLocationPickerStore((s) => s.clear);

  // Pre-fill form when profile data arrives
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setUsername(profile.username ?? '');
      setPhone(profile.phone ?? '');
      setLocation(profile.location ?? '');
    }
  }, [profile]);

  // Apply an address picked from the map screen, then clear the hand-off.
  useEffect(() => {
    if (pickedLocation) {
      setLocation(pickedLocation.address);
      clearPickedLocation();
    }
  }, [pickedLocation, clearPickedLocation]);

  async function onSave() {
    setSaving(true);
    setSaveError(null);
    try {
      // Username changes require a password confirmation and go through
      // /client/update-credentials, not this endpoint — the field here is
      // display-only.
      await api.put('/client/update', { firstName, lastName, phone, location });
      const fresh = await refetch();
      if (fresh.data) {
        await setClient(fresh.data);
      }
      router.back();
    } catch (err) {
      const serverMessage =
        isAxiosError<{ error?: string }>(err) && err.response?.data?.error
          ? err.response.data.error
          : null;
      setSaveError(serverMessage ?? t('common.error'));
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
                editable={false}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                testID="edit-username"
                style={{ opacity: 0.6 }}
              />
              <Input
                label={t('profileEdit.phone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                testID="edit-phone"
              />
              <View style={styles.wrap}>
                <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
                  {t('profileEdit.location')}
                </Text>
                <Pressable
                  onPress={() => router.push('/location-picker')}
                  style={[
                    styles.locationField,
                    {
                      backgroundColor: theme.colors.surface2,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('map.selectLocation')}
                  testID="edit-location"
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: location ? theme.colors.fg : theme.colors.muted2,
                    }}
                    numberOfLines={1}
                  >
                    {location || t('map.selectLocation')}
                  </Text>
                  <Icon name="map" size={18} color={theme.colors.accent} />
                </Pressable>
              </View>
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
  wrap: {
    width: '100%',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  locationField: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foot: {
    padding: 24,
    paddingTop: 20,
  },
});
