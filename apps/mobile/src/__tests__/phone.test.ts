import {
  formatLocalPhone,
  formatPhone,
  isPhoneUsername,
  localFromPhone,
  phoneFromLocal,
  toLocalDigits,
} from '../lib/phone';

describe('phone input', () => {
  it('groups the digits as the user types', () => {
    const typed = ['9', '90', '901', '9012345', '901234567'];
    expect(typed.map(formatLocalPhone)).toEqual([
      '9',
      '90',
      '90 1',
      '90 123 45',
      '90 123 45 67',
    ]);
  });

  it('keeps nine local digits and drops a pasted country code', () => {
    expect(toLocalDigits('90 123 45 678')).toBe('901234567');
    expect(toLocalDigits('+998 90 123 45 67')).toBe('901234567');
    expect(toLocalDigits('998901234567')).toBe('901234567');
    // A local number may itself start with 998.
    expect(toLocalDigits('99 812 34 567')).toBe('998123456');
  });

  it('builds a full number only when it is complete', () => {
    expect(phoneFromLocal('901234567')).toBe('+998901234567');
    expect(phoneFromLocal('90123456')).toBeNull();
  });

  it('formats stored numbers and recognises phone usernames', () => {
    expect(formatPhone('+998935000199')).toBe('+998 93 500 01 99');
    expect(formatPhone('+79161234567')).toBe('+79161234567');
    expect(isPhoneUsername('+998935000199')).toBe(true);
    expect(isPhoneUsername('client@test.local')).toBe(false);
  });

  it('reads a stored number back, unless it is foreign', () => {
    expect(localFromPhone('+998901234567')).toBe('901234567');
    expect(localFromPhone('+79161234567')).toBeNull();
    expect(localFromPhone('')).toBeNull();
  });
});
