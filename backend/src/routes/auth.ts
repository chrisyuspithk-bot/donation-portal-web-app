import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthController } from '../controllers/authController';

export const authRouter = Router();

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.get('/me', authenticate, AuthController.me);
authRouter.post('/register-token', authenticate, AuthController.registerFcmToken);
