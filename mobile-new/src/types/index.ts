export interface User {
  id: string;
  email: string;
  name: string;
  stripe_customer_id: string | null;
  fcm_token: string | null;
  created_at: string;
}

export interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  receipt_url?: string | null;
}

export interface DonationHistory {
  donations: Donation[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaymentIntent {
  client_secret: string;
  payment_intent_id: string;
}

export interface PaymentConfirmation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  created_at: string;
}

export interface Receipt {
  pdf_url: string | null;
  receipt_number: string;
}

export interface ChatMessage {
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
  donor_id: string | null;
  donor: {
    id: string;
    total_donated: number;
    donor_rank: number;
    lifetime_value: number;
  } | null;
}
