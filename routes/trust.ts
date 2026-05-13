import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { trustService } from '../services/trustService';
import { blockService } from '../services/blockService';

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

router.post(
  '/reports',
  authMiddleware,
  [
    body('target_type').isIn(['barber', 'client', 'booking', 'review']),
    body('target_id').notEmpty(),
    body('reason').notEmpty(),
    body('description').optional().isString(),
    body('attachments').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = (req as any).user;
      const report = await trustService.createReport({
        reporterId: user.id,
        reporterType: user.type,
        target_type: req.body.target_type,
        target_id: req.body.target_id,
        reason: req.body.reason,
        description: req.body.description ?? '',
        attachments: req.body.attachments ?? [],
      });

      res.status(201).json({
        ok: true,
        data: { report },
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.post(
  '/blocks',
  authMiddleware,
  [body('blocked_user_id').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = (req as any).user;
      const blockedId = req.body.blocked_user_id as string;

      await blockService.addBlock(user.id, blockedId);

      res.status(201).json({ ok: true, data: {} });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INVALID') {
        return res
          .status(400)
          .json({ ok: false, error: 'Invalid block request' });
      }
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

router.delete(
  '/blocks/:userId',
  authMiddleware,
  [param('userId').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const user = (req as any).user;
      const removed = await blockService.removeBlock(
        user.id,
        req.params.userId
      );

      if (!removed) {
        return res.status(404).json({ ok: false, error: 'Block not found' });
      }

      res.json({ ok: true, data: {} });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
);

export default router;
