import {
  EMPTY_SIGNUP_VALUES,
  buildBarberSignup,
  buildClientSignup,
  maskDate,
  maskTime,
  parseBirthDate,
  passwordErrors,
} from '../lib/signupForm';
import { authErrorKey } from '../lib/authErrors';
import ru from '../locales/ru/common.json';
import uz from '../locales/uz/common.json';

const NOW = new Date('2026-11-27T00:00:00Z');

const client = {
  ...EMPTY_SIGNUP_VALUES,
  firstName: ' Ali ',
  phone: '901234567',
};

const barber = {
  ...client,
  lastName: 'Karimov',
  username: 'ali_barber',
  address: 'Amir Temur 1',
  birthDate: '05.03.1995',
};

describe('client sign-up form', () => {
  it('needs only a name and phone before the password step', () => {
    expect(buildClientSignup(client)).toEqual({
      ok: true,
      body: {
        firstName: 'Ali',
        lastName: '',
        phone: '+998901234567',
      },
    });
  });

  it('reports every problem at once', () => {
    const result = buildClientSignup({
      ...EMPTY_SIGNUP_VALUES,
      firstName: '  ',
      phone: '9012345',
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        firstName: 'signup.errors.required',
        phone: 'signup.errors.phone',
      },
    });
  });
});

describe('barber sign-up form', () => {
  it('sends the address as text when no map point was picked', () => {
    const result = buildBarberSignup(barber, null, NOW);
    expect(result).toMatchObject({
      ok: true,
      body: {
        username: 'ali_barber',
        location: 'Amir Temur 1',
        birthDate: '1995-03-05',
        workingHours: '09:00 - 18:00',
      },
    });
  });

  it('sends the picked point with the address as typed', () => {
    const result = buildBarberSignup(
      barber,
      { address: 'old', latitude: 41.3, longitude: 69.2 },
      NOW,
    );
    expect(result.ok && result.body.location).toEqual({
      address: 'Amir Temur 1',
      coords: { latitude: 41.3, longitude: 69.2 },
    });
  });

  it('requires the barber fields and a closing time after opening', () => {
    const result = buildBarberSignup(
      { ...client, opensAt: '18:00', closesAt: '09:00' },
      null,
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual([
      'address',
      'birthDate',
      'closesAt',
      'lastName',
      'username',
    ]);
  });
});

describe('password step', () => {
  it('requires eight characters typed the same way twice', () => {
    expect(passwordErrors('password1', 'password1')).toEqual({});
    expect(passwordErrors('short', 'short')).toEqual({
      password: 'signup.errors.password',
    });
    expect(passwordErrors('password1', 'password2')).toEqual({
      confirm: 'signup.errors.passwordMismatch',
    });
    expect(passwordErrors('password1', '')).toEqual({
      confirm: 'signup.errors.passwordMismatch',
    });
  });
});

describe('input masks and dates', () => {
  it('formats while typing', () => {
    expect(maskDate('0503')).toBe('05.03');
    expect(maskDate('05.03.19951')).toBe('05.03.1995');
    expect(maskTime('930')).toBe('93:0');
    expect(maskTime('0930')).toBe('09:30');
  });

  it('rejects impossible or future birth dates', () => {
    expect(parseBirthDate('31.02.1995', NOW)).toBeNull();
    expect(parseBirthDate('01.01.2030', NOW)).toBeNull();
    expect(parseBirthDate('1995-03-05', NOW)).toBeNull();
  });
});

describe('auth error messages', () => {
  const axiosError = (status?: number, error?: string) => ({
    isAxiosError: true,
    response: status ? { status, data: { error } } : undefined,
  });

  it('names the reason', () => {
    expect(authErrorKey(axiosError(), 'x')).toBe('auth.networkError');
    expect(authErrorKey(axiosError(429), 'x')).toBe('auth.tooManyAttempts');
    expect(authErrorKey(axiosError(400, 'Phone already registered'), 'x')).toBe(
      'signup.errors.phoneTaken',
    );
    expect(authErrorKey(axiosError(401, 'Invalid credentials'), 'x')).toBe('x');
  });

  it('has Uzbek and Russian text for every new key', () => {
    const keys = (node: object, prefix = ''): string[] =>
      Object.entries(node).flatMap(([k, v]) =>
        typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    for (const section of ['auth', 'signup', 'approval'] as const) {
      expect(keys(uz[section]).sort()).toEqual(keys(ru[section]).sort());
    }
  });
});
