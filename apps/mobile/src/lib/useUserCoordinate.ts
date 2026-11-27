// The user's position for distances. Never blocks a screen: no permission or a
// location error simply leaves it unknown.

import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from './maps';

export async function readUserCoordinate(ask: boolean): Promise<LatLng | null> {
  try {
    const { status } = ask
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      // Android's "improve location accuracy" dialog only after a user action.
      mayShowUserSettingsDialog: ask,
    });
    return { latitude: coords.latitude, longitude: coords.longitude };
  } catch {
    // Location services off or no fix available.
    return null;
  }
}

/**
 * With `askOnMount` the permission prompt appears when the screen opens;
 * otherwise only `request()` prompts.
 */
export function useUserCoordinate(askOnMount = false) {
  const [coordinate, setCoordinate] = useState<LatLng | null>(null);

  const read = useCallback(async (ask: boolean) => {
    const next = await readUserCoordinate(ask);
    if (next) setCoordinate(next);
    return next;
  }, []);

  useEffect(() => {
    void read(askOnMount);
  }, [read, askOnMount]);

  const request = useCallback(() => read(true), [read]);
  return { coordinate, request };
}
