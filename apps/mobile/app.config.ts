import type { ConfigContext } from 'expo/config';

/**
 * Expo config. Loads GOOGLE_API_KEY from .env at prebuild time and wires the
 * official react-native-maps plugin (Google Maps pods + AppDelegate init on iOS).
 * The custom withGoogleMapsApiKey plugin only set Info.plist and was insufficient.
 */
export default ({ config }: ConfigContext) => {
  const googleMapsApiKey = process.env.GOOGLE_API_KEY ?? '';

  if (!googleMapsApiKey) {
    console.warn(
      '[app.config] GOOGLE_API_KEY is not set — Google Maps will not work on iOS or Android.',
    );
  }

  return {
    ...config,
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      'expo-image',
      'react-native-map-link',
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: googleMapsApiKey,
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
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
