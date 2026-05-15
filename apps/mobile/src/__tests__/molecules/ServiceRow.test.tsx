// Unit tests for ServiceRow molecule.

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../tests/render-utils';
import { ServiceRow } from '../../molecules/ServiceRow';
import { makeApiService, resetIds } from '../../../tests/fixtures';

beforeEach(() => resetIds());

describe('ServiceRow', () => {
  describe('rendering', () => {
    it('renders service name', () => {
      const service = makeApiService({ name: 'Soch olish' });
      const { getByText } = renderWithProviders(
        <ServiceRow service={service} selected={false} onToggle={jest.fn()} />,
      );
      expect(getByText('Soch olish')).toBeTruthy();
    });

    it('renders price formatted as UZS', () => {
      const service = makeApiService({ price: 80000 });
      const { getByText } = renderWithProviders(
        <ServiceRow service={service} selected={false} onToggle={jest.fn()} />,
      );
      expect(getByText(/80 000/)).toBeTruthy();
    });

    it('renders duration in minutes', () => {
      const service = makeApiService({ durationMinutes: 30 });
      const { getByText } = renderWithProviders(
        <ServiceRow service={service} selected={false} onToggle={jest.fn()} />,
      );
      expect(getByText(/30.*min/)).toBeTruthy();
    });

    it('uses DEFAULT_SERVICE_DURATION_MINUTES when durationMinutes is 0', () => {
      const service = makeApiService({ durationMinutes: 0 });
      const { getByText } = renderWithProviders(
        <ServiceRow service={service} selected={false} onToggle={jest.fn()} />,
      );
      // Should fall back to 30 min default
      expect(getByText(/30.*min/)).toBeTruthy();
    });

    it('renders optional description when provided', () => {
      const service = makeApiService();
      const { getByText } = renderWithProviders(
        <ServiceRow
          service={service}
          selected={false}
          onToggle={jest.fn()}
          description="Professional soch olish xizmati"
        />,
      );
      expect(getByText('Professional soch olish xizmati')).toBeTruthy();
    });

    it('does not render description when absent', () => {
      const service = makeApiService();
      const { queryByText } = renderWithProviders(
        <ServiceRow service={service} selected={false} onToggle={jest.fn()} />,
      );
      expect(queryByText('Professional soch olish xizmati')).toBeNull();
    });
  });

  describe('selected vs deselected styling', () => {
    it('renders deselected state without crashing', () => {
      const service = makeApiService();
      const { UNSAFE_root } = renderWithProviders(
        <ServiceRow service={service} selected={false} onToggle={jest.fn()} />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders selected state without crashing', () => {
      const service = makeApiService();
      const { UNSAFE_root } = renderWithProviders(
        <ServiceRow service={service} selected={true} onToggle={jest.fn()} />,
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('has accessibilityState checked=true when selected', () => {
      const service = makeApiService({ name: 'Soch olish' });
      const { getByRole } = renderWithProviders(
        <ServiceRow service={service} selected={true} onToggle={jest.fn()} />,
      );
      const checkbox = getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('has accessibilityState checked=false when deselected', () => {
      const service = makeApiService({ name: 'Soch olish' });
      const { getByRole } = renderWithProviders(
        <ServiceRow service={service} selected={false} onToggle={jest.fn()} />,
      );
      const checkbox = getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('interaction', () => {
    it('calls onToggle with service id when pressed', () => {
      const onToggle = jest.fn();
      const service = makeApiService({ id: 'svc-test-id', name: 'Soch olish' });
      const { getByRole } = renderWithProviders(
        <ServiceRow service={service} selected={false} onToggle={onToggle} />,
      );
      fireEvent.press(getByRole('checkbox'));
      expect(onToggle).toHaveBeenCalledWith('svc-test-id');
    });

    it('calls onToggle when pressing to deselect', () => {
      const onToggle = jest.fn();
      const service = makeApiService({ id: 'svc-test-id', name: 'Soch olish' });
      const { getByRole } = renderWithProviders(
        <ServiceRow service={service} selected={true} onToggle={onToggle} />,
      );
      fireEvent.press(getByRole('checkbox'));
      expect(onToggle).toHaveBeenCalledWith('svc-test-id');
    });
  });
});
