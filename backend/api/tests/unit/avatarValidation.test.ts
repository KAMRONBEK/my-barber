/* eslint-env jest */
import { barberService } from '../../services/barberService';
import { clientService } from '../../services/clientService';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

const STALE_AVATAR =
  'https://storage.googleapis.com/test-bucket/barber-avatars/stale.jpg';

describe('HEAD-based legacy avatar validation (Firebase public URLs)', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getAllBarbers clears stale avatar when storage returns false', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'av-b1', {
      id: 'av-b1',
      username: 'av-b1',
      firstName: 'F',
      lastName: 'L',
      phone: '+1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
      avatar: STALE_AVATAR,
      images: [],
      approvalStatus: 'approved',
    });

    const out = await barberService.getAllBarbers(0, 10);
    expect(out.barbers[0].avatar).toBeUndefined();

    const after = await barberService.getBarberById('av-b1');
    expect(after?.avatar).toBeNull();
  });

  it('getBarberWithServices clears stale avatar similarly', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'av-b2', {
      id: 'av-b2',
      username: 'av-b2',
      firstName: 'F',
      lastName: 'L',
      phone: '+1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
      avatar: STALE_AVATAR,
      images: [],
      approvalStatus: 'approved',
    });

    const out = await barberService.getBarberWithServices('av-b2');
    expect(out?.barber.avatar).toBeUndefined();
  });

  it('toClientResponse clears stale avatar', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'av-c1', {
      id: 'av-c1',
      username: 'av-c1',
      firstName: 'F',
      lastName: 'L',
      phone: '+1',
      avatar: STALE_AVATAR,
    });
    const c = await clientService.getClientById('av-c1');
    const out = await clientService.toClientResponse(c!);
    expect(out.avatar).toBeUndefined();
  });
});

describe('barberService avatar persistence (no HEAD checks)', () => {
  it('updateBarberAvatar with no prior avatar just persists', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'av-b3', {
      id: 'av-b3',
      images: [],
      approvalStatus: 'approved',
    });
    await barberService.updateBarberAvatar(
      'av-b3',
      'https://storage.googleapis.com/test-bucket/barber-avatars/new.jpg'
    );
    const after = await barberService.getBarberById('av-b3');
    expect(after?.avatar).toBe(
      'https://storage.googleapis.com/test-bucket/barber-avatars/new.jpg'
    );
  });

  it('updateBarberAvatar with existing avatar swallows delete failure', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'av-b4', {
      id: 'av-b4',
      avatar: STALE_AVATAR,
      images: [],
      approvalStatus: 'approved',
    });
    await barberService.updateBarberAvatar(
      'av-b4',
      'https://storage.googleapis.com/test-bucket/barber-avatars/replacement.jpg'
    );
    const after = await barberService.getBarberById('av-b4');
    expect(after?.avatar).toContain('replacement.jpg');
  });
});

describe('clientService avatar persistence', () => {
  it('updateClientAvatar with no prior avatar just persists', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'av-c2', { id: 'av-c2' });
    await clientService.updateClientAvatar(
      'av-c2',
      'https://storage.googleapis.com/test-bucket/client-avatars/new.jpg'
    );
    const after = await clientService.getClientById('av-c2');
    expect(after?.avatar).toContain('new.jpg');
  });

  it('updateClientAvatar with existing avatar swallows delete failure', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'av-c3', {
      id: 'av-c3',
      avatar: STALE_AVATAR,
    });
    await clientService.updateClientAvatar(
      'av-c3',
      'https://storage.googleapis.com/test-bucket/client-avatars/replacement.jpg'
    );
    const after = await clientService.getClientById('av-c3');
    expect(after?.avatar).toContain('replacement.jpg');
  });
});
