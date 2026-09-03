import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import {
  buildBookingLifecyclePushData,
  getBookingLifecycleDeliveries,
  BookingLifecycleSnapshot,
} from './bookingLifecycleNotifications';

export interface NotificationMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  ttl?: number;
  expiration?: number;
  priority?: 'default' | 'normal' | 'high';
  subtitle?: string;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
}

/** Default ~15 minutes (Expo receipt availability). Override with EXPO_RECEIPT_POLL_DELAY_MS; set 0 in tests for immediate polling. */
export function getExpoReceiptPollDelayMs(): number {
  const raw = process.env.EXPO_RECEIPT_POLL_DELAY_MS;
  const fallback = 15 * 60 * 1000;
  if (!raw?.trim()) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, 24 * 60 * 60 * 1000);
}

export class NotificationService {
  private static instance: NotificationService;
  private expo: Expo;

  private constructor() {
    this.expo = new Expo({
      accessToken: config.expoAccessToken,
      useFcmV1: true,
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Expo pushes for booking lifecycle rows (mirror Firestore inbox; skips missing tokens).
   */
  public async notifyBookingLifecyclePush(
    kind: string,
    bookingSnapshot: BookingLifecycleSnapshot,
    extra?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { barberService } = await import('./barberService');
      const { clientService } = await import('./clientService');

      const [barber, client] = await Promise.all([
        barberService.getBarberById(bookingSnapshot.barberId),
        clientService.getClientById(bookingSnapshot.clientId),
      ]);

      const deliveries = getBookingLifecycleDeliveries(
        kind,
        bookingSnapshot,
        extra,
        { barber: barber?.locale, client: client?.locale }
      );
      for (const d of deliveries) {
        const token =
          d.recipientType === 'barber' ? barber?.deviceId : client?.deviceId;

        if (!token?.trim()) {
          continue;
        }
        if (!Expo.isExpoPushToken(token)) {
          logger.warn('Skipping push — invalid Expo token on profile', {
            kind,
            recipientType: d.recipientType,
            bookingId: bookingSnapshot.id,
          });
          continue;
        }

        const dataPayload = buildBookingLifecyclePushData(
          kind,
          bookingSnapshot.id,
          d.notificationType,
          extra
        );

        const message = this.createMessage(token, d.title, d.body, dataPayload);

        await this.sendNotificationThroughExpo(message, token);
      }
    } catch (error) {
      logger.error('Failed lifecycle push:', {
        error: error instanceof Error ? error.message : String(error),
        kind,
        bookingId: bookingSnapshot.id,
      });
    }
  }

  /**
   * Send a push notification ticket + optional Expo receipt pruning for stale tokens.
   *
   * When `explicitTokenCorrelation` is set (same string as recipient), receipt errors can clear that Expo token server-side.
   */
  public async sendNotification(
    message: NotificationMessage,
    explicitTokenCorrelation?: string
  ): Promise<void> {
    await this.sendNotificationThroughExpo(message, explicitTokenCorrelation);
  }

  /** Send one Expo message; correlate token for delayed receipt pruning. */
  private async sendNotificationThroughExpo(
    message: NotificationMessage,
    correlateToken?: string
  ): Promise<void> {
    try {
      const messages = this.buildExpoMessages(message);
      if (messages.length === 0) {
        return;
      }

      const ticketPairs: Array<{ ticketId: string; token: string }> = [];
      const chunks = this.expo.chunkPushNotifications(messages);

      for (const chunk of chunks) {
        let ticketChunk: ExpoPushTicket[] = [];
        try {
          ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          logger.error('Error sending notification chunk:', error);
          continue;
        }

        for (let idx = 0; idx < chunk.length; idx++) {
          const chunkMsg = chunk[idx];
          const ticket = ticketChunk[idx];
          const tokenResolved =
            typeof chunkMsg.to === 'string' ? chunkMsg.to : correlateToken;

          if (
            ticket.status === 'ok' &&
            ticket.id &&
            tokenResolved &&
            Expo.isExpoPushToken(tokenResolved)
          ) {
            ticketPairs.push({ ticketId: ticket.id, token: tokenResolved });
          }

          if (ticket.status === 'error') {
            const ticketErr =
              ticket.details &&
              typeof ticket.details === 'object' &&
              'error' in ticket.details
                ? (ticket.details as { error?: string }).error
                : undefined;
            if (
              ticketErr === 'DeviceNotRegistered' &&
              tokenResolved &&
              Expo.isExpoPushToken(tokenResolved)
            ) {
              await this.unregisterInvalidExpoToken(tokenResolved);
            }
            logger.error('Push notification error:', {
              token: tokenResolved,
              error: ticket.message,
              details: ticket.details,
            });
          }
        }
      }

      logger.info('Push notifications sent batch', {
        tickets: ticketPairs.length,
      });

      if (ticketPairs.length > 0) {
        this.scheduleReceiptPruning(ticketPairs);
      }
    } catch (error) {
      logger.error('Error in sendNotification:', error);
      throw new Error('Failed to send push notification');
    }
  }

  private buildExpoMessages(message: NotificationMessage): ExpoPushMessage[] {
    const pushTokens = Array.isArray(message.to) ? message.to : [message.to];
    const validTokens = pushTokens.filter(t => Expo.isExpoPushToken(t));

    if (validTokens.length === 0) {
      logger.warn('No valid Expo push tokens provided', {
        tokens: pushTokens,
      });
      return [];
    }

    return validTokens.map(token => ({
      to: token,
      sound: message.sound || 'default',
      title: message.title,
      body: message.body,
      data: message.data,
      ttl: message.ttl,
      expiration: message.expiration,
      priority: message.priority,
      subtitle: message.subtitle,
      badge: message.badge,
      channelId: message.channelId,
      categoryId: message.categoryId,
      mutableContent: message.mutableContent,
    }));
  }

  private scheduleReceiptPruning(
    ticketPairs: Array<{ ticketId: string; token: string }>
  ) {
    const delayMs = getExpoReceiptPollDelayMs();
    const run = () => void this.consumePushReceiptsForTokens(ticketPairs);

    if (delayMs <= 0) {
      setImmediate(run);
      return;
    }
    const t = setTimeout(run, delayMs);
    const timer = t as { unref?: () => void };
    if ('unref' in timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  private async consumePushReceiptsForTokens(
    ticketPairs: Array<{ ticketId: string; token: string }>
  ): Promise<void> {
    const idToToken = new Map<string, string>();
    for (const pair of ticketPairs) {
      idToToken.set(pair.ticketId, pair.token);
    }

    const ids = ticketPairs.map(p => p.ticketId).filter(Boolean);
    if (ids.length === 0) return;

    try {
      const idChunks = this.expo.chunkPushNotificationReceiptIds(ids);
      const badTokens = new Set<string>();

      for (const chunk of idChunks) {
        try {
          const receiptMap =
            await this.expo.getPushNotificationReceiptsAsync(chunk);

          for (const [receiptId, receiptUnknown] of Object.entries(
            receiptMap
          )) {
            const token = idToToken.get(receiptId);
            const receipt = receiptUnknown as {
              status?: string;
              details?: { error?: string };
            };

            if (
              receipt?.status === 'error' &&
              receipt.details?.error === 'DeviceNotRegistered' &&
              token &&
              Expo.isExpoPushToken(token)
            ) {
              badTokens.add(token);
            }
          }
        } catch (e) {
          logger.warn('Push receipt chunk fetch failed:', { error: e });
        }
      }

      for (const token of badTokens) {
        logger.info(
          `Removing stale Expo push token (${token.slice(0, 28)}…) — DeviceNotRegistered`
        );
        await this.unregisterInvalidExpoToken(token);
      }
    } catch (e) {
      logger.warn('Push receipt pruning failed:', { error: e });
    }
  }

  private async unregisterInvalidExpoToken(token: string): Promise<void> {
    try {
      const { barberService } = await import('./barberService');
      const { clientService } = await import('./clientService');
      await Promise.all([
        barberService.clearPushTokenMatching(token),
        clientService.clearPushTokenMatching(token),
      ]);
    } catch (e) {
      logger.warn('Could not unregister Expo push token', { error: e });
    }
  }

  public createMessage(
    to: string | string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): NotificationMessage {
    return {
      to,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    };
  }

  public async sendTestNotification(deviceId: string): Promise<void> {
    const message = this.createMessage(
      deviceId,
      'Test Notification',
      'This is a test notification from My Barber API! 📱',
      { type: 'test' }
    );

    await this.sendNotification(message, deviceId);
  }
}

export const notificationService = NotificationService.getInstance();
