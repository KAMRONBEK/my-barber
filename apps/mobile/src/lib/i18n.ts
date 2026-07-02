// Mobile i18n setup. Two locales: uz (default), ru. We detect the device
// locale via expo-localization and fall back to uz when neither matches.
//
// Translator-review note: every key is currently authored by the engineer.
// The Uzbek strings come from OD's _localization-map.md (canonical). The
// Russian strings are stub translations that need a native speaker pass.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import uzCommon from '../locales/uz/common.json';
import ruCommon from '../locales/ru/common.json';

export type SupportedLocale = 'uz' | 'ru';

export const DEFAULT_LOCALE: SupportedLocale = 'uz';
export const SUPPORTED_LOCALES: SupportedLocale[] = ['uz', 'ru'];

export function resolveInitialLocale(): SupportedLocale {
  try {
    const locales = getLocales();
    for (const l of locales) {
      const tag = (l.languageCode ?? '').toLowerCase() as SupportedLocale;
      if (SUPPORTED_LOCALES.includes(tag)) return tag;
    }
  } catch {
    // expo-localization can throw in odd web/test environments; fall through.
  }
  return DEFAULT_LOCALE;
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        uz: { common: uzCommon },
        ru: { common: ruCommon },
      },
      lng: resolveInitialLocale(),
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'common',
      ns: ['common'],
      interpolation: { escapeValue: false },
      returnNull: false,
      compatibilityJSON: 'v4',
    })
    .catch(() => {
      // i18next surfaces init errors via callbacks; we don't want to crash boot.
    });
}

export default i18n;
