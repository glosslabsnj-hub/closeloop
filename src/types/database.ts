// Extended types for Flux Receptionist application
import type { Tables, Enums } from "@/integrations/supabase/types";
import type { PlanSku, PlanTier } from "@/config/pricing";

export type Tenant = Tables<"tenants">;

export type TenantUser = Tables<"tenant_users">;
export type Service = Tables<"services">;
export type Lead = Tables<"leads">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;
export type Booking = Tables<"bookings">;
export type Automation = Tables<"automations">;
export type AuditLog = Tables<"audit_logs">;
export type UserRole = Tables<"user_roles">;

// New tables
export type Customer = Tables<"customers">;
export type Opportunity = Tables<"opportunities">;
export type CustomerMergeQueue = Tables<"customer_merge_queue">;
export type KnowledgeGap = Tables<"knowledge_gaps">;
export type SyncEvent = Tables<"sync_events">;
export type BusinessFAQ = Tables<"business_faqs">;
export type ObjectionResponse = Tables<"objection_responses">;
export type Subscription = Tables<"subscriptions"> & {
  // Extended fields for usage tracking
  included_minutes?: number | null;
  included_sms_segments?: number | null;
  overage_minute_rate_cents?: number | null;
  overage_sms_rate_cents?: number | null;
};
export type AssistantSettings = Tables<"assistant_settings">;
export type PhoneNumber = Tables<"phone_numbers">;

// Usage tracking
export type SubscriptionUsage = {
  id: string;
  tenant_id: string;
  billing_period_start: string;
  billing_period_end: string;
  voice_minutes_used: number;
  sms_segments_used: number;
  created_at: string;
  updated_at: string;
};

