// Design tokens derived from the Open Design "My Barber" project.
// Source values are OKLCH in design/styles/tokens.css; resolved here to sRGB
// hex/rgba for React Native consumption. Visual intent: warm-paper light,
// deep-ink dark, copper accent.

import { Platform } from 'react-native';

export const palette = {
  light: {
    bg: '#faf7f2',
    bgGrouped: '#f3eee5',
    surface: '#ffffff',
    surface2: '#f9f6f1',
    surfaceGlass: 'rgba(255, 252, 247, 0.72)',
    overlay: 'rgba(10, 8, 6, 0.32)',

    fg: '#1a1611',
    fg2: '#322a23',
    muted: '#6b6056',
    muted2: '#948a7f',
    onAccent: '#faf7f2',

    border: '#e5dfd5',
    borderStrong: '#c8c0b1',
    hairline: 'rgba(10, 8, 6, 0.08)',

    accent: '#b35a25',
    accent2: '#9a4818',
    accentSoft: '#f5e6d2',
    accentGlow: 'rgba(178, 92, 38, 0.18)',

    success: '#2f9d5e',
    successSoft: '#d8f0e2',
    warning: '#d4a043',
    warningSoft: '#f5e8d0',
    danger: '#c84a3a',
    dangerSoft: '#f5dad3',
    info: '#4673c0',
    infoSoft: '#d8e2f0',
  },
  dark: {
    bg: '#14110d',
    bgGrouped: '#0c0a07',
    surface: '#1d1813',
    surface2: '#241e18',
    surfaceGlass: 'rgba(28, 22, 18, 0.62)',
    overlay: 'rgba(0, 0, 0, 0.52)',

    fg: '#f5f1e9',
    fg2: '#cfc6b8',
    muted: '#948575',
    muted2: '#6b6056',
    onAccent: '#faf7f2',

    border: '#2c251f',
    borderStrong: '#3d362d',
    hairline: 'rgba(255, 240, 220, 0.10)',

    accent: '#d8854a',
    accent2: '#f0a373',
    accentSoft: '#4a2c1a',
    accentGlow: 'rgba(220, 138, 70, 0.22)',

    success: '#5fc78a',
    successSoft: '#1f3d2a',
    warning: '#f0c873',
    warningSoft: '#3d3120',
    danger: '#f06c5a',
    dangerSoft: '#3d1f1a',
    info: '#75a4e8',
    infoSoft: '#1f2c40',
  },
} as const;

export const spacing = {
  none: 0,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  '4xl': 40,
  '5xl': 56,
} as const;

export const radii = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

// TODO: Custom fonts (SF Pro Text, etc.) require expo-font to preload assets
//       from assets/fonts/ before they can be referenced here. Until that work
//       is done we fall back to platform-appropriate system fonts so the UI
//       renders correctly without crashing.
//
//       To add custom fonts:
//         1. Add font files to apps/mobile/assets/fonts/
//         2. Load them in app/_layout.tsx via useFonts() from expo-font
//         3. Replace the Platform.select values below with the loaded font names
export const fontFamilies = {
  display: Platform.select({ ios: '-apple-system', android: 'sans-serif', default: 'System' }) as string,
  body: Platform.select({ ios: '-apple-system', android: 'sans-serif', default: 'System' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
} as const;

export const fontSizes = {
  caption: 12,
  footnote: 13,
  body: 15,
  bodyLarge: 17,
  subhead: 20,
  title: 24,
  largeTitle: 28,
  display: 34,
} as const;

/**
 * Shadow presets for React Native. Use `shadows.card` / `shadows.floating`
 * on View styles together with the surface's foreground color as `shadowColor`.
 *
 * Example:
 *   style={[shadows.card, { shadowColor: theme.colors.fg }]}
 */
export const shadows = {
  /** Subtle elevation for cards and list items */
  card: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  /** Stronger lift for floating bars and FABs */
  floating: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  /** Glow ring used on the confirmation success indicator */
  ring: {
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 48,
    elevation: 8,
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type Palette = typeof palette.light;
