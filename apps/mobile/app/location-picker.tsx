// Map-based address picker. Uber/Bolt-style: the map pans under a fixed
// center pin; the address for the pin's coordinate is reverse-geocoded on
// every pan. Confirm hands the result to whichever screen opened this one
// via useLocationPickerStore (see src/lib/locationPicker.ts).

import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  YandexMapView,
  type YandexMapViewRef,
  type CameraPositionChangeEvent,
} from 'expo-yandex-mapkit';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/atoms/Text';
import { Icon } from '../src/atoms/Icon';
import { Button } from '../src/atoms/Button';
import { ScreenHeader } from '../src/molecules/ScreenHeader';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { DEFAULT_CAMERA, FOCUS_ZOOM, WARM_DARK_MAP_STYLE } from '../src/lib/maps';
import { useLocationPickerStore } from '../src/lib/locationPicker';
import type { AppTheme } from '../src/lib/restyle';

function formatAddress(place: Location.LocationGeocodedAddress): string {
  const parts = [
    [place.street, place.streetNumber].filter(Boolean).join(' '),
    place.district,
    place.city,
    place.region,
  ].filter((part): part is string => !!part && part.trim().length > 0);
  return parts.length > 0 ? parts.join(', ') : '';
}

export default function LocationPickerScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<YandexMapViewRef>(null);
  const setResult = useLocationPickerStore((s) => s.setResult);

  const [coordinate, setCoordinate] = useState({
    latitude: DEFAULT_CAMERA.latitude,
    longitude: DEFAULT_CAMERA.longitude,
  });
  const [address, setAddress] = useState('');
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  const resolveAddress = useCallback(async (coord: { latitude: number; longitude: number }) => {
    setResolving(true);
    try {
      const places = await Location.reverseGeocodeAsync(coord);
      setAddress(places[0] ? formatAddress(places[0]) : '');
    } catch {
      setAddress('');
    } finally {
      setResolving(false);
    }
  }, []);

  // Yandex fires this continuously while the camera moves; only reverse-geocode
  // once the gesture settles (finished) to mirror onRegionChangeComplete.
  const onCameraPositionChanged = useCallback(
    (event: { nativeEvent: CameraPositionChangeEvent }) => {
      const { cameraPosition, finished } = event.nativeEvent;
      if (!finished) return;
      const coord = {
        latitude: cameraPosition.latitude,
        longitude: cameraPosition.longitude,
      };
      setCoordinate(coord);
      void resolveAddress(coord);
    },
    [resolveAddress],
  );

  const handleLocateMe = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      void mapRef.current?.setCenter(
        { ...coord, zoom: FOCUS_ZOOM },
        { durationSeconds: 0.5 },
      );
      setCoordinate(coord);
      void resolveAddress(coord);
    } finally {
      setLocating(false);
    }
  }, [resolveAddress]);

  const handleConfirm = useCallback(() => {
    if (!address) return;
    setResult({ address, ...coordinate });
    router.back();
  }, [address, coordinate, router, setResult]);

  return (
    <ScreenLayout edgeToEdgeTop>
      <View style={styles.flex}>
        {/* TODO(user-location): re-add a "show user location" dot once
            expo-yandex-mapkit ships the user-location layer (roadmap v1).
            react-native-maps' showsUserLocation has no equivalent yet. */}
        <YandexMapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          cameraPosition={DEFAULT_CAMERA}
          nightMode
          mapStyle={WARM_DARK_MAP_STYLE}
          rotateGesturesEnabled={false}
          tiltGesturesEnabled={false}
          onCameraPositionChanged={onCameraPositionChanged}
        />

        {/* Fixed center pin */}
        <View style={styles.pinWrap} pointerEvents="none">
          <Icon name="pin" size={36} color={theme.colors.accent} />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <ScreenHeader title={t('map.selectLocation')} tone="light" titleColor="#fff" />
        </View>

        {/* Locate me FAB */}
        <Pressable
          onPress={handleLocateMe}
          style={[
            styles.locBtn,
            {
              bottom: 180 + insets.bottom,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Icon name="locate" size={18} color={theme.colors.accent} />
          )}
        </Pressable>

        {/* Confirm sheet */}
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="pin" size={16} color={theme.colors.accent} />
            {resolving ? (
              <ActivityIndicator size="small" color={theme.colors.muted} />
            ) : (
              <Text
                style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.fg }}
                numberOfLines={2}
              >
                {address || t('map.noAddressFound')}
              </Text>
            )}
          </View>
          <Button
            fullWidth
            label={t('map.confirmLocation')}
            onPress={handleConfirm}
            disabled={resolving || !address}
            testID="location-picker-confirm"
          />
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  pinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -36,
  },
  locBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
