// Barber portfolio / detail screen. Tabs: Bio / Services / Portfolio / Reviews.
// LinearGradient cover scrim, segmented tab control, portfolio grid, review list.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { BackButton } from '../atoms/BackButton';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import { ScreenLayout } from '../templates/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../navigation/GlassTabBar';
import { shadows } from '@my-barber/ui';
import { getBarbers, getBarberReviews, type ApiBarberFull } from '../lib/api';
import { useFavoriteBarbers } from '../hooks/useFavoriteBarbers';
import { hapticToggle } from '../lib/haptics';
import { queryKeys, STALE } from '../lib/query';
import {
  formatUZS,
  formatDurationMinutes,
  formatPriceFrom,
  formatDayMonth,
} from '../lib/format';
import {
  DEFAULT_SERVICE_DURATION_MINUTES,
} from '@my-barber/types';
import type { AppTheme } from '../lib/restyle';
import { BarberMapPreview } from '../molecules/BarberMapPreview';
import {
  distanceKm,
  extractBarberCoordinate,
  formatBarberAddress,
  openBarberDirections,
  parseBarberCoordinate,
} from '../lib/maps';

type TabKey = 'bio' | 'services' | 'portfolio' | 'reviews';

export const BarberShopScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarPadding = TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_BOTTOM_OFFSET) + 8;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('bio');
  const { favoriteIds, pendingIds, toggleFavorite } = useFavoriteBarbers();

  const barbersQuery = useQuery({
    queryKey: queryKeys.barbers,
    queryFn: () => getBarbers(0, 50),
    staleTime: STALE.banner,
  });

  // Portfolio image URLs are short-lived S3 presigned URLs (see fileStorage.ts);
  // an expired one 403s silently in <Image>. Refetch once per slot to pick up
  // a freshly-signed URL instead of leaving a permanently blank tile — capped
  // to one retry per slot so a genuinely broken image doesn't refetch forever.
  const retriedPortfolioSlotsRef = useRef<Set<string>>(new Set());
  const handlePortfolioImageError = (slotKey: string) => {
    if (retriedPortfolioSlotsRef.current.has(slotKey)) return;
    retriedPortfolioSlotsRef.current.add(slotKey);
    barbersQuery.refetch();
  };

  const barber = useMemo<ApiBarberFull | undefined>(() => {
    return (barbersQuery.data ?? []).find((b) => b.id === id);
  }, [barbersQuery.data, id]);

  const minPrice = useMemo(() => {
    if (!barber?.services?.length) return null;
    return barber.services.reduce((min, s) => (s.price < min ? s.price : min), barber.services[0].price);
  }, [barber]);

  // Real distance needs the user's own position — only computed when
  // permission is granted; otherwise the stat honestly shows "—" below
  // rather than a guessed number.
  const [userCoordinate, setUserCoordinate] = useState<
    { latitude: number; longitude: number } | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        setUserCoordinate({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reviewsQuery = useQuery({
    queryKey: ['barber-reviews', id],
    queryFn: () => getBarberReviews(id as string),
    enabled: activeTab === 'reviews' && !!id,
    staleTime: 60 * 1000,
  });

  if (barbersQuery.isLoading && !barber) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <Text style={{ color: theme.colors.muted }}>{t('common.loading')}</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!barber) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
          <BackButton />
        </View>
      </ScreenLayout>
    );
  }

  const rating = barber.ratingAverage ?? 0;
  const barberIndex = (barbersQuery.data ?? []).findIndex((b) => b.id === id);
  const mapCoordinate = parseBarberCoordinate(
    barber.location,
    barberIndex >= 0 ? barberIndex : 0,
  );
  // Only a *real* barber coordinate counts — parseBarberCoordinate above
  // falls back to an approximate fixed point for map display, which must
  // never be used to compute a distance number presented as fact.
  const realBarberCoordinate = extractBarberCoordinate(barber.location);
  const distanceLabel =
    userCoordinate && realBarberCoordinate
      ? `${distanceKm(userCoordinate, realBarberCoordinate).toFixed(1).replace('.', ',')} km`
      : String.fromCharCode(8212);
  const addressLabel =
    formatBarberAddress(barber.location) ??
    `${barber.firstName} ${barber.lastName}`;

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'bio', label: t('barber.about') },
    { key: 'services', label: t('barber.services') },
    { key: 'portfolio', label: t('barber.portfolio') },
    { key: 'reviews', label: t('barber.reviews') },
  ];

  return (
    <ScreenLayout edgeToEdgeTop>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: theme.colors.bg, paddingBottom: tabBarPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover with LinearGradient scrim */}
        <View style={styles.cover}>
          {/* Full dark-warm gradient base */}
          <LinearGradient
            colors={['#140f0a', '#1a120c', '#1d150f']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Bottom scrim — transparent → #1d150f for text legibility */}
          <LinearGradient
            colors={['transparent', '#1d150f']}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* ID bar */}
          <View style={styles.idBar}>
            <Avatar
              size={76}
              uri={barber.avatar ?? undefined}
              initials={`${barber.firstName[0] ?? ''}${barber.lastName[0] ?? ''}`}
              ring
            />
            {/* idBar sits half on/half off the cover (bottom: -38, avatar
                bleeds across the seam by design) — the name/address text
                needs enough paddingBottom to stay entirely on the dark
                cover, or the address (styled for a dark background) goes
                nearly invisible against the light content below. */}
            <View style={{ flex: 1, paddingBottom: 46 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: '700',
                    letterSpacing: -0.4,
                  }}
                  numberOfLines={1}
                >
                  {barber.firstName} {barber.lastName}
                </Text>
                <Icon name="verified" size={16} color={theme.colors.accent} />
              </View>
              <Text
                style={{
                  marginTop: 4,
                  color: 'rgba(255,255,255,0.78)',
                  fontSize: 13,
                }}
                numberOfLines={1}
              >
                {addressLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats: star rating / experience / distance / price-from */}
        <View
          style={[
            styles.statsBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Stat
            value={rating ? rating.toFixed(1) : String.fromCharCode(8212)}
            label={t('barber.rating')}
            icon
          />
          <Stat
            value={
              typeof barber.experienceYears === 'number'
                ? t('barber.experienceYears', { years: barber.experienceYears })
                : String.fromCharCode(8212)
            }
            label={t('barber.experienceLabel')}
          />
          <Stat
            value={distanceLabel}
            label={t('barber.distance')}
          />
          <Stat
            value={minPrice != null ? formatUZS(minPrice) : String.fromCharCode(8212)}
            label={t('barber.priceLabel')}
            accent
          />
        </View>

        {/* Mini map */}
        <View
          style={[
            styles.mapWidget,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <BarberMapPreview
            coordinate={mapCoordinate}
            avatarUri={barber.avatar}
            initials={`${barber.firstName?.[0] ?? ''}${barber.lastName?.[0] ?? ''}`}
            rating={rating}
            height={160}
          />
          <View style={styles.mapMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Icon name="pin" size={16} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.fg }}>
                  {addressLabel}
                </Text>
                {barber.workingHours ? (
                  <Text
                    style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {barber.workingHours}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              style={[styles.navBtn, { backgroundColor: theme.colors.fg }]}
              onPress={() =>
                void openBarberDirections(mapCoordinate, { title: addressLabel })
              }
              accessibilityRole="button"
              accessibilityLabel={t('barber.directions')}
            >
              <Icon name="arrow-right" size={14} color={theme.colors.bg} />
              <Text style={{ color: theme.colors.bg, fontSize: 13, fontWeight: '600' }}>
                {t('barber.directions')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Segmented tab control */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key)}
                style={[
                  styles.tabChip,
                  isActive && styles.tabChipActive,
                  {
                    backgroundColor: isActive
                      ? 'rgba(42, 32, 24, 0.78)'
                      : theme.colors.surface2,
                    borderColor: isActive
                      ? 'rgba(255, 255, 255, 0.09)'
                      : theme.colors.border,
                  },
                ]}
                accessibilityRole="tab"
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isActive ? theme.colors.bg : theme.colors.fg,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        {activeTab === 'bio' ? (
          <View style={styles.section}>
            {barber.bio ? (
              <Text style={{ color: theme.colors.fg2, fontSize: 14, lineHeight: 22 }}>
                {barber.bio}
              </Text>
            ) : (
              <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
            )}
          </View>
        ) : null}

        {activeTab === 'services' ? (
          <View style={styles.section}>
            <View style={{ gap: 8 }}>
              {(barber.services ?? []).map((s) => {
                const duration =
                  s.durationMinutes && s.durationMinutes > 0
                    ? s.durationMinutes
                    : DEFAULT_SERVICE_DURATION_MINUTES;
                return (
                  <View
                    key={s.id}
                    style={[
                      styles.serviceRow,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: theme.colors.fg,
                        }}
                      >
                        {s.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.colors.muted,
                          marginTop: 2,
                        }}
                      >
                        {formatDurationMinutes(duration)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: theme.colors.fg,
                      }}
                    >
                      {formatUZS(s.price)}
                    </Text>
                  </View>
                );
              })}
              {(barber.services ?? []).length === 0 ? (
                <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {activeTab === 'portfolio' ? (
          <View style={styles.section}>
            {(barber.images ?? []).length === 0 ? (
              <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
            ) : (
              <View style={styles.portfolioGrid}>
                {(barber.images ?? []).map((uri, i) => (
                  <View key={`${uri}-${i}`} style={styles.portfolioTile}>
                    <Image
                      source={{ uri }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                      transition={120}
                      onError={() => handlePortfolioImageError(`${barber.id}:${i}`)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {activeTab === 'reviews' ? (
          <View style={styles.section}>
            {reviewsQuery.isLoading ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (reviewsQuery.data ?? []).length === 0 ? (
              <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {(reviewsQuery.data ?? []).map((review) => (
                  <View
                    key={review.id}
                    style={[
                      styles.reviewCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.reviewHead}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: theme.colors.fg,
                          flex: 1,
                        }}
                      >
                        {t('profile.role.client')}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.muted2 }}>
                        {formatDayMonth(new Date(review.createdAt))}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 2, marginVertical: 6 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Icon
                          key={i}
                          name="star"
                          size={12}
                          color={
                            i < review.rating
                              ? theme.colors.accent
                              : theme.colors.border
                          }
                        />
                      ))}
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.colors.fg2,
                        lineHeight: 20,
                      }}
                    >
                      {review.comment}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed overlay header — stays put while the cover/content scroll beneath it */}
      <View
        style={[styles.coverTop, { top: insets.top + 12 }]}
        pointerEvents="box-none"
      >
        <BackButton tone="dark" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.iconBtn, styles.iconBtnDark]}>
            <Icon name="share" size={18} color="#fff" />
          </View>
          <Pressable
            onPress={() => {
              hapticToggle();
              toggleFavorite(barber.id);
            }}
            disabled={pendingIds.has(barber.id)}
            style={[styles.iconBtn, styles.iconBtnDark]}
            accessibilityRole="button"
            accessibilityLabel={t('barber.saveToggle')}
          >
            {pendingIds.has(barber.id) ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon
                name={favoriteIds.has(barber.id) ? 'heart-filled' : 'heart'}
                size={18}
                color={favoriteIds.has(barber.id) ? theme.colors.accent : '#fff'}
              />
            )}
          </Pressable>
        </View>
      </View>

      {/* Floating CTA */}
      <View
        style={[
          styles.floating,
          shadows.floating,
          {
            bottom: Math.max(insets.bottom, 16) + 8,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.fg,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
            {t('barber.priceFrom')}
          </Text>
          <Text
            style={{
              color: theme.colors.fg,
              fontSize: 18,
              fontWeight: '700',
              letterSpacing: -0.3,
              fontVariant: ['tabular-nums'],
            }}
          >
            {minPrice != null ? formatPriceFrom(minPrice) : '—'}
          </Text>
        </View>
        <Button
          label={t('barber.bookSeat')}
          onPress={() => router.push(`/booking/${barber.id}`)}
        />
      </View>
    </ScreenLayout>
  );
};

const Stat: React.FC<{
  value: string;
  label: string;
  icon?: boolean;
  accent?: boolean;
}> = ({ value, label, icon, accent }) => {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.stat}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {icon ? (
          <Icon name="star" size={12} color={theme.colors.accent} />
        ) : null}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: accent ? theme.colors.accent : theme.colors.fg,
            letterSpacing: -0.2,
            fontVariant: ['tabular-nums'],
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      <Text
        style={{
          marginTop: 4,
          fontSize: 10,
          color: theme.colors.muted,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    height: 320,
    position: 'relative',
  },
  coverTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  idBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: -38,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  statsBar: {
    marginTop: 56,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  mapWidget: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
  },
  navBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  tabsScroll: {
    flexGrow: 0,
    marginTop: 16,
  },
  tabsRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioTile: {
    width: '48%',
    aspectRatio: 0.85,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1d150f',
  },
  reviewCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floating: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 999,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
