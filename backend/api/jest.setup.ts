/* eslint-env jest */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  'test-jwt-secret-key-for-integration-tests-only-32chars-minimum-xx';
process.env.CRON_API_KEY = 'test-cron-secret-for-integration-tests-only';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://signed.example/test')),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  __esModule: true,
  S3Client: class {
    async send(command: unknown) {
      const cmd = command as { constructor?: { name?: string } };
      const name = cmd?.constructor?.name;
      if (name === 'HeadObjectCommand') {
        const err = Object.assign(new Error('not found'), {
          name: 'NotFound',
        });
        throw err;
      }
      return {};
    }
  },
  PutObjectCommand: class PutObjectCommand {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(public readonly input: Record<string, unknown>) {}
  },
  DeleteObjectCommand: class DeleteObjectCommand {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(public readonly input: Record<string, unknown>) {}
  },
  HeadObjectCommand: class HeadObjectCommand {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(public readonly input: Record<string, unknown>) {}
  },
  GetObjectCommand: class GetObjectCommand {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(public readonly input: Record<string, unknown>) {}
  },
}));

process.env.EXPO_RECEIPT_POLL_DELAY_MS = '0';

jest.mock('expo-server-sdk', () => {
  class Expo {
    chunkPushNotifications(messages: unknown[]) {
      return messages?.length ? [messages as never[]] : [];
    }

    async sendPushNotificationsAsync(chunk: unknown[]) {
      return (chunk as { to?: string }[]).map((m, idx) => ({
        status: 'ok' as const,
        id: `mock_ticket_${idx}_${String(m?.to ?? '').slice(0, 9)}`,
      }));
    }

    chunkPushNotificationReceiptIds(ids: string[]) {
      return [ids];
    }

    async getPushNotificationReceiptsAsync() {
      return {};
    }
  }

  (
    Expo as unknown as { isExpoPushToken: (t: unknown) => boolean }
  ).isExpoPushToken = (token: unknown) =>
    typeof token === 'string' &&
    (((token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken[')) &&
      token.endsWith(']')) ||
      /^[a-z\d]{8}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{12}$/i.test(token));

  return { Expo };
});

jest.mock('./config/config');
jest.mock('./config/database');

import { resetMockFirestoreData } from './tests/support/mockFirestore';

beforeEach(() => {
  resetMockFirestoreData();
});
