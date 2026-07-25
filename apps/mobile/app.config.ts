import type { ConfigContext } from 'expo/config';

/**
 * Expo config. Loads YANDEX_MAPKIT_API_KEY from .env at prebuild time and wires
 * the expo-yandex-mapkit config plugin (MapKit pods on iOS, SDK + minSdk on
 * Android). A build-time apiKey auto-initializes MapKit at startup — no
 * AppDelegate / AndroidManifest edits and no runtime initialize() call needed.
 */
export default ({ config }: ConfigContext) => {
  // Sourced from EAS environment variables (`eas env:pull`); the stored name is
  // YANDEX_MAPS_API_KEY. Falls back to a MapKit-specific alias if ever set.
  const yandexMapKitApiKey =
    process.env.YANDEX_MAPS_API_KEY ?? process.env.YANDEX_MAPKIT_API_KEY ?? '';

  if (!yandexMapKitApiKey) {
    console.warn(
      '[app.config] YANDEX_MAPS_API_KEY is not set — the Yandex map will render empty until a key is provided.',
    );
  }

  // The config plugin rejects an empty apiKey, so only pass it when set;
  // otherwise register the plugin bare (key can be supplied at runtime via
  // initialize(), or by a build with YANDEX_MAPS_API_KEY present).
  const yandexMapKitPlugin = yandexMapKitApiKey
    ? (['expo-yandex-mapkit', { apiKey: yandexMapKitApiKey }] as const)
    : ('expo-yandex-mapkit' as const);

  return {
    ...config,
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      'expo-image',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow My Barber Shop to access your photos so you can set a profile picture.',
        },
      ],
      'react-native-map-link',
      yandexMapKitPlugin,
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow My Barber Shop to use your location to show nearby barbers on the map.',
        },
      ],
    ],
  };
};
