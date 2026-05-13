import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, createBox, createText } from '@shopify/restyle';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme, type Theme } from './theme';
import { APP_NAME } from '@my-barber/config';

const Box = createBox<Theme>();
const Text = createText<Theme>();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <Box flex={1} backgroundColor="background" alignItems="center" justifyContent="center" padding="l">
          <Text variant="header">{APP_NAME}</Text>
          <Text variant="caption" marginTop="s">
            Welcome — start by editing App.tsx
          </Text>
          <StatusBar style="auto" />
        </Box>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
