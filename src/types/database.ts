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
