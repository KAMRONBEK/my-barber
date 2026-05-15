// Shared render wrapper: ThemeProvider + QueryClientProvider + I18nextProvider.
// Screen tests import `renderWithProviders` instead of RNTL's `render`.

import React from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { theme, darkTheme } from '@my-barber/ui';
import i18n from '../src/lib/i18n';

// Re-export everything from RNTL so test files only need one import.
export * from '@testing-library/react-native';

type RenderWithProvidersOptions = RenderOptions & {
  dark?: boolean;
  queryClient?: QueryClient;
};

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  { dark = false, queryClient, ...options }: RenderWithProvidersOptions = {},
) {
  const qc = queryClient ?? makeQueryClient();
  const activeTheme = dark ? darkTheme : theme;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={activeTheme}>{children}</ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );

  return { ...render(ui, { wrapper: Wrapper, ...options }), qc };
}
