// Extended types for CloseLoop application
import type { Tables, Enums } from "@/integrations/supabase/types";

export type Tenant = Tables<"tenants"> & {
  ai_enabled?: boolean;
};

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
export type Subscription = Tables<"subscriptions">;
export type AssistantSettings = Tables<"assistant_settings"> & {
  // Extended fields added by migrations (optional since they may not exist in DB response)
  forwarding_phone_e164?: string | null;
  connect_status?: string | null;
};
export type PhoneNumber = Tables<"phone_numbers">;

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

// Sync event types
export type SyncEventType = 'customer_created' | 'customer_updated' | 'opportunity_created' | 'opportunity_updated' | 'booking_created' | 'booking_updated' | 'call_completed';

// Subscription types
export type PlanCode = Enums<"plan_code">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type VoiceMode = Enums<"voice_mode">;
export type MissedCallBehavior = Enums<"missed_call_behavior">;

// Business mode types
export type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general";

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

// Plan package info for UI
export interface PlanPackage {
  code: PlanCode;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlight?: boolean;
}
