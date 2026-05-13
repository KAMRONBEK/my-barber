import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { notificationInboxService } from '../services/notificationInboxService';

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

router.get(
  '/',
  [
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = (req as any).user;
      const recipientType = user.type === 'barber' ? 'barber' : 'client';

      const cursor = (req.query.cursor as string) || undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const data = await notificationInboxService.listForUser(
        user.id,
        recipientType,
        cursor,
        limit
      );

      res.json({ ok: true, data });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.patch(
  '/:notificationId/read',
  [param('notificationId').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = (req as any).user;
      const recipientType = user.type === 'barber' ? 'barber' : 'client';

      const ok = await notificationInboxService.markRead(
        user.id,
        recipientType,
        req.params.notificationId
      );

      if (!ok) {
        return res.status(404).json({ ok: false, error: 'Not found' });
      }

      res.json({ ok: true, data: {} });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const recipientType = user.type === 'barber' ? 'barber' : 'client';

    await notificationInboxService.markAllRead(user.id, recipientType);
    res.json({ ok: true, data: {} });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
