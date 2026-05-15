// Plain themed text input. Minimal — login screen and profile-edit are the
// only consumers for the vertical slice. Wraps RN TextInput with our theme.

import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Text } from './Text';
import type { AppTheme } from '../lib/restyle';

export interface InputProps extends TextInputProps {
  label?: string;
  errorText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  errorText,
  style,
  ...textProps
}) => {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 12,
            fontWeight: '500',
            letterSpacing: 0.4,
            marginBottom: 6,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.muted2}
        {...textProps}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface2,
            borderColor: errorText ? theme.colors.danger : theme.colors.border,
            color: theme.colors.fg,
          },
          style,
        ]}
      />
      {errorText ? (
        <Text
          style={{
            color: theme.colors.danger,
            fontSize: 12,
            marginTop: 6,
          }}
        >
          {errorText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: 14,
  },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
  },
});
