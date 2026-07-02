import { Router, Request, Response } from 'express';
import { bookingService } from '../services/bookingService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * How far ahead of "now" to look for bookings needing the arrival check-in reminder.
 * Kept larger than the expected cron tick interval (~5 min) so overlapping ticks
 * always cover the full lead time with no uncovered gap; `reminderSentAt` (claimed
 * transactionally in bookingService.claimReminderSlot) is the sole de-dupe guard.
 */
const REMINDER_LOOKAHEAD_MINUTES = 7;

/**
 * GET /cron/booking-reminders
 *
 * Intended to be hit every ~5 minutes by a scheduler (Vercel Cron, or an external
 * scheduler if the Vercel plan tier doesn't support minute-level cron — see vercel.json).
 * Finds bookings starting within the lookahead window and fires the "are you here?" /
 * "is the client here?" reminder for each, exactly once.
 */
router.get('/booking-reminders', async (req: Request, res: Response) => {
  try {
    const windowEnd = new Date(
      Date.now() + REMINDER_LOOKAHEAD_MINUTES * 60_000
    );

    const candidateIds =
      await bookingService.findBookingsDueForReminder(windowEnd);

    let processed = 0;
    for (const bookingId of candidateIds) {
      const claimed = await bookingService.claimReminderSlot(bookingId);
      if (!claimed) continue;

      await bookingService.sendUpcomingCheckinReminder(bookingId);
      processed += 1;
    }

    logger.info('Booking reminder cron run complete', {
      candidates: candidateIds.length,
      processed,
    });

    res.json({ ok: true, data: { processed } });
  } catch (error) {
    logger.error('Error running booking-reminders cron:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
