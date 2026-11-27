import { FieldValue } from 'firebase-admin/firestore';
import { db, COLLECTIONS } from '../config/database';
import {
  Client,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientResponse,
} from '../models/client';
import { Booking, BookingDetails } from '../models/booking';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  fileStorageService,
  resolveMediaRefForApi,
  validateStoredAvatarRef,
} from './fileStorage';
import { writeWithUniqueUsername } from './usernameRegistry';
import { effectiveBookingStatus, occupiesSlot } from '../utils/bookingRules';
import { tashkentDayRange } from '../utils/tashkentTime';
import { normalizePhone } from '../utils/phone';

function withoutUndefined(
  data: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

export class ClientServiceClass {
  private firestore = db.getFirestore();

  async createClient(clientData: ClientCreateRequest): Promise<string> {
    try {
      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(clientData.password, 10);

      const client: Client = {
        id,
        username: clientData.username,
        password: hashedPassword,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        phone: clientData.phone,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await writeWithUniqueUsername({
        kind: 'client',
        userId: id,
        username: client.username,
        write: (tx, ref) => tx.set(ref, client),
      });
      logger.info('Client created successfully', { clientId: id });
      return id;
    } catch (error) {
      logger.error('Error creating client:', error);
      throw error;
    }
  }

  async getClientByUsername(username: string): Promise<Client | null> {
    try {
      const snapshot = await this.firestore
        .collection(COLLECTIONS.CLIENTS)
        .where('username', '==', username)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Client;
    } catch (error) {
      logger.error('Error getting client by username:', error);
      throw error;
    }
  }

  async getClientById(id: string): Promise<Client | null> {
    try {
      const doc = await this.firestore
        .collection(COLLECTIONS.CLIENTS)
        .doc(id)
        .get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as Client;
    } catch (error) {
      logger.error('Error getting client by ID:', error);
      throw error;
    }
  }

  async updateClientProfile(
    id: string,
    updateData: ClientUpdateRequest
  ): Promise<void> {
    try {
      const updateObject: Record<string, unknown> = {
        ...updateData,
        updatedAt: new Date(),
      };
      const phone = normalizePhone(updateData.phone);
      if (phone) updateObject.phone = phone;

      // Whoever signs in with a phone number must be able to sign in with the
      // new one, so the username moves together with it.
      const current = phone ? await this.getClientById(id) : null;
      const signsInByPhone =
        !!current && normalizePhone(current.username) === current.username;

      if (phone && signsInByPhone && current.username !== phone) {
        await writeWithUniqueUsername({
          kind: 'client',
          userId: id,
          username: phone,
          write: (tx, ref) =>
            tx.update(ref, {
              ...withoutUndefined(updateObject),
              username: phone,
            }),
        });
      } else {
        await this.firestore
          .collection(COLLECTIONS.CLIENTS)
          .doc(id)
          .update(updateObject);
      }
      logger.info('Client profile updated successfully', { clientId: id });
    } catch (error) {
      logger.error('Error updating client profile:', error);
      throw error;
    }
  }

  async updateClientCredentials(
    id: string,
    username: string,
    password: string
  ): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await writeWithUniqueUsername({
        kind: 'client',
        userId: id,
        username,
        write: (tx, ref) =>
          tx.update(ref, {
            username,
            password: hashedPassword,
            updatedAt: new Date(),
          }),
      });

      logger.info('Client credentials updated successfully', { clientId: id });
    } catch (error) {
      logger.error('Error updating client credentials:', error);
      throw error;
    }
  }

  async updateClientDeviceId(id: string, deviceId: string): Promise<void> {
    await this.firestore.collection(COLLECTIONS.CLIENTS).doc(id).update({
      deviceId,
      updatedAt: new Date(),
    });
    logger.info('Client device ID updated successfully', { clientId: id });
  }

  /** Synced from the mobile app's language setting — drives notification copy. */
  async updateClientLocale(id: string, locale: 'uz' | 'ru'): Promise<void> {
    await this.firestore.collection(COLLECTIONS.CLIENTS).doc(id).update({
      locale,
      updatedAt: new Date(),
    });
  }

  /** Removes stored Expo push token when Expo reports DeviceNotRegistered. */
  async clearPushTokenMatching(expoPushToken: string): Promise<void> {
    const snap = await this.firestore
      .collection(COLLECTIONS.CLIENTS)
      .where('deviceId', '==', expoPushToken)
      .limit(25)
      .get();

    if (snap.empty) return;

    const batch = this.firestore.batch();
    const now = new Date();
    snap.docs.forEach(d => {
      batch.update(d.ref, { deviceId: FieldValue.delete(), updatedAt: now });
    });
    await batch.commit();
    logger.info('Cleared stale client Expo push token(s)', {
      count: snap.size,
    });
  }

  async clearClientStoredDevice(id: string): Promise<void> {
    await this.firestore.collection(COLLECTIONS.CLIENTS).doc(id).update({
      deviceId: FieldValue.delete(),
      updatedAt: new Date(),
    });
    logger.info('Client Expo push token cleared', { clientId: id });
  }

  async updateClientAvatar(id: string, avatarUrl: string): Promise<void> {
    try {
      // Get current client data to check for existing avatar
      const client = await this.getClientById(id);

      // Delete old avatar if it exists
      if (client?.avatar) {
        try {
          await fileStorageService.deleteStoredReference(client.avatar);
          logger.info('Old client avatar deleted successfully', {
            clientId: id,
            oldRef: client.avatar,
          });
        } catch (deleteError) {
          logger.warn('Failed to delete old client avatar:', {
            clientId: id,
            oldAvatar: client.avatar,
            error: deleteError,
          });
        }
      }

      await this.firestore.collection(COLLECTIONS.CLIENTS).doc(id).update({
        avatar: avatarUrl,
        updatedAt: new Date(),
      });

      logger.info('Client avatar updated successfully', { clientId: id });
    } catch (error) {
      logger.error('Error updating client avatar:', error);
      throw error;
    }
  }

  /**
   * Busy times of one barber, for the slot grid. Any client can call this, so
   * it must not say who booked. The name fields stay (empty) because installed
   * app builds expect them.
   */
  async getClientBookings(
    barberId: string,
    date?: string
  ): Promise<BookingDetails[]> {
    try {
      let query = this.firestore
        .collection(COLLECTIONS.BOOKINGS)
        .where('barberId', '==', barberId);

      if (date) {
        const { start, end } = tashkentDayRange(date);
        query = query
          .where('timestamp', '>=', start)
          .where('timestamp', '<', end);
      }

      const snapshot = await query.get();
      const bookings: BookingDetails[] = [];

      for (const doc of snapshot.docs) {
        const bookingData = { id: doc.id, ...doc.data() } as Booking;
        const status = effectiveBookingStatus(
          bookingData.status,
          bookingData.timestamp
        );
        if (!occupiesSlot(status)) continue;

        const servicesSnapshot = await this.firestore
          .collection(COLLECTIONS.BOOKING_SERVICES)
          .where('bookingId', '==', doc.id)
          .get();

        const services = [];
        for (const serviceDoc of servicesSnapshot.docs) {
          const joinRow = serviceDoc.data();
          const serviceDetails = await this.firestore
            .collection(COLLECTIONS.BARBER_SERVICES)
            .doc(joinRow.serviceId)
            .get();

          if (serviceDetails.exists) {
            const service = serviceDetails.data();
            services.push({
              name: service?.name,
              price: service?.price,
              durationMinutes: service?.durationMinutes,
            });
          }
        }

        bookings.push({
          bookingId: doc.id,
          clientFirstName: '',
          clientLastName: '',
          timestamp: bookingData.timestamp,
          status,
          services,
        });
      }

      return bookings;
    } catch (error) {
      logger.error('Error getting client bookings:', error);
      throw error;
    }
  }

  async toClientResponse(client: Client): Promise<ClientResponse> {
    let validatedAvatar = client.avatar;

    // Validate avatar URL if it exists
    if (client.avatar) {
      try {
        const isValidUrl = await validateStoredAvatarRef(client.avatar);

        if (!isValidUrl) {
          logger.warn('Invalid avatar URL detected, cleaning up database', {
            clientId: client.id,
            invalidUrl: client.avatar,
          });

          await this.firestore
            .collection(COLLECTIONS.CLIENTS)
            .doc(client.id)
            .update({
              avatar: null,
              updatedAt: new Date(),
            });

          validatedAvatar = undefined;
        }
      } catch (error) {
        logger.error('Error validating client avatar URL:', {
          clientId: client.id,
          avatarUrl: client.avatar,
          error,
        });
      }
    }

    const avatarResolved = await resolveMediaRefForApi(validatedAvatar);

    return {
      id: client.id,
      username: client.username,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      location: client.location,
      avatar: avatarResolved,
    };
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

export const clientService = new ClientServiceClass();
