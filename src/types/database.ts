export type AppRole = "client" | "professional" | "org_admin" | "org_member" | "platform_admin";
export type JobStatus = "draft" | "open" | "matching" | "proposal_received" | "accepted" | "in_progress" | "pending_review" | "completed" | "disputed" | "cancelled";
export type ProposalStatus = "pending" | "accepted" | "rejected" | "expired" | "withdrawn";
export type PaymentStatus = "pending" | "authorized" | "captured" | "released_to_professional" | "refunded" | "disputed";
export type UserStatus = "pending_verification" | "active" | "suspended" | "deactivated";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      jobs: {
        Row: Job;
        Insert: Partial<Job>;
        Update: Partial<Job>;
      };
      proposals: {
        Row: Proposal;
        Insert: Partial<Proposal>;
        Update: Partial<Proposal>;
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment>;
        Update: Partial<Payment>;
      };
      services_catalog: {
        Row: ServiceCatalog;
        Insert: Partial<ServiceCatalog>;
        Update: Partial<ServiceCatalog>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification>;
        Update: Partial<Notification>;
      };
      messages: {
        Row: Message;
        Insert: Partial<Message>;
        Update: Partial<Message>;
      };
      reviews: {
        Row: Review;
        Insert: Partial<Review>;
        Update: Partial<Review>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Partial<UserRole>;
        Update: Partial<UserRole>;
      };
    };
  };
}

export interface Profile {
  id: string;
  organization_id: string | null;
  status: UserStatus;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  phone_masked: string | null;
  phone_hash: string | null;
  cpf_masked: string | null;
  cpf_hash: string | null;
  bio: string | null;
  skills: string[] | null;
  service_radius_km: number | null;
  hourly_rate_cents: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_available: boolean | null;
  location_lat: number | null;
  location_lng: number | null;
  location_city: string | null;
  location_state: string | null;
  lgpd_consented_at: string | null;
  onboarding_completed: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  organization_id: string | null;
  client_id: string;
  professional_id: string | null;
  service_catalog_id: string | null;
  title: string;
  description: string;
  status: JobStatus;
  location_lat: number | null;
  location_lng: number | null;
  address_line: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  estimated_duration_hours: number | null;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  agreed_price_cents: number | null;
  platform_fee_pct: number | null;
  platform_fee_cents: number | null;
  professional_payout_cents: number | null;
  payment_status: PaymentStatus | null;
  payment_intent_id: string | null;
  photos_urls: string[] | null;
  client_rating: number | null;
  client_review: string | null;
  professional_rating: number | null;
  professional_review: string | null;
  rated_at: string | null;
  cancellation_reason: string | null;
  dispute_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  job_id: string;
  professional_id: string;
  price_cents: number;
  description: string | null;
  estimated_hours: number | null;
  available_date: string | null;
  status: ProposalStatus;
  expires_at: string | null;
  client_response_at: string | null;
  client_response_note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  gateway: "stripe" | "mercado_pago" | "manual";
  gateway_payment_id: string | null;
  gateway_account_id: string | null;
  amount_cents: number;
  platform_fee_cents: number;
  professional_payout_cents: number;
  currency: string;
  status: string;
  payment_method: string | null;
  installments: number | null;
  refund_amount_cents: number | null;
  refund_reason: string | null;
  refunded_at: string | null;
  authorized_at: string | null;
  captured_at: string | null;
  released_at: string | null;
  failed_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalog {
  id: string;
  code: string;
  category: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  base_price_cents: number | null;
  duration_estimate_hours: number | null;
  requires_certification: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  channel: string;
  title: string;
  body: string | null;
  action_url: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  is_system: boolean;
  read_by: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  is_public: boolean;
  response: string | null;
  responded_at: string | null;
  nps_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}
