// Unit tests for the Input atom.

import React, { useState } from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../tests/render-utils';
import { Input } from '../../atoms/Input';

describe('Input', () => {
  describe('rendering', () => {
    it('renders without label or error', () => {
      const { UNSAFE_root } = renderWithProviders(
        <Input value="" onChangeText={jest.fn()} />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders label when provided', () => {
      const { getByText } = renderWithProviders(
        <Input label="Foydalanuvchi nomi" value="" onChangeText={jest.fn()} />,
      );
      expect(getByText('Foydalanuvchi nomi')).toBeTruthy();
    });

    it('does not render label when not provided', () => {
      const { queryByText } = renderWithProviders(
        <Input value="" onChangeText={jest.fn()} />,
      );
      expect(queryByText('Foydalanuvchi nomi')).toBeNull();
    });

    it('renders error text when errorText is provided', () => {
      const { getByText } = renderWithProviders(
        <Input
          label="Parol"
          value=""
          onChangeText={jest.fn()}
          errorText="Parol noto'g'ri"
        />,
      );
      expect(getByText("Parol noto'g'ri")).toBeTruthy();
    });

    it('does not render error text when errorText is absent', () => {
      const { queryByText } = renderWithProviders(
        <Input value="" onChangeText={jest.fn()} />,
      );
      expect(queryByText(/noto'g'ri/)).toBeNull();
    });
  });

  describe('interaction', () => {
    it('calls onChangeText when user types', () => {
      const onChangeText = jest.fn();
      const { UNSAFE_getByType } = renderWithProviders(
        <Input value="" onChangeText={onChangeText} testID="my-input" />,
      );
      const { TextInput } = require('react-native');
      const input = UNSAFE_getByType(TextInput);
      fireEvent.changeText(input, 'newvalue');
      expect(onChangeText).toHaveBeenCalledWith('newvalue');
    });
  });

  describe('secureTextEntry', () => {
    it('renders with secureTextEntry without crashing', () => {
      const { UNSAFE_getByType } = renderWithProviders(
        <Input value="" onChangeText={jest.fn()} secureTextEntry />,
      );
      const { TextInput } = require('react-native');
      expect(UNSAFE_getByType(TextInput)).toBeTruthy();
    });
  });

  describe('focus state', () => {
    it('renders TextInput that can receive focus events', () => {
      const { UNSAFE_getByType } = renderWithProviders(
        <Input value="" onChangeText={jest.fn()} />,
      );
      const { TextInput } = require('react-native');
      const input = UNSAFE_getByType(TextInput);
      // fireEvent.focus should not throw
      expect(() => fireEvent(input, 'focus')).not.toThrow();
      expect(() => fireEvent(input, 'blur')).not.toThrow();
    });
  });

  describe('testID forwarding', () => {
    it('sets testID on TextInput', () => {
      const { getByTestId } = renderWithProviders(
        <Input value="" onChangeText={jest.fn()} testID="input-test" />,
      );
      expect(getByTestId('input-test')).toBeTruthy();
    });
  });
});
