// Avatar atom. Falls back to a warm gradient circle when no image is set —
// matches the OD `.bg-portrait-*` placeholder treatment.
//
// When `ring` is true: renders a 4 px accentSoft border + an absolute
// glow halo behind the avatar using accentGlow.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@shopify/restyle';
import { Text } from './Text';
import type { AppTheme } from '../lib/restyle';

export interface AvatarProps {
  size?: number;
  uri?: string | null;
  initials?: string;
  ring?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 40,
  uri,
  initials,
  ring,
}) => {
  const theme = useTheme<AppTheme>();

  const inner = (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring ? theme.colors.accentSoft : theme.colors.border,
          borderWidth: ring ? 4 : StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.surface2,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <Text
          style={{
            color: theme.colors.fg,
            fontSize: size * 0.36,
            fontWeight: '600',
          }}
        >
          {(initials ?? '').slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );

  if (!ring) return inner;

  // Wrap in a container that provides the glow halo behind the ring
  const glowSize = size + 20;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow halo — absolutely positioned, larger than avatar */}
      <View
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          borderRadius: glowSize / 2,
          backgroundColor: theme.colors.accentGlow,
        }}
        pointerEvents="none"
      />
      {inner}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
