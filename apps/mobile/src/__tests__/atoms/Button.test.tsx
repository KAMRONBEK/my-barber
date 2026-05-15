// Unit tests for the Button atom.
// Coverage target: ≥90% branches/functions/lines.

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../tests/render-utils';
import { Button } from '../../atoms/Button';

describe('Button', () => {
  describe('rendering', () => {
    it('renders the label', () => {
      const { getByText } = renderWithProviders(
        <Button label="Test" />,
      );
      expect(getByText('Test')).toBeTruthy();
    });

    it('renders all variants without error', () => {
      const variants = ['primary', 'secondary', 'destructive', 'dark'] as const;
      for (const variant of variants) {
        const { getByText, unmount } = renderWithProviders(
          <Button label={variant} variant={variant} />,
        );
        expect(getByText(variant)).toBeTruthy();
        unmount();
      }
    });

    it('shows ActivityIndicator when loading=true and hides label', () => {
      const { queryByText, UNSAFE_getByType } = renderWithProviders(
        <Button label="Save" loading />,
      );
      // Label should not be rendered while loading
      expect(queryByText('Save')).toBeNull();
      const { ActivityIndicator } = require('react-native');
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('renders fullWidth without crashing', () => {
      const { getByText } = renderWithProviders(
        <Button label="Full" fullWidth />,
      );
      expect(getByText('Full')).toBeTruthy();
    });
  });

  describe('interaction', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProviders(
        <Button label="Press me" onPress={onPress} testID="btn" />,
      );
      fireEvent.press(getByTestId('btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProviders(
        <Button label="Disabled" onPress={onPress} disabled testID="btn" />,
      );
      fireEvent.press(getByTestId('btn'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does NOT call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProviders(
        <Button label="Loading" onPress={onPress} loading testID="btn" />,
      );
      fireEvent.press(getByTestId('btn'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibilityRole button', () => {
      const { getByRole } = renderWithProviders(
        <Button label="Accessible" />,
      );
      expect(getByRole('button')).toBeTruthy();
    });

    it('marks disabled state in accessibilityState', () => {
      const { getByRole } = renderWithProviders(
        <Button label="Disabled" disabled />,
      );
      const btn = getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('dark theme', () => {
    it('renders primary button in dark theme', () => {
      const { getByText } = renderWithProviders(
        <Button label="Dark Primary" variant="primary" />,
        { dark: true },
      );
      expect(getByText('Dark Primary')).toBeTruthy();
    });
  });
});
