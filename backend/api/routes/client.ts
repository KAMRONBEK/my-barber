import { Router, Request, Response } from 'express';
import { Expo } from 'expo-server-sdk';
import { body, validationResult, query, param } from 'express-validator';
import { uploadAvatar } from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';
import { clientService } from '../services/clientService';
import { barberService } from '../services/barberService';
import { favoriteService } from '../services/favoriteService';
import { bookingService } from '../services/bookingService';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import { reviewService } from '../services/reviewService';
import { bookingResponseToContract } from '../utils/bookingContract';
import { resolveMediaRefForApi } from '../services/fileStorage';

const router = Router();

function isFirestoreMissingIndexError(error: unknown): boolean {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number'
      ? (error as { code: number }).code
      : undefined;
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';
  // gRPC FAILED_PRECONDITION (9): composite index not built or missing
  return code === 9 || msg.includes('requires an index');
}

// Helper function to handle validation errors
const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      ok: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return true;
  }
  return false;
};

/**
 * @swagger
 * /client/getMe:
 *   get:
 *     summary: Get authenticated client profile
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Client profile information
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - client account required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Client not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get client profile
router.get('/getMe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType !== 'client') {
      return res.status(403).json({
        ok: false,
        error: 'Access denied. Client account required.',
      });
    }

    const client = await clientService.getClientById(clientId);

    if (!client) {
      return res.status(404).json({
        ok: false,
        error: 'Client not found',
      });
    }

    const clientResponse = await clientService.toClientResponse(client);

    res.json({
      ok: true,
      data: clientResponse,
    });
  } catch (error) {
    logger.error('Error getting client profile:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /client/update:
 *   put:
 *     summary: Update client profile
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: Doe
 *               phone:
 *                 type: string
 *                 example: +998901234567
 *               location:
 *                 type: string
 *                 maxLength: 200
 *                 example: Tashkent, Uzbekistan
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Update client profile
router.put(
  '/update',
  [
    authenticateToken,
    body('firstName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be 1-50 characters'),
    body('lastName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be 1-50 characters'),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number is required'),
    body('location')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Location must be at most 200 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      // Whitelist fields explicitly — req.body must never be passed through
      // directly to Firestore .update(), or a caller could overwrite
      // password/username/id and other fields this endpoint isn't meant to touch.
      const { firstName, lastName, phone, location } = req.body;
      await clientService.updateClientProfile(clientId, {
        firstName,
        lastName,
        phone,
        location,
      });

      res.json({
        ok: true,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.error('Error updating client profile:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /client/update-credentials:
 *   post:
 *     summary: Update client login credentials
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 example: johndoe_client
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Credentials updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Update credentials
router.post(
  '/update-credentials',
  [
    authenticateToken,
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const result = await authService.clientUpdateCredentials(
        clientId,
        req.body.username,
        req.body.password
      );

      if (result.ok) {
        res.json({
          ok: true,
          message: 'Credentials updated successfully',
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Error updating client credentials:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /client/update-avatar:
 *   put:
 *     summary: Upload or update client avatar
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (JPEG, PNG, or WebP)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Avatar uploaded successfully
 *                 file:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: Time-limited S3 presigned GET URL for the avatar
 *       400:
 *         description: No avatar uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Upload client avatar
router.put(
  '/update-avatar',
  [authenticateToken, uploadAvatar('avatar', 'client')],
  async (req: Request, res: Response) => {
    try {
      const clientId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const uploadedFile = (req as any).uploadedFile;

      if (!uploadedFile) {
        return res.status(400).json({
          ok: false,
          error: 'No avatar uploaded',
        });
      }

      await clientService.updateClientAvatar(clientId, uploadedFile.storageKey);

      const url = await resolveMediaRefForApi(uploadedFile.storageKey);

      res.json({
        ok: true,
        message: 'Avatar uploaded successfully',
        file: {
          url,
        },
      });
    } catch (error) {
      logger.error('Error uploading client avatar:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /client/update-device-id:
 *   put:
 *     summary: Register Expo push token for this client device
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: Expo push token
 *                 example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 *     responses:
 *       200:
 *         description: Token stored
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied — client account required
 *       422:
 *         description: Not a valid Expo push token
 *       500:
 *         description: Internal server error
 */
