// Language picker screen — O'zbekcha / Русский. Persists via useLocaleStore
// and calls i18n.changeLanguage immediately, same pattern as appearance.tsx.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { Icon } from '../src/atoms/Icon';
import { ScreenHeader } from '../src/molecules/ScreenHeader';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { useLocaleStore } from '../src/lib/locale';
import type { SupportedLocale } from '../src/lib/i18n';
import type { AppTheme } from '../src/lib/restyle';

const LOCALES: SupportedLocale[] = ['uz', 'ru'];

export default function LanguageScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const labels: Record<SupportedLocale, string> = {
    uz: t('profile.languageUz'),
    ru: t('profile.languageRu'),
  };

  return (
    <ScreenLayout>
      <ScreenHeader title={t('profile.language')} />

      <View
        style={[
          styles.menu,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {LOCALES.map((l, i) => {
          const selected = l === locale;
          return (
            <Pressable
              key={l}
              onPress={() => setLocale(l)}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`language-${l}`}
            >
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.fg }}>
                {labels[l]}
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
