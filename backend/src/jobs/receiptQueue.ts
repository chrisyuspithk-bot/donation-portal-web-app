import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { ReceiptService } from '../services/receiptService';
import { query } from '../config/database';
import { logger } from '../config/logger';

const RECEIPT_QUEUE = 'receipt-generation';

const receiptWorker = new Worker(
  RECEIPT_QUEUE,
  async (job: Job) => {
    const { donationId } = job.data;

    const result = await query(
      `SELECT d.id, d.amount, d.currency, d.created_at, u.name as donor_name, u.email
       FROM donations d
       JOIN donors dr ON dr.id = d.donor_id
       JOIN users u ON u.id = dr.user_id
       WHERE d.id = $1`,
      [donationId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Donation ${donationId} not found`);
    }

    await ReceiptService.generateAndEmailReceipt(result.rows[0]);
    logger.info(`Receipt generated for donation ${donationId}`);
  },
  {
    connection: redis,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

receiptWorker.on('failed', (job, err) => {
  logger.error(`Receipt job failed for ${job?.data?.donationId}:`, err);
});

export async function addReceiptJob(donation: { id: string; donor_id: string; amount: number; currency: string }) {
  const queue = new Queue(RECEIPT_QUEUE, { connection: redis });
  await queue.add('generate-receipt', { donationId: donation.id });
  await queue.close();
}
