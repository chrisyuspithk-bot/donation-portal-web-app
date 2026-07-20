import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { redis } from '../config/redis';
import { NotificationService } from '../services/notificationService';
import { ReceiptService } from '../services/receiptService';

const broadcastSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  segment: z.object({
    min_total_donated: z.number().optional(),
    last_donation_days: z.number().optional(),
  }).optional(),
  scheduled_at: z.string().optional(),
});

export class AdminController {
  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const cacheKey = `analytics:daily:${days}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const dailyResult = await query(
        `SELECT date, total_donors, new_donors, average_gift, total_revenue, retention_rate
         FROM donor_analytics
         WHERE date >= CURRENT_DATE - INTERVAL '1 day' * $1
         ORDER BY date ASC`,
        [days]
      );

      const summaryResult = await query(`
        SELECT
          COUNT(DISTINCT donor_id) as total_donors,
          COALESCE(SUM(amount), 0) as total_revenue,
          COALESCE(AVG(amount), 0) as average_gift
        FROM donations WHERE status = 'completed'
      `);

      const data = {
        daily: dailyResult.rows,
        summary: {
          total_donors: parseInt(summaryResult.rows[0].total_donors, 10),
          total_revenue: parseFloat(summaryResult.rows[0].total_revenue),
          average_gift: parseFloat(summaryResult.rows[0].average_gift),
          churn_rate: 0, // computed by cron job
        },
      };

      await redis.set(cacheKey, JSON.stringify(data), 'EX', 300);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async getAllDonations(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 50;
      const status = req.query.status as string;
      const offset = (page - 1) * pageSize;

      let whereClause = '';
      const params: any[] = [];
      if (status && ['pending', 'completed', 'failed', 'refunded'].includes(status)) {
        whereClause = 'WHERE d.status = $1';
        params.push(status);
      }

      const countResult = await query(
        `SELECT COUNT(*) as total FROM donations d ${whereClause}`, params
      );
      const total = parseInt(countResult.rows[0].total, 10);

      params.push(pageSize, offset);
      const donationsResult = await query(
        `SELECT d.id, d.amount, d.currency, d.status, d.created_at,
                u.name as donor_name, u.email as donor_email
         FROM donations d
         JOIN donors dr ON dr.id = d.donor_id
         JOIN users u ON u.id = dr.user_id
         ${whereClause}
         ORDER BY d.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      res.json({ donations: donationsResult.rows, total, page, page_size: pageSize });
    } catch (err) {
      next(err);
    }
  }

  static async resendReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const { donation_ids } = req.body;
      if (!Array.isArray(donation_ids) || donation_ids.length === 0) {
        return res.status(400).json({ error: 'donation_ids array required' });
      }

      const result = await query(
        `SELECT d.id, d.amount, d.currency, d.created_at, u.email, u.name as donor_name
         FROM donations d
         JOIN donors dr ON dr.id = d.donor_id
         JOIN users u ON u.id = dr.user_id
         WHERE d.id = ANY($1)`,
        [donation_ids]
      );

      let sent = 0;
      for (const donation of result.rows) {
        await ReceiptService.generateAndEmailReceipt(donation);
        sent++;
      }

      res.json({ sent, total: donation_ids.length });
    } catch (err) {
      next(err);
    }
  }

  static async getActiveChatSessions(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await query(
        `SELECT dr.id as donor_id, u.id as user_id, u.name as donor_name, u.email,
                COALESCE(
                  (SELECT COUNT(*) FROM chat_messages
                   WHERE receiver_id = dr.id AND is_read = false), 0
                ) as unread_count
         FROM donors dr
         JOIN users u ON u.id = dr.user_id
         ORDER BY u.name ASC`
      );
      res.json({ sessions: result.rows });
    } catch (err) {
      next(err);
    }
  }

  static async getChatMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { donorId } = req.params;
      const result = await query(
        `SELECT sender_id, receiver_id, message, created_at
         FROM chat_messages
         WHERE receiver_id = $1
         ORDER BY created_at ASC
         LIMIT 200`,
        [donorId]
      );
      res.json({ messages: result.rows });
    } catch (err) {
      next(err);
    }
  }

  static async broadcastNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, body, segment, scheduled_at } = broadcastSchema.parse(req.body);

      let targetUsers: { id: string; fcm_token: string | null }[];

      if (segment) {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (segment.min_total_donated) {
          conditions.push(`dr.total_donated >= $${paramIdx++}`);
          params.push(segment.min_total_donated);
        }
        if (segment.last_donation_days) {
          conditions.push(`dr.last_donation_date >= CURRENT_DATE - INTERVAL '1 day' * $${paramIdx++}`);
          params.push(segment.last_donation_days);
        }

        const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await query(
          `SELECT u.id, u.fcm_token FROM users u
           JOIN donors dr ON dr.user_id = u.id ${whereSQL}`,
          params
        );
        targetUsers = result.rows;
      } else {
        const result = await query('SELECT id, fcm_token FROM users WHERE fcm_token IS NOT NULL');
        targetUsers = result.rows;
      }

      let sent = 0;
      for (const user of targetUsers) {
        if (!user.fcm_token) continue;
        try {
          await NotificationService.sendPush(user.fcm_token, title, body);
          await query(
            `INSERT INTO notification_logs (id, user_id, title, body, sent_via, status, sent_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'push', 'sent', NOW())`,
            [user.id, title, body]
          );
          sent++;
        } catch {
          await query(
            `INSERT INTO notification_logs (id, user_id, title, body, sent_via, status, sent_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'push', 'failed', NOW())`,
            [user.id, title, body]
          );
        }
      }

      res.json({ sent, total: targetUsers.length });
    } catch (err) {
      next(err);
    }
  }

  static async eraseDonor(req: Request, res: Response, next: NextFunction) {
    try {
      const { donorId } = req.params;

      // Anonymize user data (GDPR/CCPA compliance)
      const donorResult = await query('SELECT user_id FROM donors WHERE id = $1', [donorId]);
      if (donorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Donor not found' });
      }

      const userId = donorResult.rows[0].user_id;
      await query(
        `UPDATE users SET email = $1, name = 'Anonymized User', fcm_token = NULL WHERE id = $2`,
        [`anonymized-${userId}@deleted.local`, userId]
      );
      await query('DELETE FROM chat_messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      await query('DELETE FROM notification_logs WHERE user_id = $1', [userId]);

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}
