import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { getIO } from '../websocket';
import { addReceiptJob } from '../jobs/receiptQueue';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, { apiVersion: '2024-06-20' as any });
  }
  return stripeClient;
}

export class StripeService {
  static async createPaymentIntent(amount: number, currency: string, donorId: string) {
    const stripe = getStripe();

    // Ensure donor exists
    const donorResult = await query('SELECT id, user_id FROM donors WHERE id = $1', [donorId]);
    if (donorResult.rows.length === 0) {
      throw new Error('Donor not found');
    }

    // Get or create Stripe customer
    const userResult = await query('SELECT stripe_customer_id, email, name FROM users WHERE id = $1', [donorResult.rows[0].user_id]);
    const user = userResult.rows[0];

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, donorResult.rows[0].user_id]);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      customer: customerId,
      metadata: { donor_id: donorId },
      automatic_payment_methods: { enabled: true },
    });

    // Record pending donation
    const donationId = uuidv4();
    await query(
      `INSERT INTO donations (id, donor_id, amount, currency, stripe_payment_intent_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [donationId, donorId, amount, currency, paymentIntent.id]
    );

    return {
      client_secret: paymentIntent.client_secret!,
      payment_intent_id: paymentIntent.id,
    };
  }

  static verifyWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    const stripe = getStripe();
    return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  }

  static async handlePaymentSuccess(paymentIntentId: string) {
    logger.info(`Payment succeeded: ${paymentIntentId}`);

    const result = await query(
      `UPDATE donations SET status = 'completed'
       WHERE stripe_payment_intent_id = $1 AND status = 'pending'
       RETURNING id, donor_id, amount, currency`,
      [paymentIntentId]
    );

    if (result.rows.length === 0) {
      logger.warn(`No pending donation found for PI: ${paymentIntentId} (possible duplicate webhook)`);
      return;
    }

    const donation = result.rows[0];

    // Update donor stats
    await query(
      `UPDATE donors SET
        total_donated = total_donated + $1,
        last_donation_date = NOW(),
        lifetime_value = lifetime_value + $1,
        donor_rank = CASE
          WHEN total_donated + $1 > 100000 THEN 5
          WHEN total_donated + $1 > 50000 THEN 4
          WHEN total_donated + $1 > 10000 THEN 3
          WHEN total_donated + $1 > 1000 THEN 2
          ELSE 1
        END
       WHERE id = $2`,
      [donation.amount, donation.donor_id]
    );

    // Enqueue receipt generation
    await addReceiptJob(donation);

    // Emit real-time event to admin dashboard
    try {
      const donorInfo = await query(
        `SELECT u.name FROM users u JOIN donors dr ON dr.user_id = u.id WHERE dr.id = $1`,
        [donation.donor_id]
      );
      const donorName = donorInfo.rows[0]?.name || 'Anonymous';

      const io = getIO();
      io.to('admin:dashboard').emit('donation:live', {
        donor_name: donorName,
        amount: donation.amount,
        currency: donation.currency,
        status: 'completed',
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('Failed to emit live donation event:', err);
    }
  }

  static async handlePaymentFailure(paymentIntentId: string) {
    logger.info(`Payment failed: ${paymentIntentId}`);
    await query(
      `UPDATE donations SET status = 'failed'
       WHERE stripe_payment_intent_id = $1 AND status = 'pending'`,
      [paymentIntentId]
    );
  }

  static async getDonationByPaymentIntent(paymentIntentId: string) {
    const result = await query(
      'SELECT * FROM donations WHERE stripe_payment_intent_id = $1',
      [paymentIntentId]
    );
    return result.rows[0] || null;
  }
}
