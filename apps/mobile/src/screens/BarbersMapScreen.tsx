// Barbers map view. YandexMapView background with one marker per barber, a
// floating header, filter chips, and a bottom sheet with horizontal scrollable
// barber cards. Tapping a pin or a card selects that barber (active pin + camera
// focus); the camera auto-fits all pins on first load.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { YandexMapView, type YandexMapViewRef } from 'expo-yandex-mapkit';
import * as Location from 'expo-location';
import {
  DEFAULT_CAMERA,
  FOCUS_ZOOM,
  WARM_DARK_MAP_STYLE,
  parseBarberCoordinate,
} from '../lib/maps';
import { BarberMapMarker } from '../molecules/BarberMapMarker';
import { Text } from '../atoms/Text';
import { BackButton, BACK_BUTTON_SIZE } from '../atoms/BackButton';
import { Icon } from '../atoms/Icon';
import { ScreenLayout } from '../templates/ScreenLayout';
import { getBarbers, type ApiBarberFull } from '../lib/api';
import { queryKeys, STALE } from '../lib/query';
import { formatUZS } from '../lib/format';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../navigation/GlassTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTheme } from '../lib/restyle';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CARD_GRADIENTS = [
  ['#3d1e0a', '#1d130b'] as const,
  ['#2e1508', '#1a0f06'] as const,
  ['#4a1f0c', '#221208'] as const,
  ['#3a1c10', '#1a100a'] as const,
  ['#2a1806', '#140c04'] as const,
];

const FILTER_CHIPS: Array<{ key: string; labelKey: string; icon?: boolean }> = [
  { key: 'filters', labelKey: 'map.filters', icon: true },
  { key: 'rating', labelKey: 'map.filterRating' },
  { key: 'distance', labelKey: 'map.filterDistance' },
  { key: 'style', labelKey: 'map.filterStyle' },
  { key: 'open', labelKey: 'map.openNow' },
];

function getBarberCoordinate(
  barber: ApiBarberFull,
  index: number,
): { latitude: number; longitude: number } {
  return parseBarberCoordinate(barber.location, index);
}

