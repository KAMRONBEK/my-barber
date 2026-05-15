// Thin wrapper over expo-secure-store. SecureStore is only available on
// device — on web/test it throws, so we fall back to in-memory storage so
// the app still boots in Expo's web preview / Jest.
//
// Keys are namespaced under `mb.` to avoid collisions with libraries.
//
// VIS-002: SecureStore.getItemAsync can hang indefinitely on the iOS 26
// simulator (cold launch). All reads are wrapped in a 2-second timeout that
// resolves to null, keeping the app from stalling on the 'unknown' auth state.

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memory: Record<string, string> = {};

function canUseSecureStore(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((res) => setTimeout(() => res(fallback), ms)),
  ]);
}

export async function setItem(key: string, value: string): Promise<void> {
  const k = `mb.${key}`;
  if (canUseSecureStore()) {
    await SecureStore.setItemAsync(k, value);
  } else {
    memory[k] = value;
  }
}

export async function getItem(key: string): Promise<string | null> {
  const k = `mb.${key}`;
  if (canUseSecureStore()) {
    return withTimeout(SecureStore.getItemAsync(k), 2000, null);
  }
  return memory[k] ?? null;
}

export async function removeItem(key: string): Promise<void> {
  const k = `mb.${key}`;
  if (canUseSecureStore()) {
    await SecureStore.deleteItemAsync(k);
  } else {
    delete memory[k];
  }
}

export const STORAGE_KEYS = {
  jwt: 'jwt',
  client: 'client',
} as const;
