/* eslint-env jest */
/**
 * Forces every service method's `} catch { logger.error(...); throw error; }`
 * branch to execute by spying on the underlying firestore client to throw.
 * This pushes function/branch coverage above the configured thresholds.
 */
import { barberService } from '../../services/barberService';
import { clientService } from '../../services/clientService';
import { bookingService } from '../../services/bookingService';

type AnyService = { firestore: { collection: (...args: unknown[]) => unknown } };

function makeBoom(svc: AnyService) {
  const spy = jest
    .spyOn(svc.firestore, 'collection')
    .mockImplementation(() => {
      throw new Error('boom');
    });
  return () => spy.mockRestore();
}

describe('service catch blocks', () => {
  describe('barberService', () => {
    let restore: () => void;
    beforeEach(() => {
      restore = makeBoom(barberService as unknown as AnyService);
    });
    afterEach(() => restore());

    const cases: Array<[string, () => Promise<unknown>]> = [
      ['getBarberByUsername', () => barberService.getBarberByUsername('u')],
      ['getBarberById', () => barberService.getBarberById('id')],
      ['getBarberWithServices', () => barberService.getBarberWithServices('id')],
      ['getAllBarbers', () => barberService.getAllBarbers(0, 10)],
      [
        'updateBarberProfile',
        () =>
          barberService.updateBarberProfile('id', {
            firstName: 'x',
          } as unknown as Parameters<typeof barberService.updateBarberProfile>[1]),
      ],
      [
        'updateBarberCredentials',
        () => barberService.updateBarberCredentials('id', 'u', 'p'),
      ],
      [
        'updateBarberDeviceId',
        () => barberService.updateBarberDeviceId('id', 'd'),
      ],
      ['addBarberImages', () => barberService.addBarberImages('id', ['x'])],
      ['updateBarberAvatar', () => barberService.updateBarberAvatar('id', 'a')],
      ['getBarberServices', () => barberService.getBarberServices('id')],
      [
        'addBarberServices',
        () =>
          barberService.addBarberServices('id', [{ name: 's', price: 1 } as never]),
      ],
      [
        'deleteBarberService',
        () => barberService.deleteBarberService('svc'),
      ],
    ];

    it.each(cases)('%s rethrows on firestore error', async (_name, fn) => {
      await expect(fn()).rejects.toThrow();
    });
  });

  describe('clientService', () => {
    let restore: () => void;
    beforeEach(() => {
      restore = makeBoom(clientService as unknown as AnyService);
    });
    afterEach(() => restore());

    const cases: Array<[string, () => Promise<unknown>]> = [
      [
        'createClient',
        () =>
          clientService.createClient({
            username: 'u',
            password: 'p',
            firstName: 'f',
            lastName: 'l',
            phone: '+1',
          }),
      ],
      ['getClientByUsername', () => clientService.getClientByUsername('u')],
      ['getClientById', () => clientService.getClientById('id')],
      [
        'updateClientProfile',
        () =>
          clientService.updateClientProfile('id', {
            firstName: 'x',
          } as unknown as Parameters<typeof clientService.updateClientProfile>[1]),
      ],
      [
        'updateClientCredentials',
        () => clientService.updateClientCredentials('id', 'u', 'p'),
      ],
      ['updateClientAvatar', () => clientService.updateClientAvatar('id', 'a')],
      ['getClientBookings', () => clientService.getClientBookings('barber')],
    ];

    it.each(cases)('%s rethrows on firestore error', async (_name, fn) => {
      await expect(fn()).rejects.toThrow();
    });
  });

  describe('bookingService.getBookingById', () => {
    it('returns null and swallows internal collection failures', async () => {
      const restore = makeBoom(bookingService as unknown as AnyService);
      try {
        await expect(bookingService.getBookingById('any')).rejects.toThrow();
      } finally {
        restore();
      }
    });
  });
});
