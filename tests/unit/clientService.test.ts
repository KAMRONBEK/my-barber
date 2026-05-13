/* eslint-env jest */
import { clientService } from '../../services/clientService';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

describe('clientService', () => {
  it('createClient persists hashed-password client and returns id', async () => {
    const id = await clientService.createClient({
      username: `cs_${Date.now()}`,
      password: 'secret12',
      firstName: 'C',
      lastName: 'L',
      phone: '+998901234567',
    });
    const out = await clientService.getClientById(id);
    expect(out?.password).not.toBe('secret12');
    expect(
      await clientService.validatePassword('secret12', out!.password!)
    ).toBe(true);
  });

  it('getClientByUsername returns null when missing', async () => {
    expect(await clientService.getClientByUsername('nope')).toBeNull();
  });

  it('getClientByUsername returns the matching client', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'cf', {
      id: 'cf',
      username: 'cf-name',
    });
    expect((await clientService.getClientByUsername('cf-name'))?.id).toBe('cf');
  });

  it('getClientById returns null when missing', async () => {
    expect(await clientService.getClientById('nope')).toBeNull();
  });

  it('updateClientProfile writes update and updatedAt', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'cp1', { id: 'cp1', firstName: 'old' });
    await clientService.updateClientProfile('cp1', { firstName: 'new' });
    expect((await clientService.getClientById('cp1'))?.firstName).toBe('new');
  });

  it('updateClientCredentials hashes the new password', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'cc1', {
      id: 'cc1',
      username: 'cc1',
      password: 'old',
    });
    await clientService.updateClientCredentials('cc1', 'new-name', 'newpass1');
    const after = await clientService.getClientById('cc1');
    expect(after?.username).toBe('new-name');
    expect(
      await clientService.validatePassword('newpass1', after!.password!)
    ).toBe(true);
  });

  it('toClientResponse maps fields when no avatar set', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'cr1', {
      id: 'cr1',
      username: 'cr1',
      firstName: 'F',
      lastName: 'L',
      phone: '+1',
    });
    const c = await clientService.getClientById('cr1');
    const out = await clientService.toClientResponse(c!);
    expect(out).toMatchObject({
      id: 'cr1',
      username: 'cr1',
      avatar: undefined,
    });
  });

  it('getClientBookings includes services and date filter', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'co1', {
      id: 'co1',
      firstName: 'F',
      lastName: 'L',
    });
    seedDoc(COLLECTIONS.BARBER_SERVICES, 'sv-co', {
      id: 'sv-co',
      barberId: 'b-co',
      name: 'Cut',
      price: 100,
    });
    seedDoc(COLLECTIONS.BOOKINGS, 'or-co', {
      id: 'or-co',
      barberId: 'b-co',
      clientId: 'co1',
      timestamp: '2026-05-15T10:00:00.000Z',
      status: 'confirmed',
    });
    seedDoc(COLLECTIONS.BOOKING_SERVICES, 'os-co', {
      id: 'os-co',
      bookingId: 'or-co',
      serviceId: 'sv-co',
    });

    const out = await clientService.getClientBookings('b-co', '2026-05-15');
    expect(out.length).toBe(1);
    expect(out[0].services[0].name).toBe('Cut');
  });

  it('getClientBookings without date and tolerates missing service / client docs', async () => {
    seedDoc(COLLECTIONS.BOOKINGS, 'or-co2', {
      id: 'or-co2',
      barberId: 'b-co2',
      clientId: 'missing-client',
      timestamp: '2026-06-15T10:00:00.000Z',
      status: 'pending_confirmation',
    });
    seedDoc(COLLECTIONS.BOOKING_SERVICES, 'os-co2', {
      id: 'os-co2',
      bookingId: 'or-co2',
      serviceId: 'missing-svc',
    });
    const out = await clientService.getClientBookings('b-co2');
    expect(out.length).toBe(1);
    expect(out[0].services).toEqual([]);
    expect(out[0].clientFirstName).toBe('');
  });
});