export const BarbersMapScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<YandexMapViewRef>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [selectedPin, setSelectedPin] = useState(0);
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('filters');
  const [mapLoaded, setMapLoaded] = useState(false);
  const didFitRef = useRef(false);

  const barbersQuery = useQuery({
    queryKey: queryKeys.barbers,
    queryFn: () => getBarbers(0, 50),
    staleTime: STALE.banner,
  });

  const rawBarbers = barbersQuery.data ?? [];

  // Only show approved barbers on the map; apply simple text filter if query entered.
  const barbers = useMemo(() => {
    let list = rawBarbers.filter(
      (b) => !b.approvalStatus || b.approvalStatus === 'approved'
    );
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const fullName = `${b.firstName} ${b.lastName}`.toLowerCase();
        const services = (b.services ?? [])
          .map((s) => s.name.toLowerCase())
          .join(' ');
        return fullName.includes(q) || services.includes(q);
      });
    }
    return list;
  }, [rawBarbers, query]);

  // Once the map has loaded and barbers are in, frame every pin so the user
  // sees the whole set instead of the default Tashkent camera. Runs once.
  useEffect(() => {
    if (!mapLoaded || didFitRef.current || barbers.length < 2) return;
    didFitRef.current = true;
    const points = barbers.map((b, i) => getBarberCoordinate(b, i));
    void mapRef.current?.fitMarkers(points, { durationSeconds: 0.3 });
  }, [mapLoaded, barbers]);

  const tabBarPadding =
    TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_BOTTOM_OFFSET) + 8;

  const handleCardPress = useCallback(
    (index: number) => {
      setSelectedPin(index);
      scrollRef.current?.scrollTo({ x: index * 272, animated: true });
      const barber = barbers[index];
      const coord = barber ? getBarberCoordinate(barber, index) : null;
      if (coord && mapRef.current) {
        void mapRef.current.setCenter(
          { ...coord, zoom: FOCUS_ZOOM },
          { durationSeconds: 0.4 }
        );
      }
    },
    [barbers]
  );

  const navigateToBarber = useCallback(
    (barberId: string) => {
      router.push(`/barber/${barberId}`);
    },
    [router]
  );

  const handleLocateMe = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    void mapRef.current?.setCenter(
      {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        zoom: FOCUS_ZOOM,
      },
      { durationSeconds: 0.5 }
    );
  }, []);

  // Compute min/max price from services if available.
  const getPriceRange = useCallback((b: ApiBarberFull) => {
    const prices = (b.services ?? [])
      .filter((s) => typeof s.price === 'number')
      .map((s) => s.price);
    if (prices.length === 0) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, []);

  const isLoading = barbersQuery.isLoading;
  const isError = barbersQuery.isError;

  return (
    <ScreenLayout edgeToEdgeTop>
      <View style={{ flex: 1 }}>
        {/* Real map background with one pin per barber. Tapping a pin selects
            the matching card (camera focus + sheet scroll), mirroring a card tap.
            TODO(user-location): re-add `showsUserLocation` equivalent when the
            lib ships the user-location layer (roadmap v1). */}
        <YandexMapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          cameraPosition={DEFAULT_CAMERA}
          nightMode
          mapStyle={WARM_DARK_MAP_STYLE}
          rotateGesturesEnabled={false}
          tiltGesturesEnabled={false}
          onMapLoaded={() => setMapLoaded(true)}
        >
          {barbers.map((barber, i) => (
            <BarberMapMarker
              key={barber.id}
              point={getBarberCoordinate(barber, i)}
              avatarUri={barber.avatar}
              initials={`${barber.firstName?.[0] ?? ''}${barber.lastName?.[0] ?? ''}`}
              selected={selectedPin === i}
              identifier={barber.id}
              onPress={() => handleCardPress(i)}
            />
          ))}
        </YandexMapView>

        {/* Floating header */}
        <View style={[styles.mapHeader, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerRow}>
            <BackButton tone="light" />
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: theme.colors.fg,
                letterSpacing: -0.01,
              }}
            >
              {t('map.title')}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              style={[
                styles.headerBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Icon name="more-horizontal" size={16} color={theme.colors.fg} />
            </Pressable>
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.fg,
              },
            ]}
          >
            <Icon name="search" size={16} color={theme.colors.muted2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('map.searchPlaceholder')}
              placeholderTextColor={theme.colors.muted2}
              style={[styles.searchInput, { color: theme.colors.fg }]}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Icon name="mic" size={16} color={theme.colors.accent} />
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {FILTER_CHIPS.map((chip) => {
              const isActive = activeChip === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setActiveChip(chip.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive
                        ? theme.colors.fg
                        : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {chip.icon && (
                    <Icon
                      name="filter"
                      size={14}
                      color={isActive ? theme.colors.bg : theme.colors.fg}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: isActive ? theme.colors.bg : theme.colors.fg,
                    }}
                  >
                    {t(chip.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Locate me FAB */}
        <Pressable
          onPress={handleLocateMe}
          style={[
            styles.locBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.fg,
            },
          ]}
        >
          <Icon name="locate" size={18} color={theme.colors.accent} />
        </Pressable>

        {/* Bottom sheet */}
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={['28%', '55%']}
          enablePanDownToClose={false}
          backgroundStyle={{
            backgroundColor: theme.colors.bg,
          }}
          handleIndicatorStyle={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.border,
          }}
        >
          <BottomSheetView style={{ flex: 1 }}>
            {/* Handle + header */}
            <View style={styles.sheetHeader}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: theme.colors.fg,
                  letterSpacing: -0.01,
                }}
              >
                {t('map.nearby')}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.muted,
                  fontWeight: '500',
                  letterSpacing: 0.06,
                  textTransform: 'uppercase',
                }}
              >
                {t('map.barberCount', { count: barbers.length })}
              </Text>
            </View>

            {/* Loading / error states */}
            {isLoading && (
              <View style={styles.centeredRow}>
                <ActivityIndicator color={theme.colors.accent} />
              </View>
            )}
            {isError && (
              <View style={styles.centeredRow}>
                <Text style={{ color: theme.colors.muted }}>
                  {t('common.error')}
                </Text>
              </View>
            )}

            {/* Horizontal cards */}
            {!isLoading && !isError && (
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sheetScroll}
              >
                {barbers.map((barber, i) => {
                  const isSelected = selectedPin === i;
                  const gradients =
                    CARD_GRADIENTS[i % CARD_GRADIENTS.length];

                  // Placeholder open status until backend provides real hours.
                  const openStatus: 'open' | 'closing' | 'closed' =
                    i % 3 === 0 ? 'open' : i % 3 === 1 ? 'closing' : 'closed';

                  let openLabel: string;
                  let dotColor: string;
                  if (openStatus === 'open') {
                    openLabel = t('search.open');
                    dotColor = theme.colors.success ?? '#2f9d5e';
                  } else if (openStatus === 'closing') {
                    openLabel = t('map.closingSoon');
                    dotColor = theme.colors.warning ?? '#d4a043';
                  } else {
                    openLabel = t('search.closed');
                    dotColor = theme.colors.muted2 ?? '#948a7f';
                  }

                  const priceRange = getPriceRange(barber);
                  const displayName = `${barber.firstName} ${barber.lastName}`;
                  const rating = barber.ratingAverage ?? 0;
                  const reviews = barber.ratingCount ?? 0;

                  return (
                    <Pressable
                      key={barber.id}
                      onPress={() => handleCardPress(i)}
                      onLongPress={() => navigateToBarber(barber.id)}
                      style={[
                        styles.hCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: isSelected
                            ? theme.colors.accent
                            : theme.colors.border,
                        },
                        isSelected && {
                          shadowColor: theme.colors.accent,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.35,
                          shadowRadius: 8,
                          elevation: 4,
                        },
                      ]}
                    >
                      {/* Thumbnail */}
                      <View style={styles.hCardThumb}>
                        <LinearGradient
                          colors={gradients}
                          style={StyleSheet.absoluteFillObject}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                        />
                        {/* Open pill */}
                        <View
                          style={[
                            styles.openPill,
                            { backgroundColor: 'rgba(0,0,0,0.55)' },
                          ]}
                        >
                          <View
                            style={[
                              styles.openDot,
                              { backgroundColor: dotColor },
                            ]}
                          />
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: '600',
                              letterSpacing: 0.08,
                            }}
                          >
                            {openLabel}
                          </Text>
                        </View>
                      </View>

                      {/* Meta */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: theme.colors.fg,
                            letterSpacing: -0.01,
                          }}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                        <Text
                          style={{
                            marginTop: 3,
                            fontSize: 13,
                            color: theme.colors.muted,
                          }}
                          numberOfLines={1}
                        >
                          {barber.phone}
                        </Text>
                        <View
                          style={{
                            marginTop: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Icon
                              name="star"
                              size={12}
                              color={theme.colors.accent}
                            />
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color: theme.colors.accent,
                              }}
                            >
                              {rating > 0
                                ? String(rating).replace('.', ',')
                                : '—'}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 13,
                              color: theme.colors.muted,
                            }}
                          >
                            ({reviews})
                          </Text>
                        </View>
                        {priceRange && (
                          <Text
                            style={{
                              marginTop: 8,
                              fontSize: 14,
                              fontWeight: '600',
                              color: theme.colors.fg,
                            }}
                          >
                            {formatUZS(priceRange.min)} –{' '}
                            {formatUZS(priceRange.max)}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchWrap: {
    marginTop: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  chipsRow: {
    paddingTop: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  locBtn: {
    position: 'absolute',
    right: 16,
    bottom: 280,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  hCard: {
    width: 260,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hCardThumb: {
    width: 72,
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  openPill: {
    position: 'absolute',
    left: 6,
    top: 6,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  centeredRow: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
