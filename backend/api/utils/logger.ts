import winston from 'winston';
import { config } from '../config/config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
);

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: {},
  transports: [
    // Console transport - primary logging for Vercel
    new winston.transports.Console({
      format: config.nodeEnv === 'production' ? logFormat : consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Vercel-specific logging - NO file logging on serverless platforms
if (config.nodeEnv === 'production') {
  // Simplified production startup message
  logger.info('🚀 Production logging enabled');
} else {
  // Local development file logging (optional)
  try {
    logger.add(
      new winston.transports.File({
        filename: 'logs/development.log',
        level: 'debug',
        maxsize: 5242880, // 5MB
        maxFiles: 3,
        tailable: true,
      })
    );
    logger.info('📁 Development file logging enabled');
  } catch (error) {
    logger.warn(
      '📁 File logging unavailable (normal for serverless environments)'
    );
  }
}

// Export utilities
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Enhanced logging for serverless debugging
export const logRequest = (req: any, additionalData?: any) => {
  logger.info('📨 Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

export const logResponse = (
  res: any,
  duration: number,
  additionalData?: any
) => {
  logger.info('📤 Response sent', {
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

// Health check for logging system
export const testLogging = () => {
  logger.info('🧪 Logging system test - INFO level');
  logger.warn('🧪 Logging system test - WARN level');
  logger.error('🧪 Logging system test - ERROR level');
  logger.debug('🧪 Logging system test - DEBUG level');
};
