import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { barberService } from '../services/barberService';
import { adminService } from '../services/adminService';
import { logger } from '../utils/logger';
import { BarberApprovalStatus } from '../models/barber';

const router = Router();

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
 * /admin/barbers:
 *   get:
 *     summary: List barbers (moderation)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: approvalStatus
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, suspended]
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated barbers (no passwords)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBarberListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden — not admin
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
router.get(
  '/barbers',
  [
    query('approvalStatus')
      .optional()
      .isIn(['pending', 'approved', 'rejected', 'suspended']),
    query('page').optional().isInt({ min: 0 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req: Request, res: Response) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const approvalStatus = req.query.approvalStatus as
        | BarberApprovalStatus
        | undefined;
      const page = Number(req.query.page ?? 0);
      const limit = Number(req.query.limit ?? 20);
      const result = await barberService.listBarbersForAdmin({
        approvalStatus,
        page: Number.isFinite(page) ? page : 0,
        limit: Number.isFinite(limit) ? limit : 20,
      });
      res.json({ ok: true, data: result });
    } catch (error) {
      logger.error('Admin list barbers:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /admin/barbers/{barberId}:
 *   get:
 *     summary: Get a single barber (admin)
 *     tags: [Admin]
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
 *         description: Barber profile (no password)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     barber:
 *                       $ref: '#/components/schemas/BarberResponse'
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Barber not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/barbers/:barberId',
  [param('barberId').notEmpty()],
  async (req: Request, res: Response) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const row = await barberService.getBarberByIdForAdmin(
        req.params.barberId
      );
      if (!row) {
        res.status(404).json({ ok: false, error: 'Barber not found' });
        return;
      }
      res.json({ ok: true, data: row });
    } catch (error) {
      logger.error('Admin get barber:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /admin/barbers/{barberId}/approval:
 *   patch:
 *     summary: Update barber approval status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminApprovalPatchBody'
 *     responses:
 *       200:
 *         description: Updated barber profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BarberResponse'
 *       400:
 *         description: Invalid transition or validation
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/barbers/:barberId/approval',
  [
    param('barberId').notEmpty(),
    body('status').isIn(['approved', 'rejected', 'suspended']),
    body('message').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const barber = await barberService.setBarberApproval(
        req.params.barberId,
        {
          status: req.body.status,
          message: req.body.message,
        }
      );
      res.json({ ok: true, data: barber });
    } catch (error) {
      const err = error as Error & { statusCode?: number };
      if (err.statusCode === 404) {
        res.status(404).json({ ok: false, error: err.message });
        return;
      }
      if (err.statusCode === 400) {
        res.status(400).json({ ok: false, error: err.message });
        return;
      }
      logger.error('Admin set approval:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /admin/content/banner:
 *   get:
 *     summary: Get CMS banner doc
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Banner config (or empty defaults)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CmsBannerDoc'
 *   put:
 *     summary: Upsert CMS banner doc
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CmsBannerDocInput'
 *     responses:
 *       200:
 *         description: Saved banner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CmsBannerDoc'
 */
router.get('/content/banner', async (_req: Request, res: Response) => {
  try {
    const data = await adminService.getCmsBanner();
    res.json({ ok: true, data: data ?? {} });
  } catch (error) {
    logger.error('Admin get banner:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.put(
  '/content/banner',
  [
    body('title').optional().isString(),
    body('body').optional().isString(),
    body('imageRef').optional().isString(),
    body('active').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const data = await adminService.setCmsBanner(req.body);
      res.json({ ok: true, data });
    } catch (error) {
      logger.error('Admin put banner:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

/**
 * @swagger
 * /admin/stats/summary:
 *   get:
 *     summary: Aggregated stats (barbers by approval, recent bookings)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AdminStatsSummary'
 */
router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const data = await adminService.getAdminStatsSummary();
    res.json({ ok: true, data });
  } catch (error) {
    logger.error('Admin stats summary:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
