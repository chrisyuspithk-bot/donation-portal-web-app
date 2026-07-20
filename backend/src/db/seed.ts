import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { logger } from '../config/logger';

async function seed() {
  // --- Admin user ---
  const adminId = uuidv4();
  const adminHash = await bcrypt.hash('admin123', 12);
  await query(
    `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash`,
    [adminId, 'admin@admin.fundraising.local', 'Admin User', adminHash]
  );
  logger.info('Admin user seeded: admin@admin.fundraising.local / admin123');

  // --- Donor user ---
  const donorUserId = uuidv4();
  const donorHash = await bcrypt.hash('donor123', 12);
  await query(
    `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash`,
    [donorUserId, 'donor@example.com', 'Jane Donor', donorHash]
  );

  const donorRecordId = uuidv4();
  await query(
    `INSERT INTO donors (id, user_id, total_donated, donor_rank, lifetime_value) VALUES ($1, $2, 0, 0, 0)
     ON CONFLICT (id) DO NOTHING`,
    [donorRecordId, donorUserId]
  );
  logger.info('Donor user seeded: donor@example.com / donor123');

  logger.info('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
