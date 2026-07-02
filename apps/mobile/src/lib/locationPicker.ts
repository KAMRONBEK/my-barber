// Ephemeral hand-off between the map location picker and whichever screen
// opened it (currently profile-edit). Avoids threading picked coordinates
// through expo-router params across a screen that's already mounted.

import { create } from 'zustand';

export interface PickedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerState {
  result: PickedLocation | null;
  setResult: (result: PickedLocation) => void;
  clear: () => void;
}

export const useLocationPickerStore = create<LocationPickerState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
