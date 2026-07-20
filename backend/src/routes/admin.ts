import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { AdminController } from '../controllers/adminController';

export const adminRouter = Router();

adminRouter.use(authenticate, adminOnly);

adminRouter.get('/analytics', AdminController.getAnalytics);
adminRouter.get('/donations', AdminController.getAllDonations);
adminRouter.post('/receipts/resend', AdminController.resendReceipts);
adminRouter.get('/chat/sessions', AdminController.getActiveChatSessions);
adminRouter.post('/notifications/broadcast', AdminController.broadcastNotification);
adminRouter.delete('/donors/:donorId/erase', AdminController.eraseDonor);
