/* eslint-env jest */
import { barberService } from '../../services/barberService';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

describe('barberService', () => {
  it('createBarber persists a hashed-password doc and returns id', async () => {
    const id = await barberService.createBarber({
      username: `bs_${Date.now()}`,
      password: 'secret12',
      firstName: 'B',
      lastName: 'L',
      phone: '+998901234567',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
    });
    const fetched = await barberService.getBarberById(id);
    expect(fetched?.password).not.toBe('secret12');
    expect(await barberService.validatePassword('secret12', fetched!.password!)).toBe(true);
  });

  it('getBarberByUsername returns null when missing', async () => {
    expect(await barberService.getBarberByUsername('nope')).toBeNull();
  });

  it('getBarberByUsername returns the matching barber', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'b-find', {
      id: 'b-find',
      username: 'unique-find',
      approvalStatus: 'approved',
    });
    const out = await barberService.getBarberByUsername('unique-find');
    expect(out?.id).toBe('b-find');
  });

  it('getBarberById returns null when missing', async () => {
    expect(await barberService.getBarberById('nope')).toBeNull();
  });

  it('getBarberWithServices returns null when missing', async () => {
    expect(await barberService.getBarberWithServices('nope')).toBeNull();
  });

  it('getAllBarbers paginates with limit and offset', async () => {
    for (let i = 0; i < 3; i++) {
      seedDoc(COLLECTIONS.BARBERS, `pg-${i}`, {
        id: `pg-${i}`,
        username: `pg${i}`,
        firstName: 'F',
        lastName: 'L',
        phone: '+998901234567',
        location: 'X',
        birthDate: '1990-01-01',
        workingHours: '9-5',
        images: [],
        approvalStatus: 'approved',
      });
    }

    const page0 = await barberService.getAllBarbers(0, 2);
    expect(page0.barbers.length).toBe(2);
    expect(page0.total).toBe(3);

    const page1 = await barberService.getAllBarbers(1, 2);
    expect(page1.barbers.length).toBeLessThanOrEqual(2);
  });

  it('listBarberServicesContract maps fields with defaults', async () => {
    seedDoc(COLLECTIONS.BARBER_SERVICES, 'cs1', {
      id: 'cs1',
      barberId: 'b-cs',
      name: 'Cut',
      price: 100,
    });

    const out = await barberService.listBarberServicesContract('b-cs');
    expect(out[0]).toMatchObject({
      id: 'cs1',
      catalog_service_id: null,
      duration_minutes: 30,
      is_active: true,
    });
  });

  it('upsertBarberServicesLineItems inserts and updates by catalog id', async () => {
    const first = await barberService.upsertBarberServicesLineItems('b-up', [
      {
        catalog_service_id: 'cat-1',
        name: 'Cut',
        price: 100,
        duration_minutes: 30,
        is_active: true,
      },
    ]);
    expect(first.length).toBe(1);

    const second = await barberService.upsertBarberServicesLineItems('b-up', [
      {
        catalog_service_id: 'cat-1',
        name: 'Cut',
        price: 200,
        duration_minutes: 45,
        is_active: false,
      },
    ]);
    expect(second[0].id).toBe(first[0].id);
    expect(second[0].price).toBe(200);
  });

  it('softDeleteBarberService validates ownership', async () => {
    seedDoc(COLLECTIONS.BARBER_SERVICES, 'sd1', {
      id: 'sd1',
      barberId: 'owner',
      name: 'X',
      price: 1,
      isActive: true,
    });
    expect(await barberService.softDeleteBarberService('owner', 'sd1')).toBe(true);
    expect(await barberService.softDeleteBarberService('owner', 'no-such')).toBe(false);
    seedDoc(COLLECTIONS.BARBER_SERVICES, 'sd2', {
      id: 'sd2',
      barberId: 'owner-a',
      name: 'X',
      price: 1,
      isActive: true,
    });
    expect(await barberService.softDeleteBarberService('owner-b', 'sd2')).toBe(false);
  });

  it('addBarberImages appends to existing images', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'img-b', {
      id: 'img-b',
      images: ['existing'],
    });
    await barberService.addBarberImages('img-b', ['a', 'b']);
    const after = await barberService.getBarberById('img-b');
    expect(after?.images).toEqual(['existing', 'a', 'b']);
  });

  it('addBarberImages throws when barber missing', async () => {
    await expect(barberService.addBarberImages('ghost', ['x'])).rejects.toThrow(
      'Barber not found'
    );
  });

  it('updateBarberCredentials hashes the new password', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'cred-b', {
      id: 'cred-b',
      username: 'cred-b',
      password: 'old',
    });
    await barberService.updateBarberCredentials('cred-b', 'new-name', 'newpass1');
    const after = await barberService.getBarberById('cred-b');
    expect(after?.username).toBe('new-name');
    expect(await barberService.validatePassword('newpass1', after!.password!)).toBe(true);
  });
});
