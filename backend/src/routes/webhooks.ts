import { Router } from 'express';
import { WebhooksController } from '../controllers/webhooksController';

export const webhooksRouter = Router();

webhooksRouter.post('/stripe', WebhooksController.handleStripe);
