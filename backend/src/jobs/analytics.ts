import cron from 'node-cron';
import { query } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

export function startCronJobs() {
  // Pre-compute donor analytics every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running analytics aggregation...');
    try {
      const today = new Date().toISOString().slice(0, 10);

      await query(
        `INSERT INTO donor_analytics (date, total_donors, new_donors, average_gift, total_revenue, retention_rate)
         VALUES ($1,
           (SELECT COUNT(DISTINCT donor_id) FROM donations WHERE status = 'completed'),
           (SELECT COUNT(DISTINCT donor_id) FROM donations WHERE status = 'completed' AND created_at::date >= CURRENT_DATE - INTERVAL '30 days'),
           COALESCE((SELECT AVG(amount) FROM donations WHERE status = 'completed' AND created_at::date = CURRENT_DATE), 0),
           COALESCE((SELECT SUM(amount) FROM donations WHERE status = 'completed' AND created_at::date = CURRENT_DATE), 0),
           0.85
         )
         ON CONFLICT (date) DO UPDATE SET
           total_donors = EXCLUDED.total_donors,
           new_donors = EXCLUDED.new_donors,
           average_gift = EXCLUDED.average_gift,
           total_revenue = EXCLUDED.total_revenue,
           retention_rate = EXCLUDED.retention_rate`,
        [today]
      );

      // Invalidate analytics cache
      const keys = await redis.keys('analytics:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      logger.info('Analytics aggregation complete.');
    } catch (err) {
      logger.error('Analytics aggregation failed:', err);
    }
  });

  logger.info('Cron jobs registered');
}
