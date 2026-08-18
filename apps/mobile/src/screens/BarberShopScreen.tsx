// Barber portfolio / detail screen. Photo hero (avatar, or a neutral
// gradient fallback) with identity + rating overlaid, persistent bio +
// book CTA, then a segmented tab control: Schedule / Services / Portfolio /
// Reviews.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { BackButton } from '../atoms/BackButton';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import { ScreenLayout } from '../templates/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../navigation/GlassTabBar';
import { getBarbers, getBarberReviews, type ApiBarberFull } from '../lib/api';
import { useFavoriteBarbers } from '../hooks/useFavoriteBarbers';
import { hapticToggle } from '../lib/haptics';
import { queryKeys, STALE } from '../lib/query';
import {
  formatUZS,
  formatAmountGrouped,
  formatDurationMinutes,
  formatWeekdayLong,
  formatDayMonth,
  startOfDay,
  addDays,
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
  formatDistanceKm,
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

  // The header (back/share/heart) is fixed in screen space, overlaid on the
  // photo hero — its glass/white styling only reads once the dark photo is
  // still behind it. Past HEADER_SOLID_RANGE of scroll, the photo has
  // scrolled out from under the fixed header into the light content below,
  // so the pills crossfade to an opaque light background + dark icons.
  const HEADER_SOLID_RANGE: [number, number] = [150, 300];
  const scrollY = useSharedValue(0);
  const [headerSolid, setHeaderSolid] = useState(false);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  useAnimatedReaction(
    () => scrollY.value > (HEADER_SOLID_RANGE[0] + HEADER_SOLID_RANGE[1]) / 2,
    (isPast, wasPast) => {
      if (isPast !== wasPast) {
        runOnJS(setHeaderSolid)(isPast);
      }
    },
  );
  const headerPillStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      HEADER_SOLID_RANGE,
      [0, 1],
      'clamp',
    );
    return {
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        ['rgba(255,255,255,0.12)', theme.colors.surface],
      ),
      borderColor: interpolateColor(
        progress,
        [0, 1],
        ['rgba(255,255,255,0.18)', theme.colors.borderStrong],
      ),
    };
  });

  // Percentage width + aspectRatio on portfolioTile collapses to zero size on
  // this RN/Yoga version, so the tile size is computed from the window width
  // instead (matches styles.section's paddingHorizontal:20 and
  // styles.portfolioGrid's gap:8).
  const { width: windowWidth } = useWindowDimensions();
  const portfolioTileWidth = (windowWidth - 20 * 2 - 8) / 2;
  const portfolioTileHeight = portfolioTileWidth / 0.85;

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

  // The API only exposes a single workingHours string (e.g. "09:00 - 18:00")
  // applied every day — there's no per-day schedule yet — so the weekly list
  // below repeats it across Mon–Sun and only distinguishes "today".
  const weekDays = useMemo(() => {
    const now = new Date();
    const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
    const monday = addDays(startOfDay(now), mondayOffset);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

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
      ? formatDistanceKm(distanceKm(userCoordinate, realBarberCoordinate))
      : String.fromCharCode(8212);
  const addressLabel =
    formatBarberAddress(barber.location) ??
    `${barber.firstName} ${barber.lastName}`;
  const initials = `${barber.firstName[0] ?? ''}${barber.lastName[0] ?? ''}`;
  const isFavorited = favoriteIds.has(barber.id);
  const isFavoritePending = pendingIds.has(barber.id);

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'bio', label: t('barber.schedule') },
    { key: 'services', label: t('barber.services') },
    { key: 'portfolio', label: t('barber.portfolio') },
    { key: 'reviews', label: t('barber.reviews') },
  ];

  return (
    // contentStyle backgroundColor matches the cover's dark fallback/scrim
    // tone so the iOS overscroll bounce at the top reveals more of the same
    // dark cover instead of flashing the screen's light bg.
    <ScreenLayout edgeToEdgeTop contentStyle={{ backgroundColor: '#0a0a0a' }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: theme.colors.bg, paddingBottom: tabBarPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover: barber's avatar, or a neutral gradient + initials if unset */}
        <View style={styles.cover}>
          {barber.avatar ? (
            <Image
              source={{ uri: barber.avatar }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <LinearGradient
              colors={['#2c2c2c', '#1a1a1a', '#0d0d0d']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            >
              <View style={styles.coverInitialsWrap}>
                <Text style={styles.coverInitials}>{initials}</Text>
              </View>
            </LinearGradient>
          )}
          {/* Bottom scrim for text legibility over photo or fallback alike */}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.88)']}
            start={{ x: 0.5, y: 0.35 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Bottom: name/title + rating badge */}
          <View style={styles.coverBottom}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.coverName} numberOfLines={1}>
                  {barber.firstName} {barber.lastName}
                </Text>
                <Icon name="verified" size={16} color={theme.colors.muted2} />
              </View>
              {barber.title ? (
                <Text style={styles.coverTitle} numberOfLines={1}>
                  {barber.title}
                </Text>
              ) : null}
            </View>
            <View style={[styles.ratingBadge, styles.iconBtnDark]}>
              <Icon name="star" size={12} color="#fff" />
              <Text style={styles.ratingBadgeText}>
                {rating ? rating.toFixed(1) : String.fromCharCode(8212)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats: experience / distance / price-from */}
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
            value={minPrice != null ? formatAmountGrouped(minPrice) : String.fromCharCode(8212)}
            label={t('barber.priceLabel')}
            accent
          />
        </View>

        {/* Persistent bio */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
            {t('barber.aboutMe')}
          </Text>
          {barber.bio ? (
            <Text style={{ marginTop: 8, color: theme.colors.fg2, fontSize: 14, lineHeight: 22 }}>
              {barber.bio}
            </Text>
          ) : (
            <Text style={{ marginTop: 8, color: theme.colors.muted }}>{t('common.empty')}</Text>
          )}
        </View>

        {/* Inline book CTA */}
        <View style={styles.section}>
          <Button
            label={t('barber.bookSeat')}
            fullWidth
            onPress={() => router.push(`/booking/${barber.id}`)}
          />
        </View>

        {/* Segmented tab control — single continuous track, inset active pill */}
        <View
          style={[
            styles.segmentedTrack,
            { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
          ]}
        >
          {TABS.map(({ key, label }) => (
            <Segment
              key={key}
              label={label}
              isActive={activeTab === key}
              onPress={() => setActiveTab(key)}
              theme={theme}
            />
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'bio' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {t('barber.schedule')}
            </Text>
            <View style={{ marginTop: 8, gap: 8 }}>
              {weekDays.map((d) => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <View
                    key={d.toISOString()}
                    style={[
                      styles.scheduleRow,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isToday ? (
                        <View
                          style={[styles.scheduleDot, { backgroundColor: theme.colors.success }]}
                        />
                      ) : null}
                      <Text style={{ fontSize: 14, color: theme.colors.fg }}>
                        {formatWeekdayLong(d)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: theme.colors.muted }}>
                      {barber.workingHours ?? String.fromCharCode(8212)}
                    </Text>
                  </View>
                );
              })}
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
                initials={initials}
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
                  <View
                    key={`${uri}-${i}`}
                    style={[
                      styles.portfolioTile,
                      { width: portfolioTileWidth, height: portfolioTileHeight },
                    ]}
                  >
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

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Fixed header — stays put while the cover/content scroll beneath it.
          Crossfades from glass/white (over the photo) to a solid light pill
          with dark icons once scrolled past it, via headerPillStyle. */}
      <View
        style={[styles.coverTop, { top: insets.top + 12 }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Animated.View style={[StyleSheet.absoluteFillObject, styles.iconBtnPill, headerPillStyle]} />
          <Icon name="back" size={18} color={headerSolid ? theme.colors.fg : '#fff'} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={styles.iconBtn}>
            <Animated.View style={[StyleSheet.absoluteFillObject, styles.iconBtnPill, headerPillStyle]} />
            <Icon name="share" size={18} color={headerSolid ? theme.colors.fg : '#fff'} />
          </View>
          <Pressable
            onPress={() => {
              hapticToggle();
              toggleFavorite(barber.id);
            }}
            disabled={isFavoritePending}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t('barber.saveToggle')}
          >
            <Animated.View style={[StyleSheet.absoluteFillObject, styles.iconBtnPill, headerPillStyle]} />
            {isFavoritePending ? (
              <ActivityIndicator size="small" color={headerSolid ? theme.colors.fg : '#fff'} />
            ) : (
              <Icon
                name={isFavorited ? 'heart-filled' : 'heart'}
                size={18}
                color={
                  !headerSolid
                    ? '#fff'
                    : isFavorited
                      ? theme.colors.accent
                      : theme.colors.fg
                }
              />
            )}
          </Pressable>
        </View>
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

const SEGMENT_ANIM_DURATION = 220;

const Segment: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
  theme: AppTheme;
}> = ({ label, isActive, onPress, theme }) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, { duration: SEGMENT_ANIM_DURATION });
  }, [isActive, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', theme.colors.surface],
    ),
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.1]),
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.segment}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.segmentPill,
          pillStyle,
          { shadowColor: theme.colors.fg, elevation: isActive ? 2 : 0 },
        ]}
      />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: isActive ? theme.colors.fg : theme.colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
    height: 380,
    position: 'relative',
  },
  coverInitialsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInitials: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverBottom: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  coverName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  coverTitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  ratingBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  statsBar: {
    marginTop: 16,
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
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  segmentedTrack: {
    marginTop: 20,
    marginHorizontal: 20,
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPill: {
    borderRadius: 999,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scheduleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
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
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#171717',
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
});
