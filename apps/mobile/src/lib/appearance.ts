// Persisted light/dark/system theme override. `system` (default) follows
// the OS color scheme; `light`/`dark` pin the app regardless of OS setting.

import { create } from 'zustand';
import { getItem, setItem } from './storage';

export type AppearanceMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'appearanceMode';

interface AppearanceState {
  mode: AppearanceMode;
  hydrate: () => Promise<void>;
  setMode: (mode: AppearanceMode) => Promise<void>;
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  mode: 'system',
  hydrate: async () => {
    const stored = await getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      set({ mode: stored });
    }
  },
  setMode: async (mode) => {
    set({ mode });
    await setItem(STORAGE_KEY, mode);
  },
}));
