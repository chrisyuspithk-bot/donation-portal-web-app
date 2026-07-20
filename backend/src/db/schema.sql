-- Fundraising SaaS Platform Database Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(100),
    fcm_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_donated BIGINT DEFAULT 0,
    last_donation_date TIMESTAMPTZ,
    donor_rank INTEGER DEFAULT 0,
    lifetime_value BIGINT DEFAULT 0
);

CREATE INDEX idx_donors_user_id ON donors(user_id);
CREATE INDEX idx_donors_total_donated ON donors(total_donated);

CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    stripe_payment_intent_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donations_donor_id ON donations(donor_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_pi_id ON donations(stripe_payment_intent_id);
CREATE INDEX idx_donations_created_at ON donations(created_at);

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID UNIQUE NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL,
    pdf_url TEXT,
    emailed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sender_receiver ON chat_messages(sender_id, receiver_id);
CREATE INDEX idx_chat_created_at ON chat_messages(created_at);

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    sent_via VARCHAR(10) NOT NULL CHECK (sent_via IN ('push', 'email')),
    status VARCHAR(10) NOT NULL DEFAULT 'queued' CHECK (status IN ('sent', 'failed', 'queued')),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donor_analytics (
    date DATE PRIMARY KEY,
    total_donors INTEGER DEFAULT 0,
    new_donors INTEGER DEFAULT 0,
    average_gift DECIMAL(12,2) DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    retention_rate DECIMAL(5,4) DEFAULT 0
);
