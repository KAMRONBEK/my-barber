const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

/**
 * @deprecated Use the official `react-native-maps` Expo config plugin in app.config.ts.
 * This plugin only wrote GMSApiKey to Info.plist and did not install Google Maps
 * CocoaPods or call GMSServices.provideAPIKey() in AppDelegate — maps stayed blank on iOS.
 */
function withGoogleMapsApiKey(config) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn(
      '[withGoogleMapsApiKey] GOOGLE_API_KEY is not set. Google Maps will not work.'
    );
  }

  // Android: inject com.google.android.geo.API_KEY meta-data
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (application) {
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }

      const existing = application['meta-data'].find(
        (meta) => meta.$['android:name'] === 'com.google.android.geo.API_KEY'
      );

      if (existing) {
        existing.$['android:value'] = apiKey ?? '';
      } else {
        application['meta-data'].push({
          $: {
            'android:name': 'com.google.android.geo.API_KEY',
            'android:value': apiKey ?? '',
          },
        });
      }
    }

    return config;
  });

  // iOS: inject GMSApiKey into Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.GMSApiKey = apiKey ?? '';
    return config;
  });

  return config;
}

module.exports = withGoogleMapsApiKey;
