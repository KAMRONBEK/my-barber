import type { ImageSourcePropType } from 'react-native';
import { showLocation } from 'react-native-map-link';
import type { CameraPosition, MarkerAnchor } from 'expo-yandex-mapkit';
import i18n from './i18n';

export type LatLng = { latitude: number; longitude: number };

/**
 * Barber map-pin icons (copper teardrop, generated into assets/markers). The
 * `active` variant is brighter with a white ring for the selected barber.
 * expo-yandex-mapkit markers are image-only for now (React-children icons are
 * on the lib roadmap), so the rating stays on the cards rather than in the pin.
 */
export const BARBER_MARKER_ICON: ImageSourcePropType = require('../../assets/markers/pin-marker.png');
export const BARBER_MARKER_ICON_ACTIVE: ImageSourcePropType = require('../../assets/markers/pin-marker-active.png');

/** Pin the teardrop's tip (bottom-center) to the coordinate. */
export const MARKER_ANCHOR: MarkerAnchor = { x: 0.5, y: 1 };

/** Default camera zoom for street-level detail (Yandex zoom scale). */
export const DEFAULT_ZOOM = 14;

/** Zoom used when focusing a single barber / picked coordinate. */
export const FOCUS_ZOOM = 15;

/**
 * Convert a legacy react-native-maps latitude/longitude delta to a Yandex zoom
 * level. Kept so callers that still think in "region deltas" have a bridge:
 * a full 360° span is zoom 0, halving the span adds one zoom level.
 */
export function zoomForDelta(delta: number): number {
  if (!delta || delta <= 0) return DEFAULT_ZOOM;
  return Math.log2(360 / delta);
}

/**
 * Warm-copper dark map theme matching the app's dark palette (see
 * `@my-barber/ui` tokens: bg #14110d, surface #1d1813, accent #d8854a). Ported
 * from the app's original Google "warm-brown" style to Yandex MapKit's JSON
 * style schema (array of {tags, elements, stylers} rules), consumed via the
 * `<YandexMapView mapStyle={...} />` prop (expo-yandex-mapkit ≥ 0.0.5). Only the
 * vector layer honours this; pass it alongside a dark base and it recolours land,
 * water, roads, parks, buildings and labels to the app's tones. Unknown tags are
 * skipped by MapKit, so the set stays intentionally broad.
 */
const WARM_DARK_MAP_RULES = [
  // Base landmass / land use — deep warm ink.
  { tags: 'land', elements: 'geometry', stylers: { color: '#17120c' } },
  { tags: 'landcover', elements: 'geometry', stylers: { color: '#17120c' } },
  { tags: 'urban_area', elements: 'geometry', stylers: { color: '#1b150e' } },
  // Water — dark desaturated blue that still reads warm next to the land.
  { tags: 'water', elements: 'geometry', stylers: { color: '#12212e' } },
  // Big parks pop as green (a useful landmark), but generic greenery / residential
  // yards stay subdued so dense blocks don't turn solid green at high zoom.
  {
    tags: { any: ['park', 'national_park'] },
    elements: 'geometry',
    stylers: { color: '#2a4a2e' },
  },
  {
    tags: { any: ['vegetation', 'cemetery'] },
    elements: 'geometry',
    stylers: { color: '#1f3320' },
  },
  // Buildings / structures — a touch above the land, subtle warm outline.
  {
    tags: { any: ['building', 'structure'] },
    elements: 'geometry.fill',
    stylers: { color: '#1f1913' },
  },
  {
    tags: { any: ['building', 'structure'] },
    elements: 'geometry.outline',
    stylers: { color: '#2c251f' },
  },
  // Roads — warm tan, kept clearly lighter than the land so the whole network stays
  // legible at every zoom (the plain map's light-grey roads were the main thing lost
  // when the first pass made roads too dark). Near-black casing for definition.
  { tags: 'road', elements: 'geometry.fill', stylers: { color: '#7a6144' } },
  { tags: 'road', elements: 'geometry.outline', stylers: { color: '#120d08' } },
  { tags: 'road_minor', elements: 'geometry.fill', stylers: { color: '#4a3a28' } },
  // Transit / metro lines left at the base scheme's own colour on purpose — the
  // Tashkent metro network is a useful landmark, so we don't recolour it away.
  // Admin borders — faint warm grey.
  { tags: 'admin', elements: 'geometry', stylers: { color: '#3d362d' } },
  // Labels — warm off-white text with a dark halo for legibility.
  { elements: 'label.text.fill', stylers: { color: '#c2b3a2' } },
  { elements: 'label.text.outline', stylers: { color: '#100c08' } },
  // POI icons kept (metro, cafés, pharmacies, bazaars… are useful landmarks); the
  // barber markers sit on their own overlay above the map, so they still read.
];

/** The theme above serialised for the `mapStyle` prop (a Yandex JSON string). */
export const WARM_DARK_MAP_STYLE = JSON.stringify(WARM_DARK_MAP_RULES);

/** Tashkent area fallbacks when API location has no coordinates. */
export const BARBER_FALLBACK_COORDINATES: Array<{ latitude: number; longitude: number }> = [
  { latitude: 41.315, longitude: 69.284 },
  { latitude: 41.318, longitude: 69.29 },
  { latitude: 41.312, longitude: 69.295 },
  { latitude: 41.308, longitude: 69.28 },
  { latitude: 41.32, longitude: 69.282 },
];

/** Default map camera: Tashkent / Mirzo-Ulugbek area. */
export const DEFAULT_CAMERA: CameraPosition = {
  latitude: 41.315,
  longitude: 69.287,
  zoom: DEFAULT_ZOOM,
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

/** Build a Yandex camera position centered on a coordinate. */
export function cameraForCoordinate(
  coordinate: LatLng,
  zoom = FOCUS_ZOOM,
): CameraPosition {
  return { ...coordinate, zoom };
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
