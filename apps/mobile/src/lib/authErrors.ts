// Turns a failed sign-in or sign-up request into a translation key, so the
// user learns what to fix instead of a generic failure.

import { isAxiosError } from 'axios';

const SERVER_MESSAGES: Record<string, string> = {
  'Phone already registered': 'signup.errors.phoneTaken',
  'Username already exists': 'signup.errors.usernameTaken',
};

export function authErrorKey(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return 'auth.networkError';
  if (error.response.status === 429) return 'auth.tooManyAttempts';
  const message = (error.response.data as { error?: string } | undefined)?.error;
  return (message && SERVER_MESSAGES[message]) || fallback;
}
