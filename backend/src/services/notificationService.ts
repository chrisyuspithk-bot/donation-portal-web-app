import { config } from '../config';
import { logger } from '../config/logger';

let admin: any = null;

function getFirebaseAdmin() {
  if (admin) return admin;

  // Lazy-load firebase-admin to avoid crash when not configured
  try {
    const fbAdmin = require('firebase-admin');
    if (fbAdmin.apps.length === 0) {
      fbAdmin.initializeApp({
        credential: fbAdmin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
    }
    admin = fbAdmin;
    return admin;
  } catch (err) {
    logger.warn('Firebase Admin not configured. Push notifications disabled.');
    return null;
  }
}

export class NotificationService {
  static async sendPush(token: string, title: string, body: string): Promise<void> {
    const fb = getFirebaseAdmin();
    if (!fb) {
      logger.info(`[PUSH DISABLED] Would send to ${token}: ${title} - ${body}`);
      return;
    }

    await fb.messaging().send({
      token,
      notification: { title, body },
      android: { priority: 'high' },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
            sound: 'default',
          },
        },
      },
    });
  }

  static async sendToUser(userId: string, title: string, body: string): Promise<boolean> {
    try {
      const { query } = require('../config/database');
      const result = await query('SELECT fcm_token FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0 || !result.rows[0].fcm_token) return false;

      await this.sendPush(result.rows[0].fcm_token, title, body);
      return true;
    } catch (err) {
      logger.error('Failed to send push to user:', err);
      return false;
    }
  }
}
