import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  let statusCode = 500;
  let message = 'Internal Server Error';

  if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.message.includes('duplicate key')) {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (
    error.message.includes('Unexpected token') &&
    error.message.includes('JSON')
  ) {
    // Handle JSON parsing errors specifically
    statusCode = 400;
    message =
      'Invalid JSON format. Please check your request body for malformed JSON or ensure the data is properly encoded.';

    // Log additional details for debugging
    logger.error('JSON parsing error details:', {
      originalError: error.message,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      bodySize: req.body ? JSON.stringify(req.body).length : 'undefined',
    });
  } else if (error.message.includes('request entity too large')) {
    statusCode = 413;
    message = 'Request body too large. Maximum size is 4MB.';
  }

  res.status(statusCode).json({
    ok: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const createApiError = (
  message: string,
  statusCode: number = 500
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
