/* eslint-env jest */
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';
import { barberService } from '../../services/barberService';
import { clientService } from '../../services/clientService';

describe('clearPushTokenMatching', () => {
  const tok = 'ExponentPushToken[token-token-token-token-token]';

  it('clears matching barber deviceId', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'bk1', {
      id: 'bk1',
      username: 'b_bk1',
      deviceId: tok,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await barberService.clearPushTokenMatching(tok);
    const barber = await barberService.getBarberById('bk1');
    expect(barber?.deviceId).toBeUndefined();
  });

  it('clears matching client deviceId', async () => {
    seedDoc(COLLECTIONS.CLIENTS, 'ck1', {
      id: 'ck1',
      username: 'c_ck1',
      deviceId: tok,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await clientService.clearPushTokenMatching(tok);
    const client = await clientService.getClientById('ck1');
    expect(client?.deviceId).toBeUndefined();
  });
});
