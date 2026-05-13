/* eslint-env jest */

describe('notificationService — push ticket DeviceNotRegistered', () => {
  it('clears stored tokens when Expo returns DeviceNotRegistered on the ticket', async () => {
    jest.resetModules();

    const clearBarber = jest.fn().mockResolvedValue(undefined);
    const clearClient = jest.fn().mockResolvedValue(undefined);

    jest.doMock('expo-server-sdk', () => {
      class Expo {
        chunkPushNotifications(messages: unknown[]) {
          return messages?.length ? [messages as never[]] : [];
        }

        async sendPushNotificationsAsync() {
          return [
            {
              status: 'error' as const,
              message: 'not a registered push recipient',
              details: { error: 'DeviceNotRegistered' },
            },
          ];
        }

        chunkPushNotificationReceiptIds(ids: string[]) {
          return [ids];
        }

        async getPushNotificationReceiptsAsync() {
          return {};
        }
      }

      (Expo as unknown as { isExpoPushToken: (t: unknown) => boolean }).isExpoPushToken = (
        token: unknown
      ) =>
        typeof token === 'string' &&
        token.startsWith('ExponentPushToken[') &&
        token.endsWith(']');

      return { Expo };
    });

    jest.doMock('../../services/barberService', () => ({
      barberService: {
        clearPushTokenMatching: clearBarber,
      },
    }));

    jest.doMock('../../services/clientService', () => ({
      clientService: {
        clearPushTokenMatching: clearClient,
      },
    }));

    const { notificationService } = await import('../../services/notificationService');

    const token =
      'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]';
    await notificationService.sendNotification(
      { to: token, title: 't', body: 'b' },
      token
    );

    expect(clearBarber).toHaveBeenCalledWith(token);
    expect(clearClient).toHaveBeenCalledWith(token);
  });
});
