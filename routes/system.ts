import { Router, Request, Response } from 'express';
import { metricsHandler } from '../middleware/metrics';
import { config } from '../config/config';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     description: Returns the current health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information
 *     tags: [System]
 *     description: Returns general information about the API and available endpoints
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APIInfo'
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'My Barber API',
    version: '1.0.0',
    description: 'Barber booking API built with Node.js and TypeScript',
    environment: config.nodeEnv,
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      documentation: '/docs',
      openApiJson: '/docs.json',
      development: {
        note: 'Helpers for debugging; disable or protect in production if desired.',
        endpoints: ['POST /test/send-notification', 'GET /test/logging'],
      },
      authentication: {
        base: '/auth',
        endpoints: [
          'POST /auth/barber-login',
          'POST /auth/barber-register',
          'POST /auth/client-login',
          'POST /auth/client-register',
        ],
      },
      barber: {
        base: '/barber',
        alsoMountedAt: '/barbers',
        endpoints: [
          'GET /barber/',
          'GET /barbers/',
          'GET /barber/getMe',
          'PUT /barber/update',
          'POST /barber/add-image',
          'POST /barber/add-service',
          'GET /barber/bookings',
          'PATCH /barber/bookings/:bookingId/status',
          'POST /barber/bookings/:bookingId/cancel',
          'POST /barber/bookings/:bookingId/reschedule',
          'POST /barber/bookings/:bookingId/no-show',
          'POST /barber/bookings/:bookingId/complete',
          'GET /barber/earnings',
          'GET /barber/services',
          'PUT /barber/services',
          'DELETE /barber/services/:serviceId',
          'PUT /barber/update-device-id',
          'DELETE /barber/push-token',
        ],
      },
      admin: {
        base: '/admin',
        note: 'Staff-only; see Firebase ID token + admin claims or ADMIN_UID_ALLOWLIST (middleware/adminAuth.ts).',
        endpoints: [
          'GET /admin/barbers',
          'GET /admin/barbers/:barberId',
          'PATCH /admin/barbers/:barberId/approval',
          'GET /admin/content/banner',
          'PUT /admin/content/banner',
          'GET /admin/stats/summary',
        ],
      },
      client: {
        base: '/client',
        endpoints: [
          'GET /client/getMe',
          'PUT /client/update',
          'PUT /client/update-avatar',
          'GET /client/booking-history',
          'GET /client/bookings',
          'POST /client/bookings',
          'GET /client/barber-bookings (deprecated alias of GET /client/bookings)',
          'POST /client/barber-bookings (deprecated alias of POST /client/bookings)',
          'POST /client/bookings/:bookingId/cancel',
          'POST /client/bookings/:bookingId/reschedule',
          'POST /client/bookings/:bookingId/review',
          'PUT /client/update-device-id',
          'DELETE /client/push-token',
          'GET /client/banner',
        ],
      },
      public: {
        endpoints: ['GET /services/catalog', 'GET /barbers/:barberId/reviews'],
      },
      notifications: {
        base: '/notifications',
        endpoints: [
          'GET /notifications',
          'PATCH /notifications/:notificationId/read',
          'POST /notifications/read-all',
        ],
      },
      trustAndSafety: {
        endpoints: ['POST /reports', 'POST /blocks', 'DELETE /blocks/:userId'],
      },
    },
    links: {
      documentation: `${req.protocol}://${req.get('host')}/docs`,
      openApiJson: `${req.protocol}://${req.get('host')}/docs.json`,
      health: `${req.protocol}://${req.get('host')}/health`,
    },
  });
});

// Metrics endpoint
router.get('/metrics', metricsHandler);

export default router;
