// Unit tests for the Avatar atom.

import React from 'react';
import { renderWithProviders } from '../../../tests/render-utils';
import { Avatar } from '../../atoms/Avatar';

describe('Avatar', () => {
  describe('image rendering', () => {
    it('renders expo-image when uri is provided', () => {
      const { UNSAFE_getByType } = renderWithProviders(
        <Avatar uri="https://example.com/avatar.jpg" />,
      );
      const { Image } = require('react-native');
      // expo-image is mocked to RN Image
      expect(UNSAFE_getByType(Image)).toBeTruthy();
    });
  });

  describe('initials fallback', () => {
    it('renders initials when uri is not provided', () => {
      const { getByText } = renderWithProviders(
        <Avatar initials="LT" />,
      );
      expect(getByText('LT')).toBeTruthy();
    });

    it('slices initials to 2 characters and uppercases', () => {
      const { getByText } = renderWithProviders(
        <Avatar initials="lochin" />,
      );
      expect(getByText('LO')).toBeTruthy();
    });

    it('handles empty initials gracefully', () => {
      const { queryByText } = renderWithProviders(
        <Avatar />,
      );
      // Should render an empty text, not crash
      expect(queryByText('undefined')).toBeNull();
    });
  });

  describe('null/undefined uri', () => {
    it('shows initials when uri is null', () => {
      const { getByText } = renderWithProviders(
        <Avatar uri={null} initials="AB" />,
      );
      expect(getByText('AB')).toBeTruthy();
    });
  });

  describe('size prop', () => {
    it('renders with custom size', () => {
      // Should not throw with any size value
      const { UNSAFE_root } = renderWithProviders(
        <Avatar size={64} initials="XY" />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('ring variant', () => {
    it('renders with ring=true without crashing', () => {
      const { UNSAFE_root } = renderWithProviders(
        <Avatar initials="AB" ring />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('dark theme', () => {
    it('renders in dark theme', () => {
      const { getByText } = renderWithProviders(
        <Avatar initials="DT" />,
        { dark: true },
      );
      expect(getByText('DT')).toBeTruthy();
    });
  });
});
