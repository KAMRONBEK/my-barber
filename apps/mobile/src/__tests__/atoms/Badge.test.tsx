// Unit tests for the Badge atom.

import React from 'react';
import { renderWithProviders } from '../../../tests/render-utils';
import { Badge, type BadgeTone } from '../../atoms/Badge';

describe('Badge', () => {
  const tones: BadgeTone[] = ['neutral', 'success', 'warning', 'danger', 'accent'];

  describe('rendering', () => {
    it('renders the label text', () => {
      const { getByText } = renderWithProviders(<Badge label="Tasdiqlangan" />);
      expect(getByText('Tasdiqlangan')).toBeTruthy();
    });

    it('renders all tone variants without crashing', () => {
      for (const tone of tones) {
        const { getByText, unmount } = renderWithProviders(
          <Badge label={tone} tone={tone} />,
        );
        expect(getByText(tone)).toBeTruthy();
        unmount();
      }
    });

    it('defaults to neutral tone when not specified', () => {
      const { getByText } = renderWithProviders(<Badge label="Default" />);
      expect(getByText('Default')).toBeTruthy();
    });
  });

  describe('semantic color variants', () => {
    it('renders success tone', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Tasdiqlangan" tone="success" />,
      );
      expect(getByText('Tasdiqlangan')).toBeTruthy();
    });

    it('renders danger tone', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Bekor qilindi" tone="danger" />,
      );
      expect(getByText('Bekor qilindi')).toBeTruthy();
    });

    it('renders accent tone', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Mijoz" tone="accent" />,
      );
      expect(getByText('Mijoz')).toBeTruthy();
    });

    it('renders warning tone', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Kutilmoqda" tone="warning" />,
      );
      expect(getByText('Kutilmoqda')).toBeTruthy();
    });
  });

  describe('dark theme', () => {
    it('renders in dark theme', () => {
      const { getByText } = renderWithProviders(
        <Badge label="Dark badge" tone="success" />,
        { dark: true },
      );
      expect(getByText('Dark badge')).toBeTruthy();
    });
  });
});
