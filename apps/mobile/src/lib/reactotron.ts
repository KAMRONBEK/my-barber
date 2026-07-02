// Reactotron desktop-app integration, dev-only. Captures logs/errors here;
// network requests are deliberately NOT patched by Reactotron's own
// networking plugin (see reactotronNetworkBridge.ts for why — it conflicts
// with react-native-network-logger's own XHR patch) and are instead
// forwarded from network-logger's capture via that bridge module.
// Connect the Reactotron desktop app on the same network to view them.

import Reactotron from 'reactotron-react-native';
import Constants from 'expo-constants';

if (__DEV__) {
  // This runs at module-load time, before the app renders — any throw here
  // takes down the whole boot, not just a screen. Reactotron is a dev
  // convenience, so a bad host/config must never crash the app; swallow and
  // move on if it does.
  try {
    // On a physical device "localhost" resolves to the device itself, not
    // the dev machine — pull the Metro host IP from Expo's manifest instead
    // (works for simulators/emulators too, where it just matches localhost).
    // Falls back to Reactotron's own default when hostUri isn't available
    // (configure() throws "invalid host" if passed `host: undefined` outright).
    const devServerHost = Constants.expoConfig?.hostUri?.split(':')[0];

    Reactotron.configure({
      name: 'My Barber Shop',
      ...(devServerHost ? { host: devServerHost } : {}),
    })
      .useReactNative({ networking: false })
      .connect();
  } catch {
    // Dev-tooling failure only — never block app boot on this.
  }
}

export default Reactotron;