router.put(
  '/update-device-id',
  [
    authenticateToken,
    body('deviceId').isLength({ min: 1 }).withMessage('Device ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const trimmed = String(req.body.deviceId).trim();
      if (!Expo.isExpoPushToken(trimmed)) {
        return res.status(422).json({
          ok: false,
          error: 'Invalid Expo push token',
        });
      }

      await clientService.updateClientDeviceId(clientId, trimmed);
      res.json({ ok: true, message: 'Device ID updated successfully' });
    } catch (error) {
      logger.error('Error updating client device ID:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /client/locale:
 *   put:
 *     summary: Sync the app's language setting — drives notification copy language
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locale
 *             properties:
 *               locale:
 *                 type: string
 *                 enum: [uz, ru]
 *     responses:
 *       200:
 *         description: Locale stored
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied — client account required
 *       500:
 *         description: Internal server error
 */
router.put(
  '/locale',
  [authenticateToken, body('locale').isIn(['uz', 'ru'])],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      await clientService.updateClientLocale(clientId, req.body.locale);
      res.json({ ok: true, message: 'Locale updated successfully' });
    } catch (error) {
      logger.error('Error updating client locale:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /client/push-token:
 *   delete:
 *     summary: Clear stored Expo push token
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push token cleared
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied — client account required
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/push-token',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const clientId = (req as any).user.id;
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      await clientService.clearClientStoredDevice(clientId);
      res.json({ ok: true, message: 'Push token cleared' });
    } catch (error) {
      logger.error('Error clearing client push token:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /client/favorites:
 *   get:
 *     summary: List the client's saved (favorited) barbers
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favorited barbers, newest saved first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BarberResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied — client account required
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Save a barber as a favorite
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [barberId]
 *             properties:
 *               barberId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Saved (idempotent — already-favorited barbers are a no-op)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied — client account required
 *       500:
 *         description: Internal server error
 */
router.get(
  '/favorites',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const clientId = (req as any).user.id;
      const barberIds = await favoriteService.listFavoriteBarberIds(clientId);
      const results = await Promise.all(
        barberIds.map(id => barberService.getBarberWithServices(id))
      );
      // A favorited barber may since have been deleted/deactivated — drop nulls
      // rather than surfacing a broken entry.
      const barbers = results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map(r => r.barber);

      res.json({ ok: true, data: barbers });
    } catch (error) {
      logger.error('Error listing favorites:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.post(
  '/favorites',
  [authenticateToken, body('barberId').notEmpty().isString()],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const clientId = (req as any).user.id;
      await favoriteService.addFavorite(clientId, req.body.barberId);
      res.json({ ok: true, data: {} });
    } catch (error) {
      logger.error('Error adding favorite:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /client/favorites/{barberId}:
 *   delete:
 *     summary: Remove a barber from favorites
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed (idempotent — not-favorited barbers are a no-op)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied — client account required
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/favorites/:barberId',
  [authenticateToken, param('barberId').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const clientId = (req as any).user.id;
      await favoriteService.removeFavorite(clientId, req.params.barberId);
      res.json({ ok: true, data: {} });
    } catch (error) {
      logger.error('Error removing favorite:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /client/booking-history:
 *   get:
 *     summary: My booking history (all barbers, paginated)
 *     description: Newest first. For per-barber calendar data use GET /client/bookings with barber_id.
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque cursor from previous response data.next_cursor
 *     responses:
 *       200:
 *         description: Booking contracts for this client
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientBookingHistoryResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a client
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Firestore composite index for this query not deployed or still building
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/booking-history',
  [
    authenticateToken,
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('limit must be an integer from 1 to 50'),
    query('cursor').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const clientId = (req as any).user.id;
      const limitRaw = req.query.limit;
      const limit =
        limitRaw !== undefined && limitRaw !== ''
          ? parseInt(String(limitRaw), 10)
          : 20;
      const cursor =
        typeof req.query.cursor === 'string' && req.query.cursor.length > 0
          ? req.query.cursor
          : undefined;

      const data = await bookingService.listBookingHistoryForClient(
        clientId,
        limit,
        cursor
      );

      res.json({ ok: true, data });
    } catch (error) {
      if (isFirestoreMissingIndexError(error)) {
        logger.error(
          'Booking history: Firestore composite index missing or still building (clientId + timestamp on bookings). Deploy: firebase deploy --only firestore:indexes',
          error
        );
        return res.status(503).json({
          ok: false,
          error:
            'Booking history is unavailable until the Firestore index is deployed. See firestore.indexes.json and run firebase deploy --only firestore:indexes.',
        });
      }
      logger.error('Error listing client booking history:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /client/bookings:
 *   get:
 *     summary: List bookings for one barber (calendar / slots)
 *     description: Requires barber_id. For all bookings across barbers use GET /client/booking-history.
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: barber_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID to list bookings for
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings by date (ISO format YYYY-MM-DD)
 *         example: 2024-01-15
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientBookingsListResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Client bookings list.
// - With ?barber_id=<id> (and optional ?date=YYYY-MM-DD): returns bookings for that barber (barber-calendar view).
// - With ?status=<upcoming|past|...> (no barber_id): returns the client's own bookings, newest first, filtered by status.
// /barber-bookings is a legacy alias for the barber-id variant.
router.get(
  ['/bookings', '/barber-bookings'],
  [
    authenticateToken,
    query('barber_id').optional().isString(),
    query('status')
      .optional()
      .isString()
      .isIn([
        'upcoming',
        'past',
        'pending_confirmation',
        'confirmed',
        'declined',
        'cancelled',
        'rescheduled',
        'completed',
        'no_show',
      ])
      .withMessage('status must be a valid booking status or filter group'),
    query('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be in ISO format (YYYY-MM-DD)'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('limit must be an integer from 1 to 50'),
    query('cursor').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userType = (req as any).user.type;

      if (userType !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const barberId = req.query.barber_id as string | undefined;
      const statusParam = req.query.status as string | undefined;

      // When barber_id is present: return bookings for that specific barber (existing behaviour).
      if (barberId) {
        const date = req.query.date as string | undefined;
        const bookings = await clientService.getClientBookings(barberId, date);
        return res.json({ ok: true, data: bookings });
      }

      // When barber_id is absent: return the client's own booking history, optionally filtered by status.
      const clientId = (req as any).user.id;
      const limitRaw = req.query.limit;
      const limit =
        limitRaw !== undefined && limitRaw !== ''
          ? parseInt(String(limitRaw), 10)
          : 20;
      const cursor =
        typeof req.query.cursor === 'string' && req.query.cursor.length > 0
          ? req.query.cursor
          : undefined;

      const data = await bookingService.listBookingHistoryForClient(
        clientId,
        limit,
        cursor,
        statusParam
      );

      res.json({ ok: true, data });
    } catch (error) {
      if (isFirestoreMissingIndexError(error)) {
        logger.error(
          'Client bookings: Firestore composite index missing or still building. Deploy: firebase deploy --only firestore:indexes',
          error
        );
        return res.status(503).json({
          ok: false,
          error:
            'Bookings unavailable until the Firestore index is deployed. See firestore.indexes.json.',
        });
      }
      logger.error('Error getting client bookings:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /client/bookings:
 *   post:
 *     summary: Create a new booking with a barber
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientCreateBookingRequest'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateBookingResponseBody'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Create booking (/barber-bookings is a legacy alias)
router.post(
  ['/bookings', '/barber-bookings'],
  [
    authenticateToken,
    body('barberId').notEmpty().withMessage('Barber ID is required'),
    body('serviceIds')
      .isArray({ min: 1 })
      .withMessage('At least one service ID is required'),
    body('serviceIds.*').notEmpty().withMessage('Service ID cannot be empty'),
    body('timestamp').isISO8601().withMessage('Valid timestamp is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const bookingPayload = {
        barberId: req.body.barberId,
        clientId,
        serviceIds: req.body.serviceIds,
        timestamp: req.body.timestamp,
      };

      const bookingId = await bookingService.createBooking(bookingPayload);
      const bookingRow = await bookingService.getBookingById(bookingId);

      res.status(201).json({
        ok: true,
        data: {
          booking: bookingRow
            ? bookingResponseToContract(bookingRow)
            : undefined,
          services: req.body.serviceIds,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'BLOCKED') {
        return res.status(403).json({
          ok: false,
          error: 'Cannot book this barber',
        });
      }
      logger.error('Error creating booking:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

router.post(
  '/bookings/:bookingId/cancel',
  [
    authenticateToken,
    param('bookingId').notEmpty(),
    body('reason').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const reason = req.body.reason === undefined ? null : req.body.reason;

      try {
        const updated = await bookingService.cancelBooking(
          'client',
          clientId,
          req.params.bookingId,
          reason
        );
        if (!updated) {
          return res
            .status(404)
            .json({ ok: false, error: 'Booking not found' });
        }
        res.json({
          ok: true,
          data: { booking: bookingResponseToContract(updated) },
        });
      } catch (e: unknown) {
        if ((e as Error).message === 'INVALID_STATE') {
          return res.status(409).json({
            ok: false,
            error: 'Booking cannot be cancelled in its current state',
          });
        }
        throw e;
      }
    } catch (error) {
      logger.error('Error cancelling booking (client):', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.post(
  '/bookings/:bookingId/reschedule',
  [
    authenticateToken,
    param('bookingId').notEmpty(),
    body('timestamp').isISO8601(),
    body('reason').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const reason = req.body.reason === undefined ? null : req.body.reason;

      try {
        const updated = await bookingService.rescheduleBooking(
          'client',
          clientId,
          req.params.bookingId,
          req.body.timestamp,
          reason
        );
        if (!updated) {
          return res
            .status(404)
            .json({ ok: false, error: 'Booking not found' });
        }
        res.json({
          ok: true,
          data: { booking: bookingResponseToContract(updated) },
        });
      } catch (e: unknown) {
        if ((e as Error).message === 'INVALID_STATE') {
          return res.status(409).json({
            ok: false,
            error: 'Booking cannot be rescheduled in its current state',
          });
        }
        throw e;
      }
    } catch (error) {
      logger.error('Error rescheduling booking (client):', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.post(
  '/bookings/:bookingId/arrival-confirm',
  [
    authenticateToken,
    param('bookingId').notEmpty(),
    body('response').isIn(['yes', 'no']),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      try {
        const updated = await bookingService.recordArrivalResponse(
          'client',
          clientId,
          req.params.bookingId,
          req.body.response
        );
        if (!updated) {
          return res
            .status(404)
            .json({ ok: false, error: 'Booking not found' });
        }
        res.json({
          ok: true,
          data: { booking: bookingResponseToContract(updated) },
        });
      } catch (e: unknown) {
        if ((e as Error).message === 'INVALID_STATE') {
          return res.status(409).json({
            ok: false,
            error:
              'Booking cannot accept an arrival response in its current state',
          });
        }
        throw e;
      }
    } catch (error) {
      logger.error('Error recording client arrival response:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.get(
  '/bookings/arrival-pending',
  [authenticateToken],
  async (req: Request, res: Response) => {
    try {
      const clientId = (req as any).user.id;
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      const bookings =
        await bookingService.listArrivalPendingForClient(clientId);
      res.json({ ok: true, data: { bookings } });
    } catch (error) {
      logger.error('Error listing arrival-pending bookings (client):', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.post(
  '/bookings/:bookingId/review',
  [
    authenticateToken,
    param('bookingId').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString(),
    body('service_ids').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const clientId = (req as any).user.id;
      if ((req as any).user.type !== 'client') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Client account required.',
        });
      }

      try {
        const result = await reviewService.createReview(
          clientId,
          req.params.bookingId,
          {
            rating: req.body.rating,
            comment: req.body.comment ?? '',
            service_ids: req.body.service_ids ?? [],
          }
        );

        if (!result) {
          return res
            .status(404)
            .json({ ok: false, error: 'Booking not found' });
        }

        res.status(201).json({ ok: true, data: result });
      } catch (e: unknown) {
        const msg = (e as Error).message;
        if (msg === 'INVALID_STATE') {
          return res.status(409).json({
            ok: false,
            error: 'Reviews are only allowed on completed bookings',
          });
        }
        if (msg === 'DUPLICATE') {
          return res.status(409).json({
            ok: false,
            error: 'A review already exists for this booking',
          });
        }
        throw e;
      }
    } catch (error) {
      logger.error('Error creating review:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /client/banner:
 *   get:
 *     summary: Get banner/promotional content (top barbers)
 *     tags: [Client]
 *     responses:
 *       200:
 *         description: Banner content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Top barber profiles
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /client/barbers:
 *   get:
 *     summary: List all approved barbers (paginated)
 *     tags: [Client]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Barber list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BarberResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/barbers', async (req: Request, res: Response) => {
  try {
    const page =
      typeof req.query.page === 'string'
        ? parseInt(req.query.page, 10) || 0
        : 0;
    const limit =
      typeof req.query.limit === 'string'
        ? parseInt(req.query.limit, 10) || 50
        : 50;

    const result = await barberService.getAllBarbers(page, limit);

    res.json({
      ok: true,
      data: result.barbers,
    });
  } catch (error) {
    logger.error('Error getting barbers list:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
});

// Get banner/promotional content (top 3 barbers).
// TODO: optionally merge or replace with Firestore `cms/banner` (see admin PUT /admin/content/banner).
router.get('/banner', async (req: Request, res: Response) => {
  try {
    const result = await barberService.getAllBarbers(0, 3);

    res.json({
      ok: true,
      data: result.barbers,
    });
  } catch (error) {
    logger.error('Error getting banner content:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
});

export default router;
