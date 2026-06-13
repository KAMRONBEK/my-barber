import { showLocation } from 'react-native-map-link';
import { PROVIDER_GOOGLE, type MapStyleElement, type Provider, type Region } from 'react-native-maps';
import i18n from './i18n';

/** Google Maps on both iOS and Android (requires native rebuild via app.config.ts). */
export const MAP_PROVIDER: Provider = PROVIDER_GOOGLE;

/** Dark/warm custom style for Google Maps. */
export const GOOGLE_DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d130b' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#b8a99a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d130b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a1d14' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e8e7e' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c4b5a5' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#a89888' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b8f5e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e1f14' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9e8e7e' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#3d2a1c' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4a3323' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b8a99a' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#2e1f14' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a1d14' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#8a7a6a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#14202e' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a6a8a' }] },
];

/** Tashkent area fallbacks when API location has no coordinates. */
export const BARBER_FALLBACK_COORDINATES: Array<{ latitude: number; longitude: number }> = [
  { latitude: 41.315, longitude: 69.284 },
  { latitude: 41.318, longitude: 69.29 },
  { latitude: 41.312, longitude: 69.295 },
  { latitude: 41.308, longitude: 69.28 },
  { latitude: 41.32, longitude: 69.282 },
];

export const DEFAULT_MAP_REGION: Region = {
  latitude: 41.315,
  longitude: 69.287,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export type BarberLocationWire =
  | string
  | {
      latitude?: string | number;
      longitude?: string | number;
      coords?: { latitude?: string | number; longitude?: string | number };
      address?: string;
    };

export function parseBarberCoordinate(
  location: BarberLocationWire | undefined,
  fallbackIndex = 0,
): { latitude: number; longitude: number } {
  if (location && typeof location === 'object') {
    const latRaw =
      location.latitude != null
        ? location.latitude
        : location.coords?.latitude;
    const lngRaw =
      location.longitude != null
        ? location.longitude
        : location.coords?.longitude;

    if (latRaw != null && lngRaw != null) {
      const lat = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw));
      const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  const fallback =
    BARBER_FALLBACK_COORDINATES[fallbackIndex % BARBER_FALLBACK_COORDINATES.length];
  return fallback ?? { latitude: 41.315, longitude: 69.287 };
}

export function formatBarberAddress(location: BarberLocationWire | undefined): string | null {
  if (!location) return null;
  if (typeof location === 'string') return location;
  if (location.address) return location.address;
  return null;
}

export function regionAroundCoordinate(
  coordinate: { latitude: number; longitude: number },
  delta = 0.008,
): Region {
  return {
    ...coordinate,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

/** Map apps offered in the directions picker (Uzbekistan-relevant subset). */
const DIRECTIONS_APPS = [
  'apple-maps',
  'google-maps',
  'yandex-maps',
  'yandex',
  'dgis',
  'waze',
] as const;

export async function openBarberDirections(
  coordinate: { latitude: number; longitude: number },
  options?: { title?: string },
): Promise<void> {
  const { latitude, longitude } = coordinate;

  await showLocation({
    latitude,
    longitude,
    title: options?.title ?? undefined,
    directionsMode: 'car',
    googleForceLatLon: true,
    alwaysIncludeGoogle: true,
    appsWhiteList: [...DIRECTIONS_APPS],
    dialogTitle: i18n.t('map.openWith'),
    dialogMessage: i18n.t('map.chooseApp'),
    cancelText: i18n.t('common.cancel'),
  });
}
