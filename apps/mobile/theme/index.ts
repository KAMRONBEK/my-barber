import { createTheme } from '@shopify/restyle';

const palette = {
  black: '#0B0B0F',
  white: '#FFFFFF',
  gray100: '#F4F4F5',
  gray400: '#9CA3AF',
  gray700: '#374151',
  brand: '#D4A24C',
  brandDark: '#A77B27',
  danger: '#DC2626',
  success: '#16A34A',
};

export const theme = createTheme({
  colors: {
    background: palette.white,
    foreground: palette.black,
    muted: palette.gray400,
    cardBackground: palette.gray100,
    primary: palette.brand,
    primaryDark: palette.brandDark,
    danger: palette.danger,
    success: palette.success,
  },
  spacing: {
    none: 0,
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadii: {
    none: 0,
    s: 4,
    m: 8,
    l: 16,
    xl: 24,
    pill: 999,
  },
  textVariants: {
    defaults: {
      fontSize: 16,
      color: 'foreground',
    },
    header: {
      fontSize: 28,
      fontWeight: '700',
      color: 'foreground',
    },
    subheader: {
      fontSize: 20,
      fontWeight: '600',
      color: 'foreground',
    },
    body: {
      fontSize: 16,
      color: 'foreground',
    },
    caption: {
      fontSize: 13,
      color: 'muted',
    },
  },
});

export type Theme = typeof theme;
