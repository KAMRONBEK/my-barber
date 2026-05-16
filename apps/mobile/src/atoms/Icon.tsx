// Tiny stroke-icon set matching OD's `scripts/icons.js` symbol IDs. We don't
// pull the whole asset library — only the icons the slice needs. Add more
// here as screens require them.

import React from 'react';
import { Path, Svg, Circle, Rect, Polyline } from 'react-native-svg';
import { useTheme } from '@shopify/restyle';
import type { AppTheme } from '../lib/restyle';

export type IconName =
  | 'home'
  | 'search'
  | 'calendar'
  | 'user'
  | 'arrow-right'
  | 'back'
  | 'bell'
  | 'check'
  | 'star'
  | 'share'
  | 'heart'
  | 'settings'
  | 'phone'
  | 'pin'
  | 'mail'
  | 'moon'
  | 'verified'
  | 'logout'
  | 'inbox'
  | 'trending-up'
  | 'clock'
  | 'chevron-left'
  | 'chevron-right'
  | 'x'
  | 'more-horizontal';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  color,
  strokeWidth = 1.7,
}) => {
  const theme = useTheme<AppTheme>();
  const stroke = color ?? theme.colors.fg;
  const common = {
    stroke,
    fill: 'none' as const,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, common, stroke)}
    </Svg>
  );
};

function render(
  name: IconName,
  common: {
    stroke: string;
    fill: 'none';
    strokeWidth: number;
    strokeLinecap: 'round';
    strokeLinejoin: 'round';
  },
  stroke: string,
) {
  switch (name) {
    case 'home':
      return <Path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z" {...common} />;
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={7} {...common} />
          <Path d="M20 20l-3.5-3.5" {...common} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={2} {...common} />
          <Path d="M8 3v4M16 3v4M3 10h18" {...common} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx={12} cy={8} r={4} {...common} />
          <Path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" {...common} />
        </>
      );
    case 'arrow-right':
      return <Path d="M5 12h14M13 6l6 6-6 6" {...common} />;
    case 'back':
      return <Path d="M19 12H5M11 6l-6 6 6 6" {...common} />;
    case 'bell':
      return <Path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" {...common} />;
    case 'check':
      return <Path d="M5 12.5l4.5 4.5L20 7" {...common} />;
    case 'star':
      return <Path d="M12 3l2.6 5.5 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.4l6-.9z" {...common} fill={stroke} />;
    case 'share':
      return (
        <>
          <Path d="M12 3v13" {...common} />
          <Path d="M8 7l4-4 4 4" {...common} />
          <Path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" {...common} />
        </>
      );
    case 'heart':
      return (
        <Path
          d="M20 8.5C20 5.5 17.8 4 15.7 4c-1.4 0-2.7.7-3.7 2-1-1.3-2.3-2-3.7-2C6.2 4 4 5.5 4 8.5c0 5 8 11.5 8 11.5s8-6.5 8-11.5z"
          {...common}
        />
      );
    case 'settings':
      return (
        <>
          <Circle cx={12} cy={12} r={3} {...common} />
          <Path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            {...common}
          />
        </>
      );
    case 'phone':
      return (
        <Path
          d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7 13 13 0 0 0 .7 2.8 2 2 0 0 1-.4 2L8 10a16 16 0 0 0 6 6l1.5-1.3a2 2 0 0 1 2-.4 13 13 0 0 0 2.8.7A2 2 0 0 1 22 17z"
          {...common}
        />
      );
    case 'pin':
      return (
        <>
          <Path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" {...common} />
          <Circle cx={12} cy={10} r={2.5} {...common} />
        </>
      );
    case 'mail':
      return (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2} {...common} />
          <Polyline points="3,7 12,13 21,7" {...common} />
        </>
      );
    case 'moon':
      return <Path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" {...common} />;
    case 'verified':
      return (
        <>
          <Path d="M12 2l2.5 2.6 3.5-.4-.4 3.5L20 10l-2.6 2.5.4 3.5-3.5-.4L12 18l-2.5-2.4-3.5.4.4-3.5L4 10l2.4-2.3-.4-3.5 3.5.4z" {...common} fill={stroke} />
          <Path d="M9 11l2 2 4-4" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'logout':
      return (
        <>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...common} />
          <Path d="M16 17l5-5-5-5M21 12H9" {...common} />
        </>
      );
    case 'inbox':
      return (
        <>
          <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7l9 5 9-5z" {...common} />
          <Path d="M21 12l-9-5-9 5" {...common} />
        </>
      );
    case 'trending-up':
      return (
        <>
          <Polyline points="23,6 13.5,15.5 8.5,10.5 1,18" {...common} />
          <Polyline points="17,6 23,6 23,12" {...common} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={10} {...common} />
          <Polyline points="12,6 12,12 16,14" {...common} />
        </>
      );
    case 'chevron-left':
      return <Path d="M15 18l-6-6 6-6" {...common} />;
    case 'chevron-right':
      return <Path d="M9 18l6-6-6-6" {...common} />;
    case 'x':
      return (
        <>
          <Path d="M18 6L6 18" {...common} />
          <Path d="M6 6l12 12" {...common} />
        </>
      );
    case 'more-horizontal':
      return (
        <>
          <Circle cx={12} cy={12} r={1} fill={stroke} stroke="none" />
          <Circle cx={19} cy={12} r={1} fill={stroke} stroke="none" />
          <Circle cx={5} cy={12} r={1} fill={stroke} stroke="none" />
        </>
      );
    default:
      return null;
  }
}
