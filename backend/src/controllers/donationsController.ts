import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StripeService } from '../services/stripeService';
import { query } from '../config/database';

const createIntentSchema = z.object({
  amount: z.number().positive().int(),
  currency: z.string().length(3).default('usd'),
  donor_id: z.string().uuid(),
});

export class DonationsController {
  static async createIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, currency, donor_id } = createIntentSchema.parse(req.body);
      const { client_secret, payment_intent_id } = await StripeService.createPaymentIntent(
        amount,
        currency,
        donor_id
      );
      res.json({ client_secret, payment_intent_id });
    } catch (err) {
      next(err);
    }
  }

  static async confirmPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { intentId } = req.params;
      const result = await query(
        `SELECT d.id, d.amount, d.currency, d.status, d.created_at, r.pdf_url
         FROM donations d
         LEFT JOIN receipts r ON r.donation_id = d.id
         WHERE d.stripe_payment_intent_id = $1`,
        [intentId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      const donation = result.rows[0];
      res.json({
        id: donation.id,
        amount: donation.amount,
        currency: donation.currency,
        status: donation.status,
        receipt_url: donation.pdf_url,
        created_at: donation.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const { donorId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;
      const offset = (page - 1) * pageSize;

      const countResult = await query(
        'SELECT COUNT(*) as total FROM donations WHERE donor_id = $1',
        [donorId]
      );
      const total = parseInt(countResult.rows[0].total, 10);

      const donationsResult = await query(
        `SELECT d.id, d.amount, d.currency, d.status, d.created_at, r.pdf_url as receipt_url
         FROM donations d
         LEFT JOIN receipts r ON r.donation_id = d.id
         WHERE d.donor_id = $1
         ORDER BY d.created_at DESC
         LIMIT $2 OFFSET $3`,
        [donorId, pageSize, offset]
      );

      res.json({
        donations: donationsResult.rows,
        total,
        page,
        page_size: pageSize,
      });
    } catch (err) {
      next(err);
    }
  }
}
