// Thin wrapper over expo-haptics. Haptics are a nice-to-have — never let a
// misbehaving native module (or the web platform, which has none of this)
// crash or block the interaction they're attached to.

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Tab switches, segmented controls — iOS's "selection changed" tick. */
export function hapticSelection(): void {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

/** Toggles like favoriting/liking — a light tap confirming the action landed. */
export function hapticToggle(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
