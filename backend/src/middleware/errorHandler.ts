import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error('Unhandled error:', err);

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: (err as any).errors });
  }

  if (err.name === 'StripeError') {
    return res.status(402).json({ error: 'Payment processing error', message: err.message });
  }

  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
  });
}
