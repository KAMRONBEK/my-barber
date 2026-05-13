import { Request, Response, NextFunction } from 'express';
import { Histogram, Summary, register } from 'prom-client';

// Create metrics
const httpRequestDuration = new Histogram({
  name: 'barber_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestSummary = new Summary({
  name: 'barber_http_requests',
  help: 'HTTP request summary',
  labelNames: ['method', 'route', 'status'],
  percentiles: [0.5, 0.9, 0.99],
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestSummary);

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Capture the original end function
  const originalEnd = res.end;

  // Override the end function to capture metrics
  res.end = function (chunk?: any, encoding?: any): Response {
    // Calculate duration
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode;
    const method = req.method;
    const route = req.route?.path || req.path;

    // Record metrics
    httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);

    httpRequestSummary
      .labels(method, route, statusCode.toString())
      .observe(duration);

    // Call the original end function and return its result
    return originalEnd.call(this, chunk, encoding) as Response;
  };

  next();
};

export const metricsHandler = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};
