import { FieldValue } from 'firebase-admin/firestore';
import { db, COLLECTIONS } from '../config/database';
import {
  Barber,
  BarberApprovalStatus,
  BarberService,
  BarberCreateRequest,
  BarberUpdateRequest,
  BarberResponse,
  BarberListResponse,
} from '../models/barber';
import { Booking, BookingDetails } from '../models/booking';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  fileStorageService,
  resolveMediaRefForApi,
  resolveManyMediaRefsForApi,
  validateStoredAvatarRef,
} from './fileStorage';

export class BarberServiceClass {
  private firestore = db.getFirestore();

  async createBarber(barberData: BarberCreateRequest): Promise<string> {
    try {
      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(barberData.password, 10);

      const barber: Barber = {
        id,
        username: barberData.username,
        password: hashedPassword,
        firstName: barberData.firstName,
        lastName: barberData.lastName,
        phone: barberData.phone,
        location: barberData.location,
        birthDate: barberData.birthDate,
        workingHours: barberData.workingHours,
        images: [],
        approvalStatus: 'pending',
        approvalMessage: 'Your account is under review',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.firestore.collection(COLLECTIONS.BARBERS).doc(id).set(barber);
      logger.info('Barber created successfully', { barberId: id });
      return id;
    } catch (error) {
      logger.error('Error creating barber:', error);
      throw error;
    }
  }

  async getBarberByUsername(username: string): Promise<Barber | null> {
    try {
      const snapshot = await this.firestore
        .collection(COLLECTIONS.BARBERS)
        .where('username', '==', username)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Barber;
    } catch (error) {
      logger.error('Error getting barber by username:', error);
      throw error;
    }
  }

  async getBarberById(id: string): Promise<Barber | null> {
    try {
      const doc = await this.firestore
        .collection(COLLECTIONS.BARBERS)
        .doc(id)
        .get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as Barber;
    } catch (error) {
      logger.error('Error getting barber by ID:', error);
      throw error;
    }
  }

  async getBarberWithServices(
    id: string
  ): Promise<{ barber: BarberResponse; services: BarberService[] } | null> {
    try {
      const barber = await this.getBarberById(id);
      if (!barber) {
        return null;
      }

      const services = await this.getBarberServices(id);

      // Validate avatar URL if it exists
      let validatedAvatar = barber.avatar;
      if (barber.avatar) {
        try {
          const isValidUrl = await validateStoredAvatarRef(barber.avatar);

          if (!isValidUrl) {
            logger.warn(
              'Invalid barber avatar URL detected, cleaning up database',
              {
                barberId: barber.id,
                invalidUrl: barber.avatar,
              }
            );

            await this.firestore
              .collection(COLLECTIONS.BARBERS)
              .doc(barber.id)
              .update({
                avatar: null,
                updatedAt: new Date(),
              });

            validatedAvatar = undefined;
          }
        } catch (error) {
          logger.error('Error validating barber avatar URL:', {
            barberId: barber.id,
            avatarUrl: barber.avatar,
            error,
          });
        }
      }

      const avatarResolved = await resolveMediaRefForApi(validatedAvatar);
      const imagesResolved = await resolveManyMediaRefsForApi(barber.images);

      const barberResponse: BarberResponse = {
        id: barber.id,
        username: barber.username,
        firstName: barber.firstName,
        lastName: barber.lastName,
        phone: barber.phone,
        location: barber.location,
        birthDate: barber.birthDate,
        workingHours: barber.workingHours,
        experienceYears: barber.experienceYears,
        title: barber.title,
        bio: barber.bio,
        avatar: avatarResolved,
        images: imagesResolved,
        services,
        approvalStatus: barber.approvalStatus ?? 'approved',
        approvalMessage: barber.approvalMessage,
        ratingAverage: barber.ratingAverage,
        ratingCount: barber.ratingCount,
      };

      return { barber: barberResponse, services };
    } catch (error) {
      logger.error('Error getting barber with services:', error);
      throw error;
    }
  }

  async getAllBarbers(
    page: number = 0,
    limit?: number
  ): Promise<BarberListResponse> {
    try {
      const pageSize = limit || 10;
      const offset = page * pageSize;

      let query: any = this.firestore.collection(COLLECTIONS.BARBERS);

      if (limit) {
        query = query.limit(limit);
      }

      if (offset > 0) {
        query = query.offset(offset);
      }

      const snapshot = await query.get();
      const totalSnapshot = await this.firestore
        .collection(COLLECTIONS.BARBERS)
        .get();

      const barbers: BarberResponse[] = [];

      for (const doc of snapshot.docs) {
        const barberData = { id: doc.id, ...doc.data() } as Barber;
        const services = await this.getBarberServices(doc.id);

        // Validate avatar URL if it exists
        let validatedAvatar = barberData.avatar;
        if (barberData.avatar) {
          try {
            const isValidUrl = await validateStoredAvatarRef(barberData.avatar);

            if (!isValidUrl) {
              logger.warn(
                'Invalid barber avatar URL detected in list, cleaning up database',
                {
                  barberId: barberData.id,
                  invalidUrl: barberData.avatar,
                }
              );

              await this.firestore
                .collection(COLLECTIONS.BARBERS)
                .doc(barberData.id)
                .update({
                  avatar: null,
                  updatedAt: new Date(),
                });

              validatedAvatar = undefined;
            }
          } catch (error) {
            logger.error('Error validating barber avatar URL in list:', {
              barberId: barberData.id,
              avatarUrl: barberData.avatar,
              error,
            });
          }
        }

        const avatarResolved = await resolveMediaRefForApi(validatedAvatar);
        const imagesResolved = await resolveManyMediaRefsForApi(
          barberData.images
        );

        barbers.push({
          id: barberData.id,
          username: barberData.username,
          firstName: barberData.firstName,
          lastName: barberData.lastName,
          phone: barberData.phone,
          location: barberData.location,
          birthDate: barberData.birthDate,
          workingHours: barberData.workingHours,
          experienceYears: barberData.experienceYears,
          title: barberData.title,
          bio: barberData.bio,
          avatar: avatarResolved,
          images: imagesResolved,
          services,
        });
      }

      return {
        barbers,
        page,
        limit: pageSize,
        total: totalSnapshot.size,
      };
    } catch (error) {
      logger.error('Error getting all barbers:', error);
      throw error;
    }
  }

  async updateBarberProfile(
    id: string,
    updateData: BarberUpdateRequest
  ): Promise<void> {
    try {
      const updateObject = {
        ...updateData,
        updatedAt: new Date(),
      };

      await this.firestore
        .collection(COLLECTIONS.BARBERS)
        .doc(id)
        .update(updateObject);
      logger.info('Barber profile updated successfully', { barberId: id });
    } catch (error) {
      logger.error('Error updating barber profile:', error);
      throw error;
    }
  }

  async updateBarberCredentials(
    id: string,
    username: string,
    password: string
  ): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await this.firestore.collection(COLLECTIONS.BARBERS).doc(id).update({
        username,
        password: hashedPassword,
        updatedAt: new Date(),
      });

      logger.info('Barber credentials updated successfully', { barberId: id });
    } catch (error) {
      logger.error('Error updating barber credentials:', error);
      throw error;
    }
  }

  async updateBarberDeviceId(id: string, deviceId: string): Promise<void> {
    try {
      await this.firestore.collection(COLLECTIONS.BARBERS).doc(id).update({
        deviceId,
        updatedAt: new Date(),
      });

      logger.info('Barber device ID updated successfully', { barberId: id });
    } catch (error) {
      logger.error('Error updating barber device ID:', error);
      throw error;
    }
  }

  /** Removes stored Expo push token for pruning when Expo reports DeviceNotRegistered. */
  async clearPushTokenMatching(expoPushToken: string): Promise<void> {
    try {
      const snap = await this.firestore
        .collection(COLLECTIONS.BARBERS)
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
      logger.info('Cleared stale barber Expo push token(s)', {
        count: snap.size,
      });
    } catch (error) {
      logger.error('Error clearing barber push token:', error);
      throw error;
    }
  }

  async clearBarberStoredDevice(id: string): Promise<void> {
    await this.firestore.collection(COLLECTIONS.BARBERS).doc(id).update({
      deviceId: FieldValue.delete(),
      updatedAt: new Date(),
    });
    logger.info('Barber Expo push token cleared', { barberId: id });
  }

  async addBarberImages(id: string, imageUrls: string[]): Promise<void> {
    try {
      const barber = await this.getBarberById(id);
      if (!barber) {
        throw new Error('Barber not found');
      }

      const updatedImages = [...barber.images, ...imageUrls];

      await this.firestore.collection(COLLECTIONS.BARBERS).doc(id).update({
        images: updatedImages,
        updatedAt: new Date(),
      });

      logger.info('Barber images added successfully', {
        barberId: id,
        imageCount: imageUrls.length,
      });
    } catch (error) {
      logger.error('Error adding barber images:', error);
      throw error;
    }
  }

  async removeBarberImage(id: string, index: number): Promise<void> {
    try {
      const barber = await this.getBarberById(id);
      if (!barber) {
        throw new Error('Barber not found');
      }

      if (index < 0 || index >= barber.images.length) {
        throw new Error('Image index out of range');
      }

      const updatedImages = barber.images.filter((_, i) => i !== index);
      const [removedKey] = barber.images.slice(index, index + 1);

      // Best-effort — the Firestore array is the source of truth for what
      // the barber sees, so a stray S3 object left behind on failure here
      // shouldn't block the removal from taking effect.
      try {
        await fileStorageService.deleteStoredReference(removedKey);
      } catch (deleteError) {
        logger.warn('Failed to delete barber image from S3:', {
          barberId: id,
          storageKey: removedKey,
          error: deleteError,
        });
      }

      await this.firestore.collection(COLLECTIONS.BARBERS).doc(id).update({
        images: updatedImages,
        updatedAt: new Date(),
      });

      logger.info('Barber image removed successfully', { barberId: id, index });
    } catch (error) {
      logger.error('Error removing barber image:', error);
      throw error;
    }
  }

  async updateBarberAvatar(id: string, avatarUrl: string): Promise<void> {
    try {
      // Get current barber data to check for existing avatar
      const barber = await this.getBarberById(id);

      // Delete old avatar if it exists
      if (barber?.avatar) {
        try {
          await fileStorageService.deleteStoredReference(barber.avatar);
          logger.info('Old barber avatar deleted successfully', {
            barberId: id,
            oldRef: barber.avatar,
          });
        } catch (deleteError) {
          logger.warn('Failed to delete old barber avatar:', {
            barberId: id,
            oldAvatar: barber.avatar,
            error: deleteError,
          });
        }
      }

      await this.firestore.collection(COLLECTIONS.BARBERS).doc(id).update({
        avatar: avatarUrl,
        updatedAt: new Date(),
      });

      logger.info('Barber avatar updated successfully', { barberId: id });
    } catch (error) {
      logger.error('Error updating barber avatar:', error);
      throw error;
    }
  }

  async getBarberServices(barberId: string): Promise<BarberService[]> {
    try {
      const snapshot = await this.firestore
        .collection(COLLECTIONS.BARBER_SERVICES)
        .where('barberId', '==', barberId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as BarberService[];
    } catch (error) {
      logger.error('Error getting barber services:', error);
      throw error;
    }
  }

  async addBarberServices(
    barberId: string,
    services: Omit<BarberService, 'id' | 'barberId'>[]
  ): Promise<void> {
    try {
      const batch = this.firestore.batch();

      services.forEach(service => {
        const serviceId = uuidv4();
        const serviceRef = this.firestore
          .collection(COLLECTIONS.BARBER_SERVICES)
          .doc(serviceId);

        batch.set(serviceRef, {
          id: serviceId,
          barberId,
          name: service.name,
          price: service.price,
        });
      });

      await batch.commit();
      logger.info('Barber services added successfully', {
        barberId,
        serviceCount: services.length,
      });
    } catch (error) {
      logger.error('Error adding barber services:', error);
      throw error;
    }
  }

  async deleteBarberService(serviceId: string): Promise<void> {
    try {
      await this.firestore
        .collection(COLLECTIONS.BARBER_SERVICES)
        .doc(serviceId)
        .delete();
      logger.info('Barber service deleted successfully', { serviceId });
    } catch (error) {
      logger.error('Error deleting barber service:', error);
      throw error;
    }
  }

  async upsertBarberServicesLineItems(
    barberId: string,
    items: Array<{
      catalog_service_id: string;
      name: string;
      price: number;
      duration_minutes: number;
      is_active: boolean;
    }>
  ): Promise<
    Array<{
      id: string;
      catalog_service_id: string;
      name: string;
      price: number;
      duration_minutes: number;
      is_active: boolean;
    }>
  > {
    const existing = await this.getBarberServices(barberId);
    const out: Array<{
      id: string;
      catalog_service_id: string;
      name: string;
      price: number;
      duration_minutes: number;
      is_active: boolean;
    }> = [];

    const byCatalog = new Map<string, BarberService>();
    for (const s of existing) {
      if (s.catalogServiceId) {
        byCatalog.set(s.catalogServiceId, s);
      }
    }

    for (const item of items) {
      const prev = byCatalog.get(item.catalog_service_id);
      const docId = prev?.id ?? uuidv4();
      const payload = {
        id: docId,
        barberId,
        name: item.name,
        price: item.price,
        catalogServiceId: item.catalog_service_id,
        durationMinutes: item.duration_minutes,
        isActive: item.is_active,
        updatedAt: new Date(),
      };

      await this.firestore
        .collection(COLLECTIONS.BARBER_SERVICES)
        .doc(docId)
        .set(payload, { merge: true });

      out.push({
        id: docId,
        catalog_service_id: item.catalog_service_id,
        name: item.name,
        price: item.price,
        duration_minutes: item.duration_minutes,
        is_active: item.is_active,
      });
    }

    return out;
  }

  async softDeleteBarberService(
    barberId: string,
    serviceId: string
  ): Promise<boolean> {
    const doc = await this.firestore
      .collection(COLLECTIONS.BARBER_SERVICES)
      .doc(serviceId)
      .get();

    if (!doc.exists) return false;
    const data = doc.data() as BarberService;
    if (data.barberId !== barberId) return false;

    await this.firestore
      .collection(COLLECTIONS.BARBER_SERVICES)
      .doc(serviceId)
      .update({
        isActive: false,
        updatedAt: new Date(),
      });
    return true;
  }

  async listBarberServicesContract(barberId: string): Promise<
    Array<{
      id: string;
      catalog_service_id: string | null;
      name: string;
      price: number;
      duration_minutes: number;
      is_active: boolean;
    }>
  > {
    const list = await this.getBarberServices(barberId);
    return list.map(s => ({
      id: s.id,
      catalog_service_id: s.catalogServiceId ?? null,
      name: s.name,
      price: s.price,
      duration_minutes: s.durationMinutes ?? 30,
      is_active: s.isActive !== false,
    }));
  }

  async getBarberBookings(
    barberId: string,
    date?: string
  ): Promise<BookingDetails[]> {
    try {
      let query: any = this.firestore
        .collection(COLLECTIONS.BOOKINGS)
        .where('barberId', '==', barberId);

      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        query = query
          .where('timestamp', '>=', startDate.toISOString())
          .where('timestamp', '<', endDate.toISOString());
      }

      const snapshot = await query.get();
      const bookings: BookingDetails[] = [];

      for (const doc of snapshot.docs) {
        const bookingData = { id: doc.id, ...doc.data() } as Booking;

        const clientDoc = await this.firestore
          .collection(COLLECTIONS.CLIENTS)
          .doc(bookingData.clientId)
          .get();
        const clientData = clientDoc.data();

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
            });
          }
        }

        bookings.push({
          bookingId: doc.id,
          clientFirstName: clientData?.firstName || '',
          clientLastName: clientData?.lastName || '',
          timestamp: bookingData.timestamp,
          services,
        });
      }

      return bookings;
    } catch (error) {
      logger.error('Error getting barber bookings:', error);
      throw error;
    }
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /** Admin moderation: whether `from` can move to `to` (excludes implicit no-op). */
  private canTransitionApproval(
    from: BarberApprovalStatus,
    to: BarberApprovalStatus
  ): boolean {
    if (from === to) return true;
    const allowed: Record<BarberApprovalStatus, BarberApprovalStatus[]> = {
      pending: ['approved', 'rejected', 'suspended'],
      approved: ['rejected', 'suspended'],
      rejected: ['approved', 'suspended'],
      suspended: ['approved', 'rejected'],
    };
    return allowed[from]?.includes(to) ?? false;
  }

  /**
   * Paginated barber list for admin; optional `approvalStatus` filter.
   * Never includes `password` in responses.
   */
  async listBarbersForAdmin(options: {
    approvalStatus?: BarberApprovalStatus;
    page: number;
    limit: number;
  }): Promise<BarberListResponse> {
    const pageSize = Math.max(1, Math.min(options.limit || 20, 100));
    const page = Math.max(0, options.page || 0);
    const offset = page * pageSize;

    let query: any = this.firestore.collection(COLLECTIONS.BARBERS);

    if (options.approvalStatus) {
      query = query.where('approvalStatus', '==', options.approvalStatus);
    }

    const totalSnap = await query.count().get();
    const total = totalSnap.data().count;

    const snapshot = await query.offset(offset).limit(pageSize).get();
    const barbers: BarberResponse[] = [];

    for (const doc of snapshot.docs) {
      const barberData = { id: doc.id, ...doc.data() } as Barber;
      const services = await this.getBarberServices(doc.id);

      let validatedAvatar = barberData.avatar;
      if (barberData.avatar) {
        try {
          const isValidUrl = await validateStoredAvatarRef(barberData.avatar);
          if (!isValidUrl) {
            await this.firestore
              .collection(COLLECTIONS.BARBERS)
              .doc(barberData.id)
              .update({
                avatar: null,
                updatedAt: new Date(),
              });
            validatedAvatar = undefined;
          }
        } catch (error) {
          logger.error('Error validating barber avatar URL in admin list:', {
            barberId: barberData.id,
            error,
          });
        }
      }

      const avatarResolved = await resolveMediaRefForApi(validatedAvatar);
      const imagesResolved = await resolveManyMediaRefsForApi(
        barberData.images
      );

      barbers.push({
        id: barberData.id,
        username: barberData.username,
        firstName: barberData.firstName,
        lastName: barberData.lastName,
        phone: barberData.phone,
        location: barberData.location,
        birthDate: barberData.birthDate,
        workingHours: barberData.workingHours,
        experienceYears: barberData.experienceYears,
        title: barberData.title,
        bio: barberData.bio,
        avatar: avatarResolved,
        images: imagesResolved,
        services,
        approvalStatus: barberData.approvalStatus ?? 'approved',
        approvalMessage: barberData.approvalMessage,
        ratingAverage: barberData.ratingAverage,
        ratingCount: barberData.ratingCount,
      });
    }

    return {
      barbers,
      page,
      limit: pageSize,
      total,
    };
  }

  /** Single barber for admin (public-safe; no password). */
  async getBarberByIdForAdmin(
    barberId: string
  ): Promise<{ barber: BarberResponse; services: BarberService[] } | null> {
    return this.getBarberWithServices(barberId);
  }

  /**
   * Updates moderation fields. Used only from admin routes.
   * Throws Error with `.statusCode` 400 (invalid transition) or 404 (not found).
   */
  async setBarberApproval(
    barberId: string,
    input: {
      status: Exclude<BarberApprovalStatus, 'pending'>;
      message?: string;
    }
  ): Promise<BarberResponse> {
    const barber = await this.getBarberById(barberId);
    if (!barber) {
      const err = new Error('Barber not found') as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      throw err;
    }

    const current: BarberApprovalStatus = barber.approvalStatus ?? 'approved';

    if (!this.canTransitionApproval(current, input.status)) {
      const err = new Error(
        `Cannot change approval from "${current}" to "${input.status}"`
      ) as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }

    await this.firestore
      .collection(COLLECTIONS.BARBERS)
      .doc(barberId)
      .update({
        approvalStatus: input.status,
        approvalMessage:
          input.message !== undefined
            ? input.message
            : (barber.approvalMessage ?? null),
        updatedAt: new Date(),
      });

    const updated = await this.getBarberWithServices(barberId);
    if (!updated) {
      const err = new Error('Barber not found') as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      throw err;
    }
    return updated.barber;
  }
}

export const barberService = new BarberServiceClass();
