// Phone field with a fixed +998. `value` holds only the local digits.

import React from 'react';
import { Input, type InputProps } from '../atoms/Input';
import { PHONE_PREFIX, formatLocalPhone, toLocalDigits } from '../lib/phone';

export interface PhoneInputProps
  extends Omit<InputProps, 'value' | 'onChangeText' | 'prefix'> {
  value: string;
  onChangeText: (localDigits: string) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  ...props
}) => (
  <Input
    {...props}
    prefix={PHONE_PREFIX}
    value={formatLocalPhone(value)}
    onChangeText={(text) => onChangeText(toLocalDigits(text))}
    keyboardType="number-pad"
    textContentType="telephoneNumber"
    placeholder="90 123 45 67"
  />
);
