import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { config } from '../config';
import { query } from '../config/database';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const fcmTokenSchema = z.object({
  fcm_token: z.string().min(1),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = registerSchema.parse(req.body);
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const password_hash = await bcrypt.hash(password, 12);
      const id = uuidv4();
      await query(
        'INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)',
        [id, email, name, password_hash]
      );
      const donorId = uuidv4();
      await query(
        'INSERT INTO donors (id, user_id, total_donated, donor_rank, lifetime_value) VALUES ($1, $2, 0, 0, 0)',
        [donorId, id]
      );
      const token = jwt.sign({ userId: id, email }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
      } as any);
      res.status(201).json({
        token,
        user: { id, email, name, stripe_customer_id: null, fcm_token: null, created_at: new Date().toISOString() },
        donor_id: donorId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await query(
        `SELECT u.id, u.email, u.name, u.password_hash, u.stripe_customer_id, u.fcm_token, u.created_at,
                d.id as donor_id
         FROM users u
         LEFT JOIN donors d ON d.user_id = u.id
         WHERE u.email = $1`,
        [email]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as any
      );
      const { password_hash, donor_id, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword, donor_id });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await query(
        `SELECT u.id, u.email, u.name, u.stripe_customer_id, u.fcm_token, u.created_at,
                d.id as donor_id, d.total_donated, d.donor_rank, d.lifetime_value
         FROM users u
         LEFT JOIN donors d ON d.user_id = u.id
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const row = result.rows[0];
      res.json({
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          stripe_customer_id: row.stripe_customer_id,
          fcm_token: row.fcm_token,
          created_at: row.created_at,
        },
        donor_id: row.donor_id,
        donor: row.donor_id ? {
          id: row.donor_id,
          total_donated: row.total_donated,
          donor_rank: row.donor_rank,
          lifetime_value: row.lifetime_value,
        } : null,
      });
    } catch (err) {
      next(err);
    }
  }

  static async registerFcmToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { fcm_token } = fcmTokenSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcm_token, userId]);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}
