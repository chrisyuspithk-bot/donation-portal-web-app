import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { logger } from '../config/logger';
import { getIO } from '../websocket';

interface DonationReceiptData {
  id: string;
  amount: number;
  currency: string;
  created_at: Date;
  donor_name: string;
  email: string;
}

export class ReceiptService {
  static async generateReceiptPdf(donation: DonationReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Donation Receipt', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Receipt #${uuidv4().slice(0, 8).toUpperCase()}`, { align: 'center' });
      doc.moveDown(1);

      // Separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
      doc.moveDown(1);

      // Details
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Donor Information');
      doc.font('Helvetica').fontSize(10);
      doc.text(`Name: ${donation.donor_name}`);
      doc.text(`Email: ${donation.email}`);
      doc.text(`Date: ${new Date(donation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Donation Details');
      doc.font('Helvetica').fontSize(10);
      doc.text(`Amount: ${(donation.amount / 100).toLocaleString('en-US', { style: 'currency', currency: donation.currency.toUpperCase() })}`);
      doc.text(`Currency: ${donation.currency.toUpperCase()}`);
      doc.text(`Transaction ID: ${donation.id}`);
      doc.moveDown(2);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
      doc.moveDown(1);

      doc.fontSize(8).font('Helvetica').fillColor('#888888');
      doc.text('This receipt was generated automatically. For questions, please contact support@fundraising.local.', { align: 'center' });

      doc.end();
    });
  }

  static async generateAndEmailReceipt(donation: DonationReceiptData): Promise<void> {
    try {
      const pdfBuffer = await this.generateReceiptPdf(donation);
      const receiptNumber = `RCPT-${uuidv4().slice(0, 8).toUpperCase()}`;

      // In production, upload to S3/Cloudinary and get URL
      const pdfUrl = `https://storage.example.com/receipts/${donation.id}.pdf`;

      // Upsert receipt record
      await query(
        `INSERT INTO receipts (id, donation_id, receipt_number, pdf_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (donation_id) DO UPDATE SET pdf_url = $4`,
        [uuidv4(), donation.id, receiptNumber, pdfUrl]
      );

      // In production, email the receipt to donation.email
      logger.info(`Receipt ${receiptNumber} generated for donation ${donation.id}`);

      // Emit socket event to notify the donor
      try {
        const donorResult = await query(
          'SELECT dr.user_id FROM donors dr WHERE dr.id = (SELECT donor_id FROM donations WHERE id = $1)',
          [donation.id]
        );
        if (donorResult.rows.length > 0) {
          const io = getIO();
          io.to(`user:${donorResult.rows[0].user_id}`).emit('notification:receipt_ready', {
            donation_id: donation.id,
            receipt_url: pdfUrl,
          });
        }
      } catch (err) {
        logger.error('Failed to emit receipt ready event:', err);
      }
    } catch (err) {
      logger.error('Failed to generate receipt:', err);
      throw err;
    }
  }
}
