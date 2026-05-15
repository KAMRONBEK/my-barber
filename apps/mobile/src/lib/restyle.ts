// Centralized Restyle-bound primitives. Use these instead of importing from
// `@shopify/restyle` directly so the Theme type stays in sync with the
// shared theme.

import {
  createBox,
  createText,
  createRestyleComponent,
} from '@shopify/restyle';
import type { Theme } from '@my-barber/ui';

export type AppTheme = Theme;

export const Box = createBox<Theme>();
export const ThemedText = createText<Theme>();

export { createRestyleComponent };
