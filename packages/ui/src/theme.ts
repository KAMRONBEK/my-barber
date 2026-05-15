import { createTheme } from '@shopify/restyle';
import { palette, spacing, radii, fontSizes } from './tokens';

function buildTheme(mode: 'light' | 'dark') {
  const p = palette[mode];
  return createTheme({
    colors: {
      bg: p.bg,
      bgGrouped: p.bgGrouped,
      surface: p.surface,
      surface2: p.surface2,
      surfaceGlass: p.surfaceGlass,
      overlay: p.overlay,

      fg: p.fg,
      fg2: p.fg2,
      muted: p.muted,
      muted2: p.muted2,
      onAccent: p.onAccent,

      border: p.border,
      borderStrong: p.borderStrong,
      hairline: p.hairline,

      accent: p.accent,
      accent2: p.accent2,
      accentSoft: p.accentSoft,
      accentGlow: p.accentGlow,

      success: p.success,
      successSoft: p.successSoft,
      warning: p.warning,
      warningSoft: p.warningSoft,
      danger: p.danger,
      dangerSoft: p.dangerSoft,
      info: p.info,
      infoSoft: p.infoSoft,
    },
    spacing,
    borderRadii: radii,
    breakpoints: {
      phone: 0,
      tablet: 768,
    },
    textVariants: {
      defaults: {
        fontSize: fontSizes.body,
        color: 'fg',
      },
      display: {
        fontSize: fontSizes.display,
        fontWeight: '700',
        letterSpacing: -1,
        color: 'fg',
      },
      largeTitle: {
        fontSize: fontSizes.largeTitle,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: 'fg',
      },
      title: {
        fontSize: fontSizes.title,
        fontWeight: '600',
        color: 'fg',
      },
      subhead: {
        fontSize: fontSizes.subhead,
        fontWeight: '600',
        color: 'fg',
      },
      body: {
        fontSize: fontSizes.body,
        color: 'fg',
      },
      bodyLarge: {
        fontSize: fontSizes.bodyLarge,
        color: 'fg',
      },
      footnote: {
        fontSize: fontSizes.footnote,
        color: 'muted',
      },
      caption: {
        fontSize: fontSizes.caption,
        color: 'muted',
      },
      mono: {
        fontSize: fontSizes.body,
        color: 'fg',
        fontFamily: 'Menlo',
      },
    },
    cardVariants: {
      defaults: {
        backgroundColor: 'surface',
        borderRadius: 'lg',
        padding: 'l',
      },
      glass: {
        backgroundColor: 'surfaceGlass',
        borderRadius: 'xl',
        padding: 'l',
      },
      flat: {
        backgroundColor: 'surface2',
        borderRadius: 'md',
        padding: 'm',
      },
    },
    buttonVariants: {
      defaults: {
        backgroundColor: 'accent',
        borderRadius: 'pill',
        paddingVertical: 'm',
        paddingHorizontal: 'xl',
      },
      secondary: {
        backgroundColor: 'surface2',
        borderRadius: 'pill',
        paddingVertical: 'm',
        paddingHorizontal: 'xl',
      },
      destructive: {
        backgroundColor: 'danger',
        borderRadius: 'pill',
        paddingVertical: 'm',
        paddingHorizontal: 'xl',
      },
    },
  });
}

export const theme = buildTheme('light');
export const darkTheme = buildTheme('dark');
export type Theme = typeof theme;
