// Persisted language override, mirroring useAppearanceStore. Without an
// explicit choice, i18n.ts already falls back to the device locale (see
// resolveInitialLocale) — this only kicks in once the user picks a language
// from the Til (language) screen.

import { create } from 'zustand';
import i18n, { resolveInitialLocale, type SupportedLocale } from './i18n';
import { getItem, setItem } from './storage';

const STORAGE_KEY = 'locale';

interface LocaleState {
  locale: SupportedLocale;
  hydrate: () => Promise<void>;
  setLocale: (locale: SupportedLocale) => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: resolveInitialLocale(),
  hydrate: async () => {
    const stored = await getItem(STORAGE_KEY);
    if (stored !== 'uz' && stored !== 'ru') return;
    set({ locale: stored });
    await i18n.changeLanguage(stored);
  },
  setLocale: async (locale) => {
    set({ locale });
    await i18n.changeLanguage(locale);
    await setItem(STORAGE_KEY, locale);
  },
}));
