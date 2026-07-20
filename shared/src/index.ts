// ---- Database Entity Types ----

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  stripe_customer_id: string | null;
  fcm_token: string | null;
  created_at: Date;
}

export interface Donor {
  id: string;
  user_id: string;
  total_donated: number;
  last_donation_date: Date | null;
  donor_rank: number;
  lifetime_value: number;
}

export interface Donation {
  id: string;
  donor_id: string;
  amount: number;
  currency: string;
  stripe_payment_intent_id: string;
  status: DonationStatus;
  created_at: Date;
}

export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Receipt {
  id: string;
  donation_id: string;
  receipt_number: string;
  pdf_url: string | null;
  emailed_at: Date | null;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  title: string;
  body: string;
  sent_via: 'push' | 'email';
  status: 'sent' | 'failed' | 'queued';
  sent_at: Date;
}

export interface DonorAnalytics {
  date: string;
  total_donors: number;
  new_donors: number;
  average_gift: number;
  total_revenue: number;
  retention_rate: number;
}

// ---- API Request/Response Types ----

export interface AuthRegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  donor_id: string;
}

export interface CreatePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

export interface DonationHistoryResponse {
  donations: Donation[];
  total: number;
  page: number;
  page_size: number;
}

export interface AnalyticsResponse {
  daily: DonorAnalytics[];
  summary: {
    total_donors: number;
    total_revenue: number;
    average_gift: number;
    churn_rate: number;
  };
}

export interface BroadcastNotificationRequest {
  title: string;
  body: string;
  segment?: {
    min_total_donated?: number;
    last_donation_days?: number;
  };
  scheduled_at?: string;
}

// ---- WebSocket Event Types ----

export interface WsDonationEvent {
  type: 'donation:live';
  payload: {
    donor_name: string;
    amount: number;
    currency: string;
    status: DonationStatus;
    created_at: string;
  };
}

export interface WsChatEvent {
  type: 'chat:send_message';
  payload: {
    sender_id: string;
    receiver_id: string;
    message: string;
    created_at: string;
  };
}

export interface WsTypingEvent {
  type: 'chat:typing';
  payload: {
    sender_id: string;
    receiver_id: string;
    is_typing: boolean;
  };
}

export interface WsReceiptReadyEvent {
  type: 'notification:receipt_ready';
  payload: {
    donation_id: string;
    receipt_url: string;
  };
}

export type WsEvent = WsDonationEvent | WsChatEvent | WsTypingEvent | WsReceiptReadyEvent;

export interface DonorSegment {
  min_total_donated?: number;
  last_donation_days?: number;
}