// Multi-location support
export type TenantLocation = {
  id: string;
  tenant_id: string;
  location_name: string;
  phone_number_id: string | null;
  is_primary: boolean;
  monthly_fee_cents: number;
  stripe_subscription_item_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

// AI-related types
export interface AIAssistant {
  id: string;
  tenant_id: string;
  name: string;
  voice_id: string | null;
  tone: "friendly" | "professional" | "luxury" | "direct";
  greeting_script: string | null;
  fallback_script: string | null;
  is_enabled: boolean;
  created_at: string;
}

export interface AICallSession {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  customer_id: string | null;
  opportunity_id: string | null;
  call_direction: "inbound" | "outbound";
  started_at: string;
  ended_at: string | null;
  outcome: "booked" | "followup" | "lost" | "escalated" | null;
  transcript: string | null;
  summary: string | null;
  booking_id: string | null;
  created_at: string;
}

export interface AIKnowledgeBase {
  id: string;
  tenant_id: string;
  type: "faq" | "objection" | "policy" | "upsell";
  title: string;
  content: string;
  priority_weight: number;
  created_at: string;
}

// Business context for AI injection
export interface BusinessContext {
  business: {
    name: string;
    tagline: string | null;
    industry: string;
    phone: string | null;
    website: string | null;
    address: string | null;
    years_in_business: number | null;
    timezone: string;
  };
  hours: Record<string, { open: string; close: string; closed: boolean }>;
  service_area: { type: string; miles?: number; codes?: string[] } | null;
  services: Array<{
    name: string;
    description: string | null;
    duration_minutes: number;
    price_type: string;
    price_amount: number | null;
    deposit_required: boolean | null;
    deposit_amount: number | null;
    preparation_instructions: string | null;
    upsell_suggestions: string[] | null;
  }>;
  availability_slots?: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
  booking_rules: {
    min_lead_hours: number | null;
    max_advance_days: number | null;
    buffer_minutes: number | null;
    closed_dates: string[] | null;
    booking_mode: 'auto_book' | 'pending_approval';
    booking_url: string | null;
  };
  policies: {
    cancellation: string | null;
    deposit: string | null;
    refund: string | null;
    payment_methods: string[] | null;
  };
  intake_fields: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
    required: boolean;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  objection_responses: Array<{ objection: string; response: string }>;
  guardrails: {
    never_promise: string[] | null;
    ai_enabled: boolean;
  };
}

// Customer resolver result
export interface CustomerResolverResult {
  customer_id: string;
  is_new: boolean;
  has_conflict: boolean;
  conflict_id: string | null;
}

// Opportunity status types
export type OpportunityStatus = 'new' | 'contacted' | 'qualified' | 'quoted' | 'booked' | 'completed' | 'lost';

// Knowledge gap types
export type KnowledgeGapType = 'missing_policy' | 'missing_pricing' | 'missing_service_area' | 'unanswered_question' | 'missing_hours' | 'missing_faq' | 'other';
export type KnowledgeGapUrgency = 'low' | 'normal' | 'high';

// Sync event types
export type SyncEventType = 'customer_created' | 'customer_updated' | 'opportunity_created' | 'opportunity_updated' | 'booking_created' | 'booking_updated' | 'call_completed';

// Subscription types - re-export from pricing config for convenience
export type { PlanSku, PlanTier };
// Legacy plan code type (for backward compatibility)
export type PlanCode = Enums<"plan_code">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type VoiceMode = Enums<"voice_mode">;
export type MissedCallBehavior = Enums<"missed_call_behavior">;
export type AIBehaviorMode = "full_service" | "callback_only";

// Business mode types
export type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general" | "sales";

// Sales entity types
export type TestDriveStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type SalesLeadStatus = "new" | "contacted" | "qualified" | "appointment_set" | "test_drive" | "negotiation" | "sold" | "lost";
export type SalesLeadPriority = "low" | "normal" | "high" | "hot";

// Enums
export type IndustryType = Enums<"industry_type">;
export type LeadSource = Enums<"lead_source">;
export type LeadStatus = Enums<"lead_status">;
export type BookingStatus = Enums<"booking_status">;
export type PriceType = Enums<"price_type">;
export type ChannelType = Enums<"channel_type">;
export type MessageDirection = Enums<"message_direction">;
export type MessageStatus = Enums<"message_status">;
export type AutomationTrigger = Enums<"automation_trigger">;
export type UserRoleType = Enums<"user_role">;
export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
export type ReservationStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
export type DispatchStatus = "pending" | "assigned" | "en_route" | "on_site" | "completed" | "cancelled";
export type DispatchPriority = "low" | "normal" | "high" | "urgent";

// Impound types
export type ImpoundTowReason = "private_property" | "police_hold" | "abandoned" | "accident" | "repo";
export type ImpoundVehicleStatus = "in_lot" | "pending_release" | "released" | "auction" | "police_hold";
export type ImpoundReleaseRequirement = "valid_id" | "registration" | "insurance" | "lien_release" | "police_release" | "payment";
export type ImpoundPaymentMethod = "cash" | "credit_card" | "debit_card";

export interface ImpoundLot {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  hours_json: Record<string, { open: string | null; close: string | null }>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImpoundVehicle {
  id: string;
  tenant_id: string;
  lot_id: string | null;
  license_plate: string | null;
  license_plate_state: string | null;
  vin: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  towed_from_address: string | null;
  towed_at: string;
  tow_reason: ImpoundTowReason;
  dispatch_job_id: string | null;
  status: ImpoundVehicleStatus;
  base_tow_fee_cents: number;
  storage_fee_daily_cents: number;
  days_stored: number;
  total_storage_cents: number;
  admin_fee_cents: number;
  gate_fee_cents: number;
  additional_fees_cents: number;
  total_fees_cents: number;
  release_requirements: ImpoundReleaseRequirement[];
  released_at: string | null;
  released_to_name: string | null;
  released_to_phone: string | null;
  release_notes: string | null;
  payment_method: string | null;
  notes: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export interface ImpoundSettings {
  tenant_id: string;
  base_tow_fee_cents: number;
  daily_storage_cents: number;
  gate_fee_cents: number;
  admin_fee_cents: number;
  accepted_payment: ImpoundPaymentMethod[];
  default_release_requirements: ImpoundReleaseRequirement[];
  release_hours_json: Record<string, { open: string | null; close: string | null }>;
  notify_on_new_impound: boolean;
  notify_on_release: boolean;
  impound_handling_enabled: boolean;
  updated_at: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  leadsThisWeek: number;
  bookingsThisWeek: number;
  depositsCollected: number;
  revenueRecovered: number;
  aiCallsAnswered: number;
  missedCallsRecovered: number;
  avgResponseTime: number;
}

// Onboarding state
export interface OnboardingState {
  step: number;
  businessName: string;
  industry: IndustryType;
  timezone: string;
  services: Partial<Service>[];
  businessHours: Record<string, { open: string; close: string; closed: boolean }>;
  aiEnabled: boolean;
  aiVoice: string;
  aiTone: "friendly" | "professional" | "luxury" | "direct";
  greetingScript: string;
}

// Plan package info for UI (legacy - kept for backward compatibility)
export interface PlanPackage {
  code: PlanCode;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlight?: boolean;
}
