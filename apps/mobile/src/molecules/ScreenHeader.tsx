// Shared screen header: back button + dead-center title + optional right
// slot. The title is absolutely positioned edge-to-edge and text-aligned
// center, so it stays visually centered on the screen regardless of how
// wide the back button or right-side content are — unlike a flex-row
// `justifyContent: space-between` layout, which only centers the title
// within the leftover space between two (usually mismatched-width) siblings.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { BackButton, type BackButtonTone } from '../atoms/BackButton';
import type { AppTheme } from '../lib/restyle';

export interface ScreenHeaderProps {
  title: string;
  tone?: BackButtonTone;
  onBack?: () => void;
  titleColor?: string;
  right?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  tone,
  onBack,
  titleColor,
  right,
}) => {
  const theme = useTheme<AppTheme>();

  return (
    <View style={styles.header}>
      <Text
        style={[styles.title, { color: titleColor ?? theme.colors.fg }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={styles.leftSlot} pointerEvents="box-none">
        <BackButton tone={tone} onPress={onBack} />
      </View>
      {right ? (
        <View style={styles.rightSlot} pointerEvents="box-none">
          {right}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 56,
  },
  leftSlot: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  rightSlot: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
