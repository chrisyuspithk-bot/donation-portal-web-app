import { Request, Response, NextFunction } from 'express';
import { StripeService } from '../services/stripeService';
import { logger } from '../config/logger';

export class WebhooksController {
  static async handleStripe(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      const event = StripeService.verifyWebhook(req.body, signature);

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          await StripeService.handlePaymentSuccess(paymentIntent.id);
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          await StripeService.handlePaymentFailure(paymentIntent.id);
          break;
        }
        default:
          logger.info(`Unhandled Stripe event: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
}
