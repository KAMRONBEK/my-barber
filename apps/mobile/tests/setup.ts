// Global test setup. Loaded via setupFilesAfterEach in jest config.
// Initializes i18n, mocks problem-native modules, and provides RNTL helpers.

import '@testing-library/jest-native/extend-expect';

// ── expo-secure-store: Map-backed in-memory implementation ──────────────────
const _store = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    _store.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => _store.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    _store.delete(key);
  }),
}));

// ── expo-localization: always return uz so i18n boots deterministically ──────
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'uz', regionCode: 'UZ' }]),
}));

// ── expo-image: forward to a simple RN Image stub ───────────────────────────
jest.mock('expo-image', () => {
  const React = require('react');
  const { Image } = require('react-native');
  return {
    Image: ({ source, style, testID, ...rest }: Record<string, unknown>) =>
      React.createElement(Image, { source, style, testID, ...rest }),
  };
});

// ── react-native-safe-area-context: provides safe area mocks ────────────────
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 390, height: 844 } },
  };
});

// ── react-native-reanimated: jest-expo preset enables this, but withTiming
//    etc. need to resolve synchronously in tests.
// (jest-expo/setup automatically mocks RN Reanimated)

// ── expo-router: router mock (overridden per-test with jest.mock in screen tests)
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// ── @gorhom/bottom-sheet: not used in slice screens but pulled as a dep ──────
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    BottomSheetModal: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    BottomSheetView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useBottomSheetModal: () => ({ present: jest.fn(), dismiss: jest.fn() }),
  };
});

// ── i18n: initialize synchronously so formatters work in tests ──────────────
import '../src/lib/i18n';

// ── clear secure-store map between tests ────────────────────────────────────
beforeEach(() => {
  _store.clear();
});
