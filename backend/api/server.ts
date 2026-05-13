// Import required packages
import 'express-async-errors';

import { createApp } from './appFactory';
import { connectDatabase } from './config/database';
import { config } from './config/config';
import { logger } from './utils/logger';

const app = createApp();

connectDatabase().catch(error => {
  logger.error('Database connection failed:', error);
});

process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const port = config.port || 8080;
  app.listen(port, () => {
    logger.info(`🚀 Server listening on port ${port}`);
    logger.info(`🌍 Environment: ${config.nodeEnv}`);
    logger.info(`🔗 CORS: ${config.corsOrigin}`);
  });
}

export default app;
