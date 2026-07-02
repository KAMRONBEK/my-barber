import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../src/atoms/Text';
import { Input } from '../../src/atoms/Input';
import { Button } from '../../src/atoms/Button';
import { Avatar } from '../../src/atoms/Avatar';
import { ScreenHeader } from '../../src/molecules/ScreenHeader';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { getBarberMe, updateBarberProfile } from '../../src/lib/api';
import { useAuthStore } from '../../src/lib/auth';
import {
  BARBER_TAB_BAR_PILL_HEIGHT,
  BARBER_TAB_BAR_BOTTOM_OFFSET,
} from '../../src/navigation/BarberTabBar';
import type { AppTheme } from '../../src/lib/restyle';

export default function BarberSettingsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const setBarber = useAuthStore((s) => s.signIn);

  const tabBarPadding =
    BARBER_TAB_BAR_PILL_HEIGHT +
    Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) +
    8;

  const { data, isLoading } = useQuery({
    queryKey: ['barber-me'],
    queryFn: getBarberMe,
    staleTime: 30_000,
  });

  const barber = data?.barber;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (barber) {
      setFirstName(barber.firstName ?? '');
      setLastName(barber.lastName ?? '');
      setPhone(barber.phone ?? '');
    }
  }, [barber]);

  const saveMutation = useMutation({
    mutationFn: () => updateBarberProfile({ firstName, lastName, phone }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['barber-me'] });
      router.back();
    },
  });

  async function onSave() {
    setSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarPadding }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title={t('profileEdit.title')}
            right={
              <Button
                variant="ghost"
                label={t('common.save')}
                onPress={onSave}
                disabled={saving}
              />
            }
          />

          {/* Avatar */}
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <Avatar
              size={96}
              uri={barber?.avatar ?? undefined}
              initials={`${barber?.firstName?.[0] ?? ''}${barber?.lastName?.[0] ?? ''}`}
              ring
            />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: 0.06,
                  color: theme.colors.muted,
                  marginBottom: 6,
                }}
              >
                {t('profileEdit.firstName')}
              </Text>
              <Input
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('profileEdit.firstName')}
              />
            </View>

            <View style={styles.field}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: 0.06,
                  color: theme.colors.muted,
                  marginBottom: 6,
                }}
              >
                {t('profileEdit.lastName')}
              </Text>
              <Input
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('profileEdit.lastName')}
              />
            </View>

            <View style={styles.field}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: 0.06,
                  color: theme.colors.muted,
                  marginBottom: 6,
                }}
              >
                {t('profileEdit.phone')}
              </Text>
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder={t('profileEdit.phone')}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    marginHorizontal: 20,
    marginTop: 24,
    gap: 16,
  },
  field: {
    backgroundColor: 'transparent',
  },
});
