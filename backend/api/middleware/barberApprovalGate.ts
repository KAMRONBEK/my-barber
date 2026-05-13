import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { barberService } from '../services/barberService';

/** Paths on barber router reachable before admin approval */
const ALLOW_WITHOUT_APPROVAL = new Set([
  '/',
  '/getMe',
  '/update',
  '/update-credentials',
  '/update-avatar',
  '/add-image',
  '/update-device-id',
]);

export async function barberApprovalGate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.user?.type !== 'barber') {
      next();
      return;
    }

    const pathOnly = req.path.split('?')[0];
    if (ALLOW_WITHOUT_APPROVAL.has(pathOnly)) {
      next();
      return;
    }

    const barber = await barberService.getBarberById(req.user.id);
    const status = barber?.approvalStatus ?? 'approved';

    if (status !== 'approved') {
      res.status(403).json({
        ok: false,
        error: 'Your barber account is not approved for this action yet.',
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
