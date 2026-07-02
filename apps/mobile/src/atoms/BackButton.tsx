// Circular back control — glass pill on dark hero, surface pill on light screens.

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Icon } from './Icon';
import type { AppTheme } from '../lib/restyle';

export type BackButtonTone = 'light' | 'dark';

export interface BackButtonProps {
  onPress?: () => void;
  tone?: BackButtonTone;
  testID?: string;
}

export const BACK_BUTTON_SIZE = 40;
const BACK_ICON_SIZE = 18;

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  tone = 'light',
  testID = 'back-button',
}) => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();

  const onDark = tone === 'dark';

  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      style={({ pressed }) => [
        styles.btn,
        {
          opacity: pressed ? 0.85 : 1,
          backgroundColor: onDark
            ? 'rgba(255,255,255,0.12)'
            : theme.colors.surface2,
          borderColor: onDark
            ? 'rgba(255,255,255,0.18)'
            : theme.colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      testID={testID}
    >
      <Icon
        name="back"
        size={BACK_ICON_SIZE}
        color={onDark ? '#fff' : theme.colors.fg}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
