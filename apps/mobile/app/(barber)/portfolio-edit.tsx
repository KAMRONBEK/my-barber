// Barber Portfolio Edit screen.
// Cover image, avatar, public profile fields, services editor, photo grid.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../src/atoms/Text';
import { Button } from '../../src/atoms/Button';
import { Avatar } from '../../src/atoms/Avatar';
import { Input } from '../../src/atoms/Input';
import { Icon } from '../../src/atoms/Icon';
import { ScreenHeader } from '../../src/molecules/ScreenHeader';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { useAuthStore } from '../../src/lib/auth';
import {
  getBarberServices,
  updateBarberServices,
  updateBarberProfile,
  type ApiService,
} from '../../src/lib/api';
import type { AppTheme } from '../../src/lib/restyle';

export default function BarberPortfolioEditScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const barber = useAuthStore((s) => s.barber);

  const [displayName, setDisplayName] = useState(
    barber ? `${barber.firstName} ${barber.lastName}` : ''
  );
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [services, setServices] = useState<ApiService[]>([]);

  const servicesQuery = useQuery({
    queryKey: ['barber-services'],
    queryFn: getBarberServices,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (servicesQuery.data) {
      setServices(servicesQuery.data);
    }
  }, [servicesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [firstName, ...rest] = displayName.trim().split(' ');
      const lastName = rest.join(' ');
      await updateBarberProfile({ firstName, lastName });
      if (services.length > 0) {
        const payload = services.map((s) => ({
          name: s.name,
          price: s.price,
          durationMinutes: s.durationMinutes ?? 30,
          isActive: s.isActive ?? true,
          // Must be carried through — omitting it makes updateBarberServices
          // generate a fresh id every save, which duplicates the service in
          // Firestore instead of updating the existing one in place.
          catalogServiceId: s.catalogServiceId,
        }));
        await updateBarberServices(payload);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['barber-services'] });
      router.back();
    },
  });

  function toggleServiceActive(index: number) {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, isActive: !s.isActive } : s))
    );
  }

  function updateServiceField(
    index: number,
    field: keyof ApiService,
    value: string | number
  ) {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addService() {
    setServices((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        barberId: barber?.id ?? '',
        name: '',
        price: 0,
        durationMinutes: 30,
        isActive: true,
      },
    ]);
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  const isSaving = saveMutation.isPending;

  return (
    <ScreenLayout>
      <ScreenHeader
        title={t('portfolioEdit.portfolioEditTitle')}
        right={
          <Pressable
            onPress={() => saveMutation.mutate()}
            disabled={isSaving}
            style={styles.headerBtn}
            accessibilityRole="button"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Text style={{ color: theme.colors.accent, fontSize: 15, fontWeight: '600' }}>
                {t('common.save')}
              </Text>
            )}
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 20) + 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover */}
        <View style={styles.coverWrap}>
          <View
            style={[
              styles.cover,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon name="user" size={40} color={theme.colors.muted} />
            <View
              style={[
                styles.coverOverlay,
                { backgroundColor: `${theme.colors.bg}66` },
              ]}
            >
              <Pressable
                style={[
                  styles.coverEditBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                accessibilityRole="button"
              >
                <Icon name="settings" size={14} color={theme.colors.fg} />
              </Pressable>
            </View>
          </View>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Avatar
              size={88}
              uri={barber?.avatar ?? undefined}
              initials={`${barber?.firstName?.[0] ?? ''}${barber?.lastName?.[0] ?? ''}`}
              ring
            />
            <Pressable
              style={[
                styles.avatarEdit,
                {
                  backgroundColor: theme.colors.accent,
                  borderColor: theme.colors.surface,
                },
              ]}
              accessibilityRole="button"
            >
              <Icon name="settings" size={12} color={theme.colors.onAccent} />
            </Pressable>
          </View>
        </View>

        {/* Public profile */}
        <View style={styles.section}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.colors.muted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {t('portfolioEdit.publicProfile')}
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Input
              label={t('portfolioEdit.displayName')}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('portfolioEdit.displayNamePlaceholder')}
            />
            <Input
              label={t('portfolioEdit.title')}
              value={title}
              onChangeText={setTitle}
              placeholder={t('portfolioEdit.titlePlaceholder')}
            />
            <Input
              label={t('portfolioEdit.bio')}
              value={bio}
              onChangeText={setBio}
              placeholder={t('portfolioEdit.bioPlaceholder')}
              multiline
              numberOfLines={3}
              style={{ height: 80, paddingTop: 10, textAlignVertical: 'top' }}
            />
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.colors.muted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {t('barber.services')}
          </Text>

          {servicesQuery.isLoading ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <View style={{ gap: 10 }}>
              {services.map((svc, idx) => (
                <View
                  key={svc.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={[
                        styles.dragHandle,
                        { backgroundColor: theme.colors.surface2 },
                      ]}
                    >
                      <View style={styles.dragDot} />
                      <View style={styles.dragDot} />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: '600',
                        color: theme.colors.fg,
                      }}
                    >
                      {t('portfolioEdit.service')} #{idx + 1}
                    </Text>
                    <Switch
                      value={svc.isActive ?? true}
                      onValueChange={() => toggleServiceActive(idx)}
                      trackColor={{
                        false: theme.colors.border,
                        true: theme.colors.accent,
                      }}
                      thumbColor={theme.colors.surface}
                    />
                  </View>

                  <Input
                    label={t('portfolioEdit.serviceName')}
                    value={svc.name}
                    onChangeText={(v) => updateServiceField(idx, 'name', v)}
                    placeholder={t('portfolioEdit.serviceNamePlaceholder')}
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Input
                        label={t('portfolioEdit.price')}
                        value={svc.price ? String(svc.price) : ''}
                        onChangeText={(v) =>
                          updateServiceField(idx, 'price', Number(v.replace(/\D/g, '')))
                        }
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label={t('portfolioEdit.duration')}
                        value={
                          svc.durationMinutes ? String(svc.durationMinutes) : ''
                        }
                        onChangeText={(v) =>
                          updateServiceField(
                            idx,
                            'durationMinutes',
                            Number(v.replace(/\D/g, ''))
                          )
                        }
                        placeholder="30"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Pressable
                    onPress={() => removeService(idx)}
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    accessibilityRole="button"
                  >
                    <Text
                      style={{
                        color: theme.colors.danger,
                        fontSize: 13,
                        fontWeight: '500',
                      }}
                    >
                      {t('portfolioEdit.removeService')}
                    </Text>
                  </Pressable>
                </View>
              ))}

              <Button
                label={t('portfolioEdit.addService')}
                variant="secondary"
                onPress={addService}
                fullWidth
              />
            </View>
          )}
        </View>

        {/* Photo grid */}
        <View style={styles.section}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.colors.muted,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {t('portfolioEdit.photos')}
          </Text>

          <View style={styles.photoGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.photoCell,
                  {
                    backgroundColor: theme.colors.surface2,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Icon name="user" size={20} color={theme.colors.muted} />
                {i === 0 ? (
                  <Pressable
                    style={[
                      styles.photoDelete,
                      { backgroundColor: theme.colors.danger },
                    ]}
                    accessibilityRole="button"
                  >
                    <Icon name="back" size={10} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  coverWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cover: {
    width: '100%',
    height: 160,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 12,
  },
  coverEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    marginTop: -44,
    alignItems: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dragHandle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginRight: 8,
  },
  dragDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photoDelete: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
