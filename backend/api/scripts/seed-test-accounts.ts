/**
 * Seed stable QA test accounts into Firestore.
 *
 * Run once per environment:
 *   pnpm --filter @my-barber/api exec tsx scripts/seed-test-accounts.ts
 *
 * Accounts created (idempotent — safe to re-run):
 *   barber@test.local / DevTest12345   (auto-approved)
 *   client@test.local / DevTest12345
 */

import { barberService } from '../services/barberService';
import { clientService } from '../services/clientService';
import { db, COLLECTIONS } from '../config/database';
import { logger } from '../utils/logger';

const TEST_PASSWORD = 'DevTest12345';

async function seedBarber(): Promise<void> {
  const username = 'barber@test.local';
  const existing = await barberService.getBarberByUsername(username);

  if (existing) {
    logger.info(`[seed] barber account already exists (id=${existing.id})`);
    return;
  }

  const id = await barberService.createBarber({
    username,
    password: TEST_PASSWORD,
    firstName: 'Test',
    lastName: 'Barber',
    phone: '+998900000001',
    location: { latitude: '41.2995', longitude: '69.2401' },
    birthDate: '1990-01-15',
    workingHours: '09:00-18:00',
  });

  // Auto-approve so the account is immediately usable in the mobile app.
  await db
    .getFirestore()
    .collection(COLLECTIONS.BARBERS)
    .doc(id)
    .update({ approvalStatus: 'approved', approvalMessage: 'QA test account' });

  logger.info(`[seed] created barber@test.local (id=${id})`);
}

async function seedClient(): Promise<void> {
  const username = 'client@test.local';
  const existing = await clientService.getClientByUsername(username);

  if (existing) {
    logger.info(`[seed] client account already exists (id=${existing.id})`);
    return;
  }

  const id = await clientService.createClient({
    username,
    password: TEST_PASSWORD,
    firstName: 'Test',
    lastName: 'Client',
    phone: '+998900000002',
  });

  logger.info(`[seed] created client@test.local (id=${id})`);
}

(async () => {
  try {
    await Promise.all([seedBarber(), seedClient()]);
    logger.info('[seed] done');
    process.exit(0);
  } catch (err) {
    logger.error('[seed] failed', err);
    process.exit(1);
  }
})();
