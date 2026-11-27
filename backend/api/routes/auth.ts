import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

import { normalizePhone } from '../utils/phone';
import { createLoginLimiter } from '../middleware/loginLimiter';
import { MIN_PASSWORD_LENGTH } from '../utils/passwordPolicy';

const router = Router();

// Auth routes will be implemented here
// These will handle login/register for both barbers and clients

const loginLimiter = createLoginLimiter();

// Validation rules
const barberRegisterValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters'),
  body('password')
    .isLength({ min: MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required'),
  body('phone')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  body('location')
    .isLength({ min: 1, max: 100 })
    .withMessage('Location is required'),
  body('birthDate').isISO8601().withMessage('Valid birth date is required'),
  body('workingHours')
    .isLength({ min: 1, max: 100 })
    .withMessage('Working hours are required'),
];

const barberLoginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const clientRegisterValidation = [
  body('password')
    .isString()
    .isLength({ min: MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  body('firstName')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Last name must be at most 50 characters'),
  body('phone')
    .custom(value => normalizePhone(value) !== null)
    .withMessage('Valid phone number is required'),
];

const clientLoginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

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
 * /auth/barber/register:
 *   post:
 *     summary: Register a new barber
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BarberRegisterRequest'
 *     responses:
 *       201:
 *         description: Barber registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BarberRegisterResponse'
 *       400:
 *         description: Validation error or user already exists
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
router.post(
  '/barber/register',
  barberRegisterValidation,
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const result = await authService.barberRegister(req.body);

      if (result.ok) {
        const b = result.barber!;
        const { approvalStatus, approvalMessage, ...rest } = b;
        res.status(201).json({
          ok: true,
          data: {
            token: result.token,
            barber: {
              ...rest,
              approval_status: approvalStatus ?? 'approved',
              approval_message: approvalMessage ?? null,
            },
            services: result.services ?? [],
          },
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Barber registration error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /auth/barber/login:
 *   post:
 *     summary: Login as a barber
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.post(
  '/barber/login',
  loginLimiter,
  barberLoginValidation,
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const result = await authService.barberLogin(req.body);

      if (result.ok) {
        const b = result.barber!;
        const { approvalStatus, approvalMessage, ...rest } = b;
        res.json({
          ok: true,
          data: {
            token: result.token,
            barber: {
              ...rest,
              approval_status: approvalStatus ?? 'approved',
              approval_message: approvalMessage ?? null,
            },
            services: result.services,
          },
        });
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      logger.error('Barber login error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /auth/client/register:
 *   post:
 *     summary: Register a new client
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Client registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Validation error or user already exists
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
router.post(
  '/client/register',
  clientRegisterValidation,
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const result = await authService.clientRegister(req.body);

      if (result.ok) {
        res.status(201).json({
          ok: true,
          success: true,
          token: result.token,
          data: { client: result.client, token: result.token },
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Client registration error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * @swagger
 * /auth/client/login:
 *   post:
 *     summary: Login as a client
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     client:
 *                       type: object
 *                       description: Client profile information
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.post(
  '/client/login',
  loginLimiter,
  clientLoginValidation,
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const result = await authService.clientLogin(req.body);

      if (result.ok) {
        res.json({
          ok: true,
          data: {
            client: result.client,
            token: result.token,
          },
        });
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      logger.error('Client login error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

export default router;
