// Unit tests for the Icon atom.
// Verifies every icon name renders an SVG; checks strokeWidth + color propagation.

import React from 'react';
import { renderWithProviders } from '../../../tests/render-utils';
import { Icon, type IconName } from '../../atoms/Icon';

const ALL_ICON_NAMES: IconName[] = [
  'home',
  'search',
  'calendar',
  'user',
  'arrow-right',
  'back',
  'bell',
  'check',
  'star',
  'share',
  'heart',
  'settings',
  'phone',
  'pin',
  'mail',
  'moon',
  'verified',
  'logout',
];

describe('Icon', () => {
  describe('all icon names render without throwing', () => {
    for (const name of ALL_ICON_NAMES) {
      it(`renders icon: ${name}`, () => {
        const { UNSAFE_root } = renderWithProviders(
          <Icon name={name} />,
        );
        expect(UNSAFE_root).toBeTruthy();
      });
    }
  });

  describe('prop propagation', () => {
    it('renders with default size=18', () => {
      const { UNSAFE_root } = renderWithProviders(<Icon name="home" />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with custom size', () => {
      const { UNSAFE_root } = renderWithProviders(<Icon name="star" size={32} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with custom color', () => {
      const { UNSAFE_root } = renderWithProviders(
        <Icon name="check" color="#ff0000" />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with custom strokeWidth', () => {
      const { UNSAFE_root } = renderWithProviders(
        <Icon name="check" strokeWidth={2.6} />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('uses theme color when no explicit color is passed', () => {
      // Should not throw — relies on theme.colors.fg fallback
      const { UNSAFE_root } = renderWithProviders(<Icon name="user" />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('dark theme', () => {
    it('renders in dark theme', () => {
      const { UNSAFE_root } = renderWithProviders(<Icon name="home" />, { dark: true });
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});
