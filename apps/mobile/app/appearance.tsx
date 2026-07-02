// Appearance picker screen — System / Light / Dark. Persists via
// useAppearanceStore; app/_layout.tsx reacts to it immediately since both
// read from the same store.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { Icon } from '../src/atoms/Icon';
import { ScreenHeader } from '../src/molecules/ScreenHeader';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { useAppearanceStore, type AppearanceMode } from '../src/lib/appearance';
import type { AppTheme } from '../src/lib/restyle';

const MODES: AppearanceMode[] = ['system', 'light', 'dark'];

export default function AppearanceScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const mode = useAppearanceStore((s) => s.mode);
  const setMode = useAppearanceStore((s) => s.setMode);

  const labels: Record<AppearanceMode, string> = {
    system: t('profile.appearanceSystem'),
    light: t('profile.appearanceLight'),
    dark: t('profile.appearanceDark'),
  };

  return (
    <ScreenLayout>
      <ScreenHeader title={t('profile.appearance')} />

      <View
        style={[
          styles.menu,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {MODES.map((m, i) => {
          const selected = m === mode;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`appearance-${m}`}
            >
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.fg }}>
                {labels[m]}
              </Text>
              {selected ? (
                <Icon name="check" size={18} color={theme.colors.accent} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  menu: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
});
