import { Router, Request, Response } from 'express';
import { Expo } from 'expo-server-sdk';
import { body, validationResult, query, param } from 'express-validator';
import { uploadPortfolio, uploadAvatar } from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';
import { barberService } from '../services/barberService';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import { bookingService } from '../services/bookingService';
import { earningsService } from '../services/earningsService';
import { bookingResponseToContract } from '../utils/bookingContract';
import {
  resolveMediaRefForApi,
  resolveManyMediaRefsForApi,
} from '../services/fileStorage';

const router = Router();

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
 * /barber:
 *   get:
 *     summary: Get all barbers with pagination
 *     tags: [Barber]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of items per page (max 50)
 *     responses:
 *       200:
 *         description: List of barbers retrieved successfully
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
 *                   properties:
 *                     barbers:
 *                       type: array
 *                       items:
 *                         type: object
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Validation error
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
 * /barbers:
 *   get:
 *     summary: Get all barbers with pagination
 *     description: Same behavior as GET /barber. The barber router is mounted at both `/barber` and `/barbers`.
 *     tags: [Barber]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of items per page (max 50)
 *     responses:
 *       200:
 *         description: List of barbers retrieved successfully
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
 *                   properties:
 *                     barbers:
 *                       type: array
 *                       items:
 *                         type: object
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Validation error
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
// Get all barbers with pagination
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Page must be a non-negative integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const page = parseInt(req.query.page as string) || 0;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;

      const result = await barberService.getAllBarbers(page, limit);

      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error getting barbers:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /barber/getMe:
 *   get:
 *     summary: Get authenticated barber profile
 *     tags: [Barber]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Barber profile retrieved successfully
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
 *                   properties:
 *                     barber:
 *                       type: object
 *                       description: Barber profile information
 *                     services:
 *                       type: array
 *                       description: Barber's services
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - barber account required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Barber not found
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
// Get barber profile (authenticated)
router.get('/getMe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const barberId = (req as any).user.id;
    const userType = (req as any).user.type;

    if (userType !== 'barber') {
      return res.status(403).json({
        ok: false,
        error: 'Access denied. Barber account required.',
      });
    }

    const result = await barberService.getBarberWithServices(barberId);

    if (!result) {
      return res.status(404).json({
        ok: false,
        error: 'Barber not found',
      });
    }

    const { barber, services } = result;
    const { approvalStatus, approvalMessage, ...rest } = barber;

    res.json({
      ok: true,
      data: {
        barber: {
          ...rest,
          approval_status: approvalStatus ?? 'approved',
          approval_message: approvalMessage ?? null,
        },
        services,
      },
    });
  } catch (error) {
    logger.error('Error getting barber profile:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /barber/update:
 *   put:
 *     summary: Update barber profile
 *     tags: [Barber]
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
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: Tashkent, Uzbekistan
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 example: 1990-01-15
 *               workingHours:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: 9:00 AM - 6:00 PM
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
// Update barber profile
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
      .isLength({ min: 1, max: 100 })
      .withMessage('Location must be 1-100 characters'),
    body('birthDate')
      .optional()
      .isISO8601()
      .withMessage('Valid birth date is required'),
    body('workingHours')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Working hours must be 1-100 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      await barberService.updateBarberProfile(barberId, req.body);

      res.json({
        ok: true,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.error('Error updating barber profile:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /barber/update-credentials:
 *   post:
 *     summary: Update barber login credentials
 *     tags: [Barber]
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
 *                 example: johndoe_barber
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

      const barberId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const result = await authService.barberUpdateCredentials(
        barberId,
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
      logger.error('Error updating barber credentials:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /barber/update-avatar:
 *   put:
 *     summary: Upload or update barber avatar
 *     tags: [Barber]
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
// Upload barber avatar
router.put(
  '/update-avatar',
  [authenticateToken, uploadAvatar('avatar', 'barber')],
  async (req: Request, res: Response) => {
    try {
      const barberId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const uploadedFile = (req as any).uploadedFile;

      if (!uploadedFile) {
        return res.status(400).json({
          ok: false,
          error: 'No avatar uploaded',
        });
      }

      await barberService.updateBarberAvatar(barberId, uploadedFile.storageKey);

      const url = await resolveMediaRefForApi(uploadedFile.storageKey);

      res.json({
        ok: true,
        message: 'Avatar uploaded successfully',
        file: {
          url,
        },
      });
    } catch (error) {
      logger.error('Error uploading barber avatar:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /barber/add-image:
 *   post:
 *     summary: Add portfolio images to barber profile
 *     tags: [Barber]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Portfolio images (up to 5 files, JPEG/PNG/WebP)
 *     responses:
 *       200:
 *         description: Images uploaded successfully
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
 *                   example: Images uploaded successfully
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                         description: Time-limited S3 presigned GET URL per image
 *       400:
 *         description: No images uploaded
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
// Add barber portfolio image(s)
router.post(
  '/add-image',
  [authenticateToken, uploadPortfolio('images', 5, 'barber')],
  async (req: Request, res: Response) => {
    try {
      const barberId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const uploadedFiles = (req as any).uploadedFiles;

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'No images uploaded',
        });
      }

      const storageKeys = uploadedFiles.map((f: any) => f.storageKey as string);
      await barberService.addBarberImages(barberId, storageKeys);

      const urls = await resolveManyMediaRefsForApi(storageKeys);

      res.json({
        ok: true,
        message: 'Images uploaded successfully',
        files: urls.map(u => ({
          url: u,
        })),
      });
    } catch (error) {
      logger.error('Error adding barber images:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /barber/add-service:
 *   post:
 *     summary: Add service(s) to barber profile
 *     tags: [Barber]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - name
 *                   - price
 *                 properties:
 *                   name:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 100
 *                     example: Haircut
 *                   price:
 *                     type: number
 *                     minimum: 0
 *                     example: 50000
 *               - type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - price
 *                   properties:
 *                     name:
 *                       type: string
 *                       minLength: 1
 *                       maxLength: 100
 *                       example: Haircut
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                       example: 50000
 *     responses:
 *       200:
 *         description: Services added successfully
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
// Add service
router.post(
  '/add-service',
  [
    authenticateToken,
    body('*.name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Service name must be 1-100 characters'),
    body('*.price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const services = Array.isArray(req.body) ? req.body : [req.body];

      await barberService.addBarberServices(barberId, services);

      res.json({
        ok: true,
        message: 'Services added successfully',
      });
    } catch (error) {
      logger.error('Error adding barber services:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /barber/delete-service/{service_id}:
 *   delete:
 *     summary: Delete a service from barber profile
 *     tags: [Barber]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: service_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID to delete
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
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
// Delete service
router.delete(
  '/delete-service/:service_id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userType = (req as any).user.type;

      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const serviceId = req.params.service_id;

      await barberService.deleteBarberService(serviceId);

      res.json({
        ok: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting barber service:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /barber/bookings:
 *   get:
 *     summary: Get barber's bookings for optional calendar date
 *     tags: [Barber]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Booking summary row
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
// Barber bookings list
router.get(
  '/bookings',
  [
    authenticateToken,
    query('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be in ISO format (YYYY-MM-DD)'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const date = req.query.date as string;
      const bookings = await barberService.getBarberBookings(barberId, date);

      res.json({
        ok: true,
        data: bookings,
      });
    } catch (error) {
      logger.error('Error getting barber bookings:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

router.patch(
  '/bookings/:bookingId/status',
  [
    authenticateToken,
    param('bookingId').notEmpty(),
    body('status').isIn(['confirmed', 'declined']),
    body('reason').optional({ nullable: true }).isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      const userType = (req as any).user.type;
      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const bookingId = req.params.bookingId;
      const status = req.body.status as 'confirmed' | 'declined';
      const reason = req.body.reason === undefined ? null : req.body.reason;

      try {
        const updated = await bookingService.patchBarberBookingStatus(
          barberId,
          bookingId,
          status,
          reason
        );
        if (!updated) {
          return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        res.json({
          ok: true,
          data: { booking: bookingResponseToContract(updated) },
        });
      } catch (e: unknown) {
        if ((e as Error).message === 'INVALID_STATE') {
          return res.status(409).json({
            ok: false,
            error: 'Booking cannot be updated in its current state',
          });
        }
        throw e;
      }
    } catch (error) {
      logger.error('Error patching booking status:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
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

      const barberId = (req as any).user.id;
      if ((req as any).user.type !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const reason = req.body.reason === undefined ? null : req.body.reason;

      try {
        const updated = await bookingService.cancelBooking(
          'barber',
          barberId,
          req.params.bookingId,
          reason
        );
        if (!updated) {
          return res.status(404).json({ ok: false, error: 'Booking not found' });
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
      logger.error('Error cancelling booking:', error);
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

      const barberId = (req as any).user.id;
      if ((req as any).user.type !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const reason = req.body.reason === undefined ? null : req.body.reason;

      try {
        const updated = await bookingService.rescheduleBooking(
          'barber',
          barberId,
          req.params.bookingId,
          req.body.timestamp,
          reason
        );
        if (!updated) {
          return res.status(404).json({ ok: false, error: 'Booking not found' });
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
      logger.error('Error rescheduling booking:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.post(
  '/bookings/:bookingId/no-show',
  [authenticateToken, param('bookingId').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      if ((req as any).user.type !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      try {
        const updated = await bookingService.markNoShow(
          barberId,
          req.params.bookingId
        );
        if (!updated) {
          return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        res.json({
          ok: true,
          data: { booking: bookingResponseToContract(updated) },
        });
      } catch (e: unknown) {
        if ((e as Error).message === 'INVALID_STATE') {
          return res.status(409).json({
            ok: false,
            error: 'Booking cannot be marked no-show in its current state',
          });
        }
        throw e;
      }
    } catch (error) {
      logger.error('Error marking no-show:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.post(
  '/bookings/:bookingId/complete',
  [authenticateToken, param('bookingId').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      if ((req as any).user.type !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      try {
        const updated = await bookingService.completeBooking(
          barberId,
          req.params.bookingId
        );
        if (!updated) {
          return res.status(404).json({ ok: false, error: 'Booking not found' });
        }
        res.json({
          ok: true,
          data: { booking: bookingResponseToContract(updated) },
        });
      } catch (e: unknown) {
        if ((e as Error).message === 'INVALID_STATE') {
          return res.status(409).json({
            ok: false,
            error: 'Booking cannot be completed in its current state',
          });
        }
        throw e;
      }
    } catch (error) {
      logger.error('Error completing booking:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.get(
  '/earnings',
  [
    authenticateToken,
    query('from').matches(/^\d{4}-\d{2}-\d{2}$/),
    query('to').matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      if ((req as any).user.type !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const from = req.query.from as string;
      const to = req.query.to as string;

      const data = await earningsService.getBarberEarnings(barberId, from, to);
      res.json({ ok: true, data });
    } catch (error) {
      logger.error('Error getting earnings:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.get(
  '/services',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const barberId = (req as any).user.id;
      if ((req as any).user.type !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const services = await barberService.listBarberServicesContract(barberId);
      res.json({ ok: true, data: { services } });
    } catch (error) {
      logger.error('Error listing barber services:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.put(
  '/services',
  [
    authenticateToken,
    body('services').isArray({ min: 1 }),
    body('services.*.catalog_service_id').notEmpty(),
    body('services.*.name').notEmpty(),
    body('services.*.price').isNumeric(),
    body('services.*.duration_minutes').isInt({ min: 1 }),
    body('services.*.is_active').isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      if ((req as any).user.type !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const services = await barberService.upsertBarberServicesLineItems(
        barberId,
        req.body.services
      );
      res.json({ ok: true, data: { services } });
    } catch (error) {
      logger.error('Error upserting barber services:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.delete(
  '/services/:serviceId',
  [authenticateToken, param('serviceId').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      if ((req as any).user.type !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const ok = await barberService.softDeleteBarberService(
        barberId,
        req.params.serviceId
      );
      if (!ok) {
        return res.status(404).json({ ok: false, error: 'Service not found' });
      }

      const services = await barberService.listBarberServicesContract(barberId);
      res.json({ ok: true, data: { services } });
    } catch (error) {
      logger.error('Error deleting barber service:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /barber/update-device-id:
 *   put:
 *     summary: Update device ID for push notifications
 *     tags: [Barber]
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
 *                 minLength: 1
 *                 description: Expo push notification token
 *                 example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 *     responses:
 *       200:
 *         description: Device ID updated successfully
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
 *       422:
 *         description: Not a valid Expo push token
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
// Update device ID for notifications
router.put(
  '/update-device-id',
  [
    authenticateToken,
    body('deviceId').isLength({ min: 1 }).withMessage('Device ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = (req as any).user.id;
      const userType = (req as any).user.type;

      if (userType !== 'barber') {
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Barber account required.',
        });
      }

      const deviceIdTrim = String(req.body.deviceId).trim();
      if (!Expo.isExpoPushToken(deviceIdTrim)) {
        return res.status(422).json({
          ok: false,
          error: 'Invalid Expo push token',
        });
      }

      await barberService.updateBarberDeviceId(barberId, deviceIdTrim);

      res.json({
        ok: true,
        message: 'Device ID updated successfully',
      });
    } catch (error) {
      logger.error('Error updating device ID:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /barber/push-token:
 *   delete:
 *     summary: Clear stored Expo push token (unregister from push)
 *     tags: [Barber]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push token cleared
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied — barber account required
 *       500:
 *         description: Internal server error
 */
router.delete('/push-token', authenticateToken, async (req: Request, res: Response) => {
  try {
    const barberId = (req as any).user.id;
    if ((req as any).user.type !== 'barber') {
      return res.status(403).json({
        ok: false,
        error: 'Access denied. Barber account required.',
      });
    }

    await barberService.clearBarberStoredDevice(barberId);

    res.json({ ok: true, message: 'Push token cleared' });
  } catch (error) {
    logger.error('Error clearing barber push token:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
