// Unit tests for the Text atom.

import React from 'react';
import { renderWithProviders } from '../../../tests/render-utils';
import { Text } from '../../atoms/Text';

describe('Text', () => {
  it('renders children', () => {
    const { getByText } = renderWithProviders(<Text>Hello world</Text>);
    expect(getByText('Hello world')).toBeTruthy();
  });

  it('accepts variant prop (title)', () => {
    const { getByText } = renderWithProviders(
      <Text variant="title">Title text</Text>,
    );
    expect(getByText('Title text')).toBeTruthy();
  });

  it('accepts variant prop (footnote)', () => {
    const { getByText } = renderWithProviders(
      <Text variant="footnote">Footnote text</Text>,
    );
    expect(getByText('Footnote text')).toBeTruthy();
  });

  it('accepts variant prop (caption)', () => {
    const { getByText } = renderWithProviders(
      <Text variant="caption">Caption</Text>,
    );
    expect(getByText('Caption')).toBeTruthy();
  });

  it('accepts variant prop (display)', () => {
    const { getByText } = renderWithProviders(
      <Text variant="display">Display</Text>,
    );
    expect(getByText('Display')).toBeTruthy();
  });

  it('accepts color override via style prop', () => {
    const { getByText } = renderWithProviders(
      <Text style={{ color: '#ff0000' }}>Colored</Text>,
    );
    expect(getByText('Colored')).toBeTruthy();
  });

  it('renders in dark theme', () => {
    const { getByText } = renderWithProviders(<Text>Dark text</Text>, { dark: true });
    expect(getByText('Dark text')).toBeTruthy();
  });

  it('accepts numberOfLines', () => {
    const { getByText } = renderWithProviders(
      <Text numberOfLines={1}>Long text that gets truncated</Text>,
    );
    expect(getByText('Long text that gets truncated')).toBeTruthy();
  });

  it('accepts color via Restyle color prop', () => {
    const { getByText } = renderWithProviders(
      <Text color="muted">Muted text</Text>,
    );
    expect(getByText('Muted text')).toBeTruthy();
  });
});
