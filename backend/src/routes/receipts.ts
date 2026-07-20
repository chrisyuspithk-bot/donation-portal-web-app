import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ReceiptsController } from '../controllers/receiptsController';

export const receiptsRouter = Router();

receiptsRouter.use(authenticate);
receiptsRouter.get('/:donationId', ReceiptsController.getReceipt);
receiptsRouter.get('/:donationId/download', ReceiptsController.downloadReceipt);
