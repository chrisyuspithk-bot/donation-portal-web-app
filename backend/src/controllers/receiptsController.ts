import { Request, Response, NextFunction } from 'express';
import { ReceiptService } from '../services/receiptService';
import { query } from '../config/database';

export class ReceiptsController {
  static async getReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { donationId } = req.params;
      const result = await query(
        'SELECT r.pdf_url, r.receipt_number FROM receipts r WHERE r.donation_id = $1',
        [donationId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }

  static async downloadReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { donationId } = req.params;
      const result = await query(
        `SELECT d.id, d.amount, d.currency, d.created_at, u.name as donor_name, u.email
         FROM donations d
         JOIN donors dr ON dr.id = d.donor_id
         JOIN users u ON u.id = dr.user_id
         WHERE d.id = $1`,
        [donationId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      const donation = result.rows[0];
      const pdfBuffer = await ReceiptService.generateReceiptPdf(donation);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="receipt-${donationId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }
}
