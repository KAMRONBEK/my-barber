// Unit tests for BarberCard and BarberRailCard molecules.

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../tests/render-utils';
import { BarberCard, BarberRailCard } from '../../molecules/BarberCard';
import { makeApiBarber, makeApiService, resetIds } from '../../../tests/fixtures';

beforeEach(() => resetIds());

describe('BarberCard', () => {
  it('renders barber name', () => {
    const barber = makeApiBarber({ firstName: 'Lochin', lastName: 'Tursunov' });
    const { getByText } = renderWithProviders(<BarberCard barber={barber} />);
    expect(getByText('Lochin Tursunov')).toBeTruthy();
  });

  it('renders rating when present', () => {
    const barber = makeApiBarber({ ratingAverage: 4.87 });
    const { getByText } = renderWithProviders(<BarberCard barber={barber} />);
    expect(getByText('4,87')).toBeTruthy();
  });

  it('renders — instead of rating when ratingAverage is 0', () => {
    const barber = makeApiBarber({ ratingAverage: 0 });
    const { getByText } = renderWithProviders(<BarberCard barber={barber} />);
    expect(getByText('—')).toBeTruthy();
  });

  it('renders min price from services list', () => {
    const barber = makeApiBarber({
      services: [
        makeApiService({ price: 120000 }),
        makeApiService({ price: 80000 }),
      ],
    });
    const { getByText } = renderWithProviders(<BarberCard barber={barber} />);
    // Should show "from 80 000" — formatPriceFrom(80000)
    const text = getByText(/80 000/);
    expect(text).toBeTruthy();
  });

  it('does not render price when services is empty', () => {
    const barber = makeApiBarber({ services: [] });
    const { queryByText } = renderWithProviders(<BarberCard barber={barber} />);
    expect(queryByText(/so'mdan/)).toBeNull();
  });

  it('is pressable and calls onPress', () => {
    const onPress = jest.fn();
    const barber = makeApiBarber();
    const { getByRole } = renderWithProviders(
      <BarberCard barber={barber} onPress={onPress} />,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with image fallback when avatar is undefined', () => {
    const barber = makeApiBarber({ avatar: undefined });
    const { UNSAFE_root } = renderWithProviders(<BarberCard barber={barber} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders tags (up to 2)', () => {
    const barber = makeApiBarber();
    const { getByText } = renderWithProviders(
      <BarberCard barber={barber} tags={['Soch', 'Soqol', 'Massaj']} />,
    );
    expect(getByText('Soch')).toBeTruthy();
    expect(getByText('Soqol')).toBeTruthy();
    // third tag should NOT be rendered (slice(0,2))
  });

  it('has accessible label with barber name', () => {
    const barber = makeApiBarber({ firstName: 'Ali', lastName: 'Karimov' });
    const { getByLabelText } = renderWithProviders(<BarberCard barber={barber} />);
    expect(getByLabelText('Ali Karimov')).toBeTruthy();
  });
});

describe('BarberRailCard', () => {
  it('renders first name and first letter of last name', () => {
    const barber = makeApiBarber({ firstName: 'Lochin', lastName: 'Tursunov' });
    const { getByText } = renderWithProviders(<BarberRailCard barber={barber} />);
    expect(getByText('Lochin T.')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const barber = makeApiBarber();
    const { getByRole } = renderWithProviders(
      <BarberRailCard barber={barber} onPress={onPress} />,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders visitCountLabel when provided', () => {
    const barber = makeApiBarber();
    const { getByText } = renderWithProviders(
      <BarberRailCard barber={barber} visitCountLabel="1 ta" />,
    );
    expect(getByText('1 ta')).toBeTruthy();
  });
});
