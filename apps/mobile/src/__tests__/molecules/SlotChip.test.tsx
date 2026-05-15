// Unit tests for SlotChip molecule.

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../tests/render-utils';
import { SlotChip } from '../../molecules/SlotChip';

const SLOT_TIME = new Date(2026, 4, 16, 10, 0, 0); // 10:00

describe('SlotChip', () => {
  describe('rendering', () => {
    it('renders formatted time text', () => {
      const { getByText } = renderWithProviders(
        <SlotChip
          startAt={SLOT_TIME}
          selected={false}
          disabled={false}
          onPress={jest.fn()}
        />,
      );
      expect(getByText('10:00')).toBeTruthy();
    });

    it('renders in available state without error', () => {
      const { UNSAFE_root } = renderWithProviders(
        <SlotChip
          startAt={SLOT_TIME}
          selected={false}
          disabled={false}
          onPress={jest.fn()}
        />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders in selected state without error', () => {
      const { UNSAFE_root } = renderWithProviders(
        <SlotChip
          startAt={SLOT_TIME}
          selected={true}
          disabled={false}
          onPress={jest.fn()}
        />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders in disabled state without error', () => {
      const { UNSAFE_root } = renderWithProviders(
        <SlotChip
          startAt={SLOT_TIME}
          selected={false}
          disabled={true}
          onPress={jest.fn()}
        />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has accessibilityLabel with formatted time', () => {
      const { getByLabelText } = renderWithProviders(
        <SlotChip
          startAt={SLOT_TIME}
          selected={false}
          disabled={false}
          onPress={jest.fn()}
        />,
      );
      expect(getByLabelText('10:00')).toBeTruthy();
    });

    it('marks disabled state in accessibilityState', () => {
      const { getByRole } = renderWithProviders(
        <SlotChip
          startAt={SLOT_TIME}
          selected={false}
          disabled={true}
          onPress={jest.fn()}
        />,
      );
      expect(getByRole('button')).toBeDisabled();
    });
  });

  describe('interaction', () => {
    it('calls onPress when available and pressed', () => {
      const onPress = jest.fn();
      const { getByRole } = renderWithProviders(
        <SlotChip
          startAt={SLOT_TIME}
          selected={false}
          disabled={false}
          onPress={onPress}
        />,
      );
      fireEvent.press(getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(SLOT_TIME);
    });

    it('does NOT call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByRole } = renderWithProviders(
        <SlotChip
          startAt={SLOT_TIME}
          selected={false}
          disabled={true}
          onPress={onPress}
        />,
      );
      // When disabled=true, Pressable itself is disabled, fireEvent.press is blocked
      fireEvent.press(getByRole('button'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });
});
