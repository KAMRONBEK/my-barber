module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 worklet processing. Must come last.
      // Replaces the legacy `react-native-reanimated/plugin` (Reanimated 2/3).
      'react-native-worklets/plugin',
    ],
  };
};
