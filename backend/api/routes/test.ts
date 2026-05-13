import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notificationService';

const router = Router();

// Test notification endpoint
router.post('/send-notification', async (req: Request, res: Response) => {
  try {
    const { deviceToken, title, body, data } = req.body;

    if (!deviceToken) {
      return res.status(400).json({
        ok: false,
        error: 'Device token is required',
      });
    }

    // Use custom title/body if provided, otherwise use defaults
    const notificationTitle = title || 'Test Notification 🧪';
    const notificationBody =
      body || 'This is a test notification from My Barber API! 📱';
    const notificationData = data || {
      type: 'test',
      timestamp: new Date().toISOString(),
    };

    logger.info('Sending test notification via POST', {
      deviceToken,
      title: notificationTitle,
      body: notificationBody,
    });

    // Create and send notification
    const message = notificationService.createMessage(
      deviceToken,
      notificationTitle,
      notificationBody,
      notificationData
    );

    await notificationService.sendNotification(message, deviceToken);

    res.json({
      ok: true,
      message: 'Test notification sent successfully',
      notification: {
        deviceToken,
        title: notificationTitle,
        body: notificationBody,
        data: notificationData,
      },
    });
  } catch (error) {
    logger.error('Error sending test notification via POST:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test logging endpoint
router.get('/logging', async (req: Request, res: Response) => {
  logger.info('🧪 Test logging endpoint called', {
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.ip,
    timestamp: new Date().toISOString(),
  });
  logger.warn('⚠️ Test warning message');
  logger.error('❌ Test error message (this is intentional for testing)');

  res.json({
    message: 'Logging test completed - check Vercel logs',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

export default router;
