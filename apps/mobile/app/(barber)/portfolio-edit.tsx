// Barber Portfolio Edit screen.
// Cover image, avatar, public profile fields, services editor, photo grid.

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Text } from '../../src/atoms/Text';
import { Button } from '../../src/atoms/Button';
import { Avatar } from '../../src/atoms/Avatar';
import { Input } from '../../src/atoms/Input';
import { Icon } from '../../src/atoms/Icon';
import { ScreenHeader } from '../../src/molecules/ScreenHeader';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { useAuthStore } from '../../src/lib/auth';
import { queryKeys } from '../../src/lib/query';
import {
  getBarberMe,
  getBarberServices,
  updateBarberServices,
  updateBarberProfile,
  uploadBarberPortfolioImages,
  uploadBarberAvatar,
  deleteBarberPortfolioImage,
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
  const setBarber = useAuthStore((s) => s.setBarber);

  // Percentage width + aspectRatio on photoCell collapses to zero size on
  // this RN/Yoga version, so the cell size is computed from the window width
  // instead (matches styles.section's marginHorizontal:20 and
  // styles.photoGrid's gap:8, for a 3-column grid).
  const { width: windowWidth } = useWindowDimensions();
  const photoCellSize = (windowWidth - 20 * 2 - 8 * 2) / 3;

  const [displayName, setDisplayName] = useState(
    barber ? `${barber.firstName} ${barber.lastName}` : ''
  );
  const [title, setTitle] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
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

  // Shares its query key with (barber)/(tabs)/profile.tsx and
  // (barber)/settings.tsx so an upload/delete here invalidates their cached
  // copy too.
  const barberMeQuery = useQuery({
    queryKey: ['barber', 'me'],
    queryFn: getBarberMe,
    staleTime: 60 * 1000,
  });
  const photos = barberMeQuery.data?.barber.images ?? [];

  // Photo URLs are short-lived S3 presigned URLs (see fileStorage.ts); an
  // expired one 403s silently in <Image>. Refetch once per slot to pick up a
  // freshly-signed URL instead of leaving a permanently blank tile — capped
  // to one retry per slot so a genuinely broken image doesn't refetch forever.
  const retriedPhotoSlotsRef = useRef<Set<number>>(new Set());
  const handlePhotoImageError = (idx: number) => {
    if (retriedPhotoSlotsRef.current.has(idx)) return;
    retriedPhotoSlotsRef.current.add(idx);
    barberMeQuery.refetch();
  };

  useEffect(() => {
    const years = barberMeQuery.data?.barber.experienceYears;
    if (typeof years === 'number') {
      setExperienceYears(String(years));
    }
    if (barberMeQuery.data?.barber.title) {
      setTitle(barberMeQuery.data.barber.title);
    }
    if (barberMeQuery.data?.barber.bio) {
      setBio(barberMeQuery.data.barber.bio);
    }
  }, [barberMeQuery.data]);

  // Photos and profile fields (name, experienceYears, ...) also surface on
  // the client-facing side (barber list, banner, individual shop page) via
  // the same underlying barber record — those queries must be invalidated
  // too, or a barber previewing their own public profile right after saving
  // sees stale data until the 5-minute staleTime lapses or they sign out
  // (queryClient.clear() in auth.ts only covers the cross-session case).
  const invalidatePublicBarberQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['barber', 'me'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.barbers });
    queryClient.invalidateQueries({ queryKey: queryKeys.banner });
    queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
  };

  const uploadPhotoMutation = useMutation({
    mutationFn: (base64DataUrl: string) =>
      uploadBarberPortfolioImages([base64DataUrl]),
    onSuccess: invalidatePublicBarberQueries,
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (base64DataUrl: string) => uploadBarberAvatar(base64DataUrl),
    onSuccess: async (url) => {
      if (url && barber) {
        await setBarber({ ...barber, avatar: url });
      }
      invalidatePublicBarberQueries();
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (index: number) => deleteBarberPortfolioImage(index),
    onSuccess: invalidatePublicBarberQueries,
  });

  async function onAddPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    // Resize/compress before upload — same rationale as the client avatar
    // flow in profile-edit.tsx: raw photos can be several MB, well over the
    // API's JSON body limit once base64-encoded.
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!manipulated.base64) return;

    uploadPhotoMutation.mutate(`data:image/jpeg;base64,${manipulated.base64}`);
  }

  async function onChangeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 512 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!manipulated.base64) return;

    uploadAvatarMutation.mutate(`data:image/jpeg;base64,${manipulated.base64}`);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [firstName, ...rest] = displayName.trim().split(' ');
      const lastName = rest.join(' ');
      await updateBarberProfile({
        firstName,
        lastName,
        experienceYears: experienceYears.trim() === '' ? undefined : Number(experienceYears),
        title: title.trim(),
        bio: bio.trim(),
      });
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
      invalidatePublicBarberQueries();
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
        title={t('barber.portfolio')}
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
        {/* Cover — shows the same photo as the avatar below it (the app has
            no separate banner image; this is the barber's one public photo,
            also used as the hero image on their client-facing shop page). */}
        <View style={styles.coverWrap}>
          <Pressable
            onPress={onChangeAvatar}
            disabled={uploadAvatarMutation.isPending}
            style={[
              styles.cover,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {barber?.avatar ? (
              <Image
                source={{ uri: barber.avatar }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <Icon name="user" size={40} color={theme.colors.muted} />
            )}
            <View
              style={[
                styles.coverOverlay,
                { backgroundColor: `${theme.colors.bg}66` },
              ]}
            >
              <View
                style={[
                  styles.coverEditBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {uploadAvatarMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.fg} />
                ) : (
                  <Icon name="camera" size={14} color={theme.colors.fg} />
                )}
              </View>
            </View>
          </Pressable>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Pressable onPress={onChangeAvatar} disabled={uploadAvatarMutation.isPending}>
              <Avatar
                size={88}
                uri={barber?.avatar ?? undefined}
                initials={`${barber?.firstName?.[0] ?? ''}${barber?.lastName?.[0] ?? ''}`}
                ring
              />
              {uploadAvatarMutation.isPending ? (
                <View style={[StyleSheet.absoluteFillObject, styles.avatarOverlay]}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : null}
              <View
                style={[
                  styles.avatarEdit,
                  {
                    backgroundColor: theme.colors.accent,
                    borderColor: theme.colors.surface,
                  },
                ]}
              >
                <Icon name="camera" size={12} color={theme.colors.onAccent} />
              </View>
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
              label={t('portfolioEdit.experienceYears')}
              value={experienceYears}
              onChangeText={(text) => setExperienceYears(text.replace(/[^0-9]/g, ''))}
              placeholder={t('portfolioEdit.experienceYearsPlaceholder')}
              keyboardType="number-pad"
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
            {photos.map((uri, idx) => {
              const isDeleting =
                deletePhotoMutation.isPending &&
                deletePhotoMutation.variables === idx;
              return (
                <View
                  key={uri}
                  style={[
                    styles.photoCell,
                    {
                      width: photoCellSize,
                      height: photoCellSize,
                      backgroundColor: theme.colors.surface2,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Image
                    source={{ uri }}
                    style={styles.photoImage}
                    contentFit="cover"
                    transition={120}
                    onError={() => handlePhotoImageError(idx)}
                  />
                  {isDeleting ? (
                    <View style={[StyleSheet.absoluteFillObject, styles.photoOverlay]}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => deletePhotoMutation.mutate(idx)}
                      disabled={deletePhotoMutation.isPending}
                      style={[
                        styles.photoDelete,
                        { backgroundColor: theme.colors.danger },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t('portfolioEdit.removePhoto')}
                    >
                      <Icon name="x" size={10} color="#fff" />
                    </Pressable>
                  )}
                </View>
              );
            })}

            <Pressable
              onPress={onAddPhoto}
              disabled={uploadPhotoMutation.isPending}
              style={[
                styles.photoCell,
                {
                  width: photoCellSize,
                  height: photoCellSize,
                  backgroundColor: theme.colors.surface2,
                  borderColor: theme.colors.border,
                  borderStyle: 'dashed',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('portfolioEdit.addPhoto')}
            >
              {uploadPhotoMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Icon name="plus" size={20} color={theme.colors.muted} />
              )}
            </Pressable>
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
  avatarOverlay: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
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
