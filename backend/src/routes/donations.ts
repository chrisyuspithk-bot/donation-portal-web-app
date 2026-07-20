import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { DonationsController } from '../controllers/donationsController';

export const donationsRouter = Router();

donationsRouter.use(authenticate);
donationsRouter.post('/create-intent', DonationsController.createIntent);
donationsRouter.get('/confirm/:intentId', DonationsController.confirmPayment);
donationsRouter.get('/history/:donorId', DonationsController.history);
