import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { SERVICE_CATALOG_DEFAULT } from '../services/catalog';
import { reviewService } from '../services/reviewService';

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

router.get('/services/catalog', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      services: SERVICE_CATALOG_DEFAULT.map(s => ({
        id: s.id,
        name: s.name,
        default_duration_minutes: s.default_duration_minutes,
      })),
    },
  });
});

router.get(
  '/barbers/:barberId/reviews',
  [
    param('barberId').notEmpty(),
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const barberId = req.params.barberId;
      const cursor = (req.query.cursor as string) || undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await reviewService.listReviewsForBarber(
        barberId,
        cursor,
        limit
      );

      res.json({
        ok: true,
        data: {
          items: result.items,
          next_cursor: result.next_cursor,
        },
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

export default router;
