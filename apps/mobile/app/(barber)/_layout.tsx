// Barber workspace route group layout.
// TODO: add role guard — if the authenticated user is not a barber, redirect to /(tabs).
import { Stack } from 'expo-router';

export default function BarberLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
