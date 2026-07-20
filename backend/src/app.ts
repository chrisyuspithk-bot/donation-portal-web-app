import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './config/logger';
import { authRouter } from './routes/auth';
import { donationsRouter } from './routes/donations';
import { receiptsRouter } from './routes/receipts';
import { adminRouter } from './routes/admin';
import { webhooksRouter } from './routes/webhooks';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Stripe webhook needs raw body — must be before express.json()
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((_req, _res, next) => {
  logger.debug(`${_req.method} ${_req.path}`);
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/admin', adminRouter);
app.use('/webhooks', webhooksRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export { app };
