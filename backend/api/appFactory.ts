import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { register, collectDefaultMetrics } from 'prom-client';

import { config } from './config/config';
import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware } from './middleware/metrics';
import swaggerSpec from './public/swagger.json';

import barberRoutes from './routes/barber';
import clientRoutes from './routes/client';
import authRoutes from './routes/auth';
import systemRoutes from './routes/system';
import testRoutes from './routes/test';
import publicRoutes from './routes/public';
import notificationRoutes from './routes/notifications';
import trustRoutes from './routes/trust';
import { barberApprovalGate } from './middleware/barberApprovalGate';
import { adminAuthMiddleware } from './middleware/adminAuth';
import adminRoutes from './routes/admin';
import { createSharedRedisRateLimitStore } from './middleware/rateLimitRedis';

/**
 * Build Express app without listen(), DB bootstrap, or process-level handlers.
 * Used by server.ts (production) and integration tests.
 */
export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);

  if (process.env.NODE_ENV !== 'test') {
    collectDefaultMetrics({ register });
  }

  app.use(
    cors({
      origin: '*',
      credentials: true,
    })
  );

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.rateLimitMax,
    message: 'Too many requests from this IP',
    ...(config.redisUrl && process.env.NODE_ENV !== 'test'
      ? { store: createSharedRedisRateLimitStore(config.redisUrl) }
      : {}),
  });
  app.use(limiter);

  app.use(compression() as unknown as express.RequestHandler);
  app.use(
    morgan('combined', {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
    })
  );

  app.use(
    express.json({
      limit: '4mb',
      verify: (req, _res, buf) => {
        if (buf.length > 1024 * 1024) {
          logger.debug('Large JSON request received', {
            url: req.url,
            method: req.method,
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length'],
            bodySize: buf.length,
          });
        }
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));

  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      logger.error('JSON parsing error caught:', {
        error: error.message,
        url: req.url,
        method: req.method,
        contentType: req.get('content-type'),
        contentLength: req.get('content-length'),
      });

      return res.status(400).json({
        ok: false,
        error:
          'Invalid JSON format. Please check your request body for malformed JSON or ensure base64 data is properly formatted.',
        details:
          process.env.NODE_ENV === 'development'
            ? {
                parseError: error.message,
              }
            : undefined,
      });
    }
    next(error);
  });

  app.use(metricsMiddleware);

  app.get('/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(swaggerSpec);
  });

  app.get('/docs', (_req: Request, res: Response) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Barber API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b4151; }
    .swagger-ui .scheme-container { margin: 0 0 20px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        docExpansion: "list",
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>
  `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  app.use('/', systemRoutes);
  app.use(publicRoutes);
  app.use('/test', testRoutes);
  app.use('/auth', authRoutes);
  app.use('/admin', adminAuthMiddleware, adminRoutes);
  app.use(trustRoutes);
  app.use('/notifications', authMiddleware, notificationRoutes);
  // Alias so clients that call /client/notifications also work
  app.use('/client/notifications', authMiddleware, notificationRoutes);
  app.use('/barber', authMiddleware, barberApprovalGate, barberRoutes);
  app.use('/client', authMiddleware, clientRoutes);
  app.use('/barbers', authMiddleware, barberApprovalGate, barberRoutes);

  app.use(errorHandler);

  return app;
}
