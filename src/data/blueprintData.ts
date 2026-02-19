/**
 * Blueprint Data Catalog
 *
 * Central catalog of descriptions for routes, edge functions, database tables,
 * and hooks. Used by the Admin Blueprint page to generate the platform reference document.
 *
 * When you add a new route, edge function, table, or hook, add a one-liner here.
 */

// ─── Route Catalog ──────────────────────────────────────────────────────────

export interface BlueprintRoute {
  path: string;
  page: string;
  description: string;
  layout: "public" | "app" | "admin" | "driver" | "debug" | "standalone";
  module?: string;
}

export const ROUTE_CATALOG: BlueprintRoute[] = [
  // Public
  { path: "/", page: "LandingPage", description: "Marketing landing page with hero, features, and pricing CTA", layout: "public" },
  { path: "/pricing", page: "PricingPage", description: "Plan comparison with minute bundles and feature breakdown", layout: "public" },
  { path: "/login", page: "LoginPage", description: "Email/password authentication with magic link option", layout: "public" },
  { path: "/signup", page: "SignupPage", description: "Account creation with industry selection and onboarding flow", layout: "public" },
  { path: "/forgot-password", page: "ForgotPasswordPage", description: "Password reset via email", layout: "public" },
  { path: "/agencies", page: "AgenciesPage", description: "Agency/reseller program landing page", layout: "public" },
  { path: "/estimate/:id", page: "EstimateViewPage", description: "Public estimate view for customer review and approval", layout: "standalone" },
  { path: "/portal/:tenantId", page: "CustomerPortalPage", description: "Customer self-service portal for bookings and history", layout: "standalone" },
  { path: "/roi/:tenantId/:shareToken", page: "PublicROIReportPage", description: "Shareable ROI report with revenue attribution", layout: "standalone" },

  // App — Core
  { path: "/app/onboarding", page: "OnboardingPage", description: "Post-signup wizard: industry, business info, services, AI config", layout: "standalone" },
  { path: "/app/go-live", page: "GoLivePage", description: "Stripe checkout + readiness checklist before going live", layout: "standalone" },
  { path: "/app/system-map", page: "SystemMapPage", description: "Visual system architecture map (printable)", layout: "standalone" },
  { path: "/app/dashboard", page: "DashboardPage", description: "Setup wizard (new tenants) or live dashboard (active tenants) with KPIs", layout: "app" },
  { path: "/app/inbox", page: "UnifiedInboxPage", description: "Unified inbox with Calls/Leads tabs, filters, and detail panel", layout: "app" },
  { path: "/app/customers", page: "CustomersPage", description: "Customer CRM with phone-based dedup and conversation history", layout: "app" },
  { path: "/app/bookings", page: "BookingsPage", description: "Calendar view + booking list with status management", layout: "app", module: "booking" },
  { path: "/app/business-brain", page: "BusinessBrainPage", description: "Hub for all knowledge editors: services, policies, FAQs, AI training", layout: "app" },
  { path: "/app/business-brain/gaps", page: "BusinessBrainGapsPage", description: "AI readiness gap analysis with fix suggestions", layout: "app" },
  { path: "/app/readiness", page: "ReadinessFixCenterPage", description: "Fix center for P0 blocking issues before go-live", layout: "app" },
  { path: "/app/integrations", page: "IntegrationsPage", description: "Third-party integrations, automations, and workflow builder", layout: "app" },
  { path: "/app/ai-assistant", page: "AIAssistantPage", description: "Voice settings: tone, greeting script, behavior mode", layout: "app" },
  { path: "/app/simulator", page: "SimulatorPage", description: "AI call simulator for testing voice agent responses", layout: "app" },
  { path: "/app/test-ai", page: "TestAIPage", description: "Text-based AI testing interface", layout: "app" },
  { path: "/app/settings", page: "SettingsPage", description: "Tenant settings: profile, users, phone numbers, hours", layout: "app" },
  { path: "/app/usage", page: "UsagePage", description: "Minute usage tracking with overage alerts", layout: "app" },
  { path: "/app/reports/roi", page: "ReportsROIPage", description: "ROI dashboard with revenue attribution and call analytics", layout: "app" },
  { path: "/app/help", page: "HelpCenterPage", description: "In-app help center with guides and support contact", layout: "app" },
  { path: "/app/partner", page: "BusinessPartnerPage", description: "Agency/partner dashboard for managing referred tenants", layout: "app" },
  { path: "/app/agency", page: "AgencyDashboardPage", description: "Agency management dashboard", layout: "app" },

  // App — Module-specific
  { path: "/app/orders", page: "OrdersPage", description: "Food order management with status tracking", layout: "app", module: "food_orders" },
  { path: "/app/orders/:orderId/ticket", page: "OrderTicketPage", description: "Printable order ticket for kitchen display", layout: "app", module: "food_orders" },
  { path: "/app/kitchen", page: "KitchenDisplayPage", description: "Kitchen display system for order queue", layout: "app", module: "food_orders" },
  { path: "/app/reservations", page: "ReservationsPage", description: "Table/seat reservation management", layout: "app", module: "reservations" },
  { path: "/app/catering", page: "CateringPage", description: "Catering order management with event details", layout: "app", module: "catering" },
  { path: "/app/dispatch", page: "DispatchPage", description: "Dispatch queue with job assignment and status tracking", layout: "app", module: "dispatch" },
  { path: "/app/dispatch-map", page: "DispatchMapPage", description: "Map view of active dispatch jobs and driver locations", layout: "app", module: "dispatch" },
  { path: "/app/fleet", page: "FleetPage", description: "Fleet vehicle management and assignment", layout: "app", module: "fleet" },
  { path: "/app/impound-lot", page: "ImpoundLotPage", description: "Impound lot inventory and release management", layout: "app", module: "impound" },
  { path: "/app/medical-intake", page: "MedicalIntakePage", description: "Patient intake forms with HIPAA compliance", layout: "app", module: "medical_intake" },
  { path: "/app/sales-pipeline", page: "SalesPipelinePage", description: "Sales pipeline with deal stages and forecasting", layout: "app", module: "sales" },
  { path: "/app/test-drives", page: "TestDrivesPage", description: "Test drive scheduling for dealerships", layout: "app", module: "sales" },
  { path: "/app/sales-inventory", page: "SalesInventoryPage", description: "Vehicle/product inventory for sales businesses", layout: "app", module: "sales" },
  { path: "/app/estimates", page: "EstimatesPage", description: "Estimate creation and tracking with customer approval", layout: "app", module: "estimates" },
  { path: "/app/agreements", page: "AgreementsPage", description: "Service agreement management with e-signatures", layout: "app", module: "agreements" },
  { path: "/app/time-tracking", page: "TimeTrackingPage", description: "Employee time tracking and job costing", layout: "app" },
  { path: "/app/inventory", page: "InventoryPage", description: "Parts and supplies inventory management", layout: "app" },
  { path: "/app/loyalty", page: "LoyaltyPage", description: "Customer loyalty program with points and rewards", layout: "app" },
  { path: "/app/jobs", page: "JobsPage", description: "Job management with status tracking and notes", layout: "app" },
  { path: "/app/leads/recovery", page: "LeadRecoveryPage", description: "Automated lead recovery campaigns for missed opportunities", layout: "app" },

  // Admin
  { path: "/admin/dashboard", page: "AdminDashboardPage", description: "Admin KPI dashboard with tenant growth and revenue metrics", layout: "admin" },
  { path: "/admin/overview", page: "AdminOverviewPage", description: "System overview with tenant stats and phone settings", layout: "admin" },
  { path: "/admin/tenants", page: "AdminTenantsPage", description: "Tenant management: view, edit, impersonate, subscription status", layout: "admin" },
  { path: "/admin/agencies", page: "AdminAgenciesPage", description: "Agency management and referral tracking", layout: "admin" },
  { path: "/admin/lead-finder", page: "AdminLeadFinderPage", description: "AI-powered lead prospecting tool", layout: "admin" },
  { path: "/admin/reseller-finder", page: "AdminResellerFinderPage", description: "Find and recruit potential reseller partners", layout: "admin" },
  { path: "/admin/marketing", page: "AdminMarketingPage", description: "Marketing campaign management and content creation", layout: "admin" },
  { path: "/admin/growth-engine", page: "AdminGrowthEnginePage", description: "Growth automation and outreach engine", layout: "admin" },
  { path: "/admin/demo-library", page: "AdminDemoLibraryPage", description: "Demo call recordings organized by industry for sales", layout: "admin" },
  { path: "/admin/golden-path", page: "AdminGoldenPathPage", description: "End-to-end call flow QA testing with live validation", layout: "admin" },
  { path: "/admin/support", page: "AdminSupportPage", description: "Support ticket queue with tenant context", layout: "admin" },
  { path: "/admin/setup-requests", page: "AdminSetupRequestsPage", description: "Concierge setup request management", layout: "admin" },
  { path: "/admin/audit-report", page: "AdminAuditReportPage", description: "System audit report with health checks", layout: "admin" },
  { path: "/admin/agency-applications", page: "AdminAgencyApplicationsPage", description: "Review and approve agency partnership applications", layout: "admin" },
  { path: "/admin/blueprint", page: "AdminBlueprintPage", description: "This page — auto-generated platform reference document", layout: "admin" },

  // Driver
  { path: "/driver", page: "DriverDashboard", description: "Driver job queue with accept/decline and navigation", layout: "driver" },
  { path: "/driver/jobs/:id", page: "DriverJobDetail", description: "Job detail with customer info, photos, and status updates", layout: "driver" },
  { path: "/driver/impound", page: "DriverImpoundLog", description: "Impound vehicle logging with photo capture", layout: "driver" },
  { path: "/driver/vehicle", page: "DriverVehicleSelect", description: "Vehicle selection for current shift", layout: "driver" },

  // Debug
  { path: "/debug/telephony", page: "TelephonyDebugPage", description: "Telephony system debugging with call logs and webhook traces", layout: "debug" },
  { path: "/debug/ai-context", page: "AIContextInspectorPage", description: "Inspect AI context payload sent to voice agent", layout: "debug" },
  { path: "/debug/availability", page: "AvailabilityDebugPage", description: "Availability slot calculation debugging", layout: "debug" },
  { path: "/debug/extraction", page: "ExtractionDebugPage", description: "AI entity extraction debugging from call transcripts", layout: "debug" },
  { path: "/debug/context", page: "ContextDebuggerPage", description: "Full context debugger for AI system prompts", layout: "debug" },
];

// ─── Database Table Catalog ─────────────────────────────────────────────────

export interface BlueprintTable {
  name: string;
  domain: string;
  description: string;
  keyColumns: string[];
}

export const DB_TABLE_CATALOG: BlueprintTable[] = [
  // Identity & Auth
  { name: "tenants", domain: "Identity", description: "Multi-tenant root — every business is a tenant", keyColumns: ["id", "name", "industry_slug", "business_mode", "subscription_status"] },
  { name: "tenant_users", domain: "Identity", description: "User-to-tenant membership with role assignment", keyColumns: ["user_id", "tenant_id", "role"] },
  { name: "tenant_config", domain: "Identity", description: "Per-tenant configuration flags and feature toggles", keyColumns: ["tenant_id", "enabled_modules", "hipaa_mode", "capabilities"] },
  { name: "subscriptions", domain: "Identity", description: "Stripe subscription records with plan SKU and status", keyColumns: ["tenant_id", "plan_sku", "status", "stripe_subscription_id"] },
  { name: "agencies", domain: "Identity", description: "Reseller/agency organizations that manage multiple tenants", keyColumns: ["id", "name", "owner_user_id", "commission_rate"] },
  { name: "agency_tenants", domain: "Identity", description: "Link table between agencies and their managed tenants", keyColumns: ["agency_id", "tenant_id"] },

  // AI & Voice
  { name: "assistant_settings", domain: "AI/Voice", description: "Per-tenant AI voice configuration (tone, mode, greeting)", keyColumns: ["tenant_id", "voice_tone", "ai_mode", "greeting_script"] },
  { name: "conversations", domain: "AI/Voice", description: "Call/message threads with transcript and summary", keyColumns: ["id", "tenant_id", "customer_id", "direction", "status"] },
  { name: "call_logs", domain: "AI/Voice", description: "Raw call records with Twilio SID and duration", keyColumns: ["id", "tenant_id", "twilio_call_sid", "duration_seconds"] },
  { name: "call_outcomes", domain: "AI/Voice", description: "AI-classified call outcomes (booked, transferred, voicemail, etc.)", keyColumns: ["conversation_id", "outcome_type", "intent", "confidence"] },
  { name: "voicemails", domain: "AI/Voice", description: "Voicemail recordings with transcription", keyColumns: ["id", "tenant_id", "conversation_id", "transcription"] },
  { name: "sms_messages", domain: "AI/Voice", description: "SMS message records for follow-up and notifications", keyColumns: ["id", "tenant_id", "to_number", "body", "direction"] },
  { name: "phone_numbers", domain: "AI/Voice", description: "Twilio phone numbers assigned to tenants", keyColumns: ["id", "tenant_id", "phone_number", "twilio_sid"] },
  { name: "a2p_registrations", domain: "AI/Voice", description: "A2P 10DLC registration status for SMS compliance", keyColumns: ["tenant_id", "status", "campaign_id"] },

  // Entities
  { name: "customers", domain: "Entities", description: "Customer records, unique per tenant by phone_e164", keyColumns: ["id", "tenant_id", "phone_e164", "name", "email"] },
  { name: "leads", domain: "Entities", description: "Leads captured from calls with status tracking", keyColumns: ["id", "tenant_id", "customer_id", "status", "source"] },
  { name: "bookings", domain: "Entities", description: "Appointment/booking records with calendar integration", keyColumns: ["id", "tenant_id", "customer_id", "service_id", "starts_at", "status"] },
  { name: "dispatch_jobs", domain: "Entities", description: "Dispatch job records for towing, delivery, field service", keyColumns: ["id", "tenant_id", "customer_id", "status", "priority", "assigned_driver_id"] },
  { name: "food_orders", domain: "Entities", description: "Food order records with items, status, and fulfillment type", keyColumns: ["id", "tenant_id", "customer_id", "status", "order_type", "total"] },
  { name: "order_items", domain: "Entities", description: "Line items for food orders", keyColumns: ["id", "order_id", "menu_item_id", "quantity", "price"] },
  { name: "catering_orders", domain: "Entities", description: "Catering orders with event details and guest counts", keyColumns: ["id", "tenant_id", "customer_id", "event_date", "guest_count"] },
  { name: "reservations", domain: "Entities", description: "Table/seat reservations for restaurants", keyColumns: ["id", "tenant_id", "customer_id", "party_size", "reserved_at"] },
  { name: "medical_intakes", domain: "Entities", description: "Patient intake records with HIPAA-compliant storage", keyColumns: ["id", "tenant_id", "patient_id", "symptoms", "urgency"] },
  { name: "estimates", domain: "Entities", description: "Service estimates with line items and approval tracking", keyColumns: ["id", "tenant_id", "customer_id", "status", "total"] },
  { name: "agreements", domain: "Entities", description: "Service agreements with e-signature status", keyColumns: ["id", "tenant_id", "customer_id", "status", "signed_at"] },
  { name: "impound_vehicles", domain: "Entities", description: "Impounded vehicle records with release tracking", keyColumns: ["id", "tenant_id", "plate", "vin", "status", "release_date"] },
  { name: "sales_deals", domain: "Entities", description: "Sales pipeline deals with stage tracking", keyColumns: ["id", "tenant_id", "customer_id", "stage", "value"] },
  { name: "test_drives", domain: "Entities", description: "Test drive scheduling for dealership mode", keyColumns: ["id", "tenant_id", "customer_id", "vehicle_id", "scheduled_at"] },

  // Knowledge
  { name: "services", domain: "Knowledge", description: "Service catalog items with name, duration, and price", keyColumns: ["id", "tenant_id", "name", "duration_minutes", "price"] },
  { name: "menu_items", domain: "Knowledge", description: "Restaurant menu items with categories and pricing", keyColumns: ["id", "tenant_id", "name", "category", "price"] },
  { name: "faqs", domain: "Knowledge", description: "FAQ entries trained into the AI knowledge base", keyColumns: ["id", "tenant_id", "question", "answer"] },
  { name: "objections", domain: "Knowledge", description: "Objection-response pairs for AI sales training", keyColumns: ["id", "tenant_id", "objection", "response"] },
  { name: "policies", domain: "Knowledge", description: "Business policies (cancellation, deposit, refund)", keyColumns: ["id", "tenant_id", "policy_type", "content"] },
  { name: "custom_knowledge", domain: "Knowledge", description: "Free-form knowledge entries for AI context", keyColumns: ["id", "tenant_id", "title", "content"] },
  { name: "documents", domain: "Knowledge", description: "Uploaded documents parsed for AI knowledge extraction", keyColumns: ["id", "tenant_id", "filename", "parsed_content"] },
  { name: "knowledge_review_queue", domain: "Knowledge", description: "AI-suggested knowledge items awaiting human review", keyColumns: ["id", "tenant_id", "suggested_type", "content", "status"] },

  // Services & Operations
  { name: "service_areas", domain: "Services", description: "Geographic service coverage zones", keyColumns: ["id", "tenant_id", "zone_name", "radius_miles"] },
  { name: "business_hours", domain: "Services", description: "Operating hours by day of week", keyColumns: ["id", "tenant_id", "day_of_week", "open_time", "close_time"] },
  { name: "coverage_zones", domain: "Services", description: "Dispatch/delivery coverage zones with ETA rules", keyColumns: ["id", "tenant_id", "zone_name", "eta_minutes"] },
  { name: "price_modifiers", domain: "Services", description: "Dynamic pricing rules (after-hours, emergency, holiday)", keyColumns: ["id", "tenant_id", "name", "modifier_type", "amount"] },
  { name: "vehicles", domain: "Services", description: "Fleet vehicles with type and availability", keyColumns: ["id", "tenant_id", "name", "type", "status"] },
  { name: "drivers", domain: "Services", description: "Driver profiles with contact and vehicle assignment", keyColumns: ["id", "tenant_id", "user_id", "name", "vehicle_id"] },
  { name: "calendar_connections", domain: "Services", description: "Google Calendar OAuth connections for booking sync", keyColumns: ["id", "tenant_id", "provider", "access_token"] },
  { name: "availability_overrides", domain: "Services", description: "Date-specific availability overrides (holidays, special hours)", keyColumns: ["id", "tenant_id", "date", "is_closed"] },
  { name: "team_members", domain: "Services", description: "Team members with roles and scheduling availability", keyColumns: ["id", "tenant_id", "name", "role", "schedule"] },

  // Automation
  { name: "workflows", domain: "Automation", description: "Automation workflow definitions with trigger and steps", keyColumns: ["id", "tenant_id", "name", "trigger_type", "is_active"] },
  { name: "workflow_steps", domain: "Automation", description: "Individual steps within a workflow", keyColumns: ["id", "workflow_id", "order", "action", "provider"] },
  { name: "workflow_runs", domain: "Automation", description: "Execution logs for workflow runs", keyColumns: ["id", "workflow_id", "status", "started_at"] },
  { name: "workflow_run_steps", domain: "Automation", description: "Per-step execution results within a run", keyColumns: ["id", "run_id", "step_id", "status", "output"] },
  { name: "integration_connections", domain: "Automation", description: "Active integration connections (Google, Square, etc.)", keyColumns: ["id", "tenant_id", "provider", "status"] },
  { name: "webhook_endpoints", domain: "Automation", description: "Webhook delivery endpoints configured by tenant", keyColumns: ["id", "tenant_id", "url", "events"] },
  { name: "webhook_deliveries", domain: "Automation", description: "Webhook delivery attempt logs with response codes", keyColumns: ["id", "endpoint_id", "event", "status_code"] },

  // Intelligence & Analytics
  { name: "intelligence_settings", domain: "Intelligence", description: "AI learning and memory configuration per tenant", keyColumns: ["tenant_id", "memory_enabled", "learning_mode"] },
  { name: "ai_memories", domain: "Intelligence", description: "AI-learned facts about customers and business patterns", keyColumns: ["id", "tenant_id", "customer_id", "fact", "confidence"] },
  { name: "roi_events", domain: "Intelligence", description: "Revenue attribution events for ROI tracking", keyColumns: ["id", "tenant_id", "event_type", "revenue_amount", "conversation_id"] },
  { name: "usage_records", domain: "Intelligence", description: "Minute and SMS usage tracking for billing", keyColumns: ["id", "tenant_id", "period", "minutes_used", "sms_used"] },

  // Admin
  { name: "setup_requests", domain: "Admin", description: "Concierge setup requests from tenants", keyColumns: ["id", "tenant_id", "type", "status"] },
  { name: "support_tickets", domain: "Admin", description: "Support tickets with priority and assignment", keyColumns: ["id", "tenant_id", "subject", "status", "priority"] },
  { name: "demo_calls", domain: "Admin", description: "Demo call recordings for the demo library", keyColumns: ["id", "industry_slug", "audio_url", "description"] },
  { name: "lead_prospects", domain: "Admin", description: "Prospected leads from Lead Finder tool", keyColumns: ["id", "business_name", "phone", "industry", "status"] },
  { name: "agency_applications", domain: "Admin", description: "Agency partnership applications pending review", keyColumns: ["id", "company_name", "contact_email", "status"] },
];

// ─── Database Enum Catalog ──────────────────────────────────────────────────

export interface BlueprintEnum {
  name: string;
  values: string[];
}

export const DB_ENUM_CATALOG: BlueprintEnum[] = [
  { name: "user_role", values: ["super_admin", "owner", "manager", "staff", "viewer", "driver"] },
  { name: "business_mode", values: ["service", "dispatch", "food", "medical", "general", "sales"] },
  { name: "booking_status", values: ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"] },
  { name: "dispatch_status", values: ["pending", "assigned", "en_route", "on_scene", "in_progress", "completed", "cancelled"] },
  { name: "order_status", values: ["new", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"] },
  { name: "lead_status", values: ["new", "contacted", "qualified", "converted", "lost"] },
  { name: "conversation_direction", values: ["inbound", "outbound"] },
  { name: "call_outcome_type", values: ["booked", "transferred", "voicemail", "info_provided", "callback_requested", "order_placed", "dispatch_created", "no_action"] },
  { name: "subscription_status", values: ["trialing", "active", "past_due", "cancelled", "paused"] },
  { name: "workflow_trigger_type", values: ["booking_created", "booking_cancelled", "order_placed", "order_ready", "dispatch_created", "dispatch_completed", "call_ended", "lead_created"] },
  { name: "intake_urgency", values: ["routine", "urgent", "emergency"] },
  { name: "deal_stage", values: ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] },
  { name: "impound_status", values: ["stored", "pending_release", "released", "abandoned"] },
];

// ─── Edge Function Catalog ──────────────────────────────────────────────────

export interface BlueprintEdgeFunction {
  name: string;
  domain: string;
  description: string;
  trigger?: string;
}

export const EDGE_FUNCTION_CATALOG: BlueprintEdgeFunction[] = [
  // Voice & Telephony
  { name: "handle-incoming-call", domain: "Voice", description: "Twilio webhook entry point — routes inbound calls to AI agent", trigger: "Twilio webhook on call" },
  { name: "handle-call-status", domain: "Voice", description: "Processes Twilio call status callbacks (completed, failed, busy)", trigger: "Twilio status callback" },
  { name: "handle-voicemail", domain: "Voice", description: "Processes voicemail recordings and transcriptions", trigger: "Twilio recording callback" },
  { name: "voice-agent-webhook", domain: "Voice", description: "Receives real-time events from ElevenLabs voice agent", trigger: "ElevenLabs webhook" },
  { name: "voice-agent-tools", domain: "Voice", description: "Handles tool calls from the AI voice agent (book, dispatch, transfer)", trigger: "ElevenLabs tool call" },
  { name: "build-ai-context", domain: "Voice", description: "Assembles the full AI context payload for voice agent system prompt", trigger: "Called by handle-incoming-call" },
  { name: "classify-intent", domain: "Voice", description: "Classifies call intent from transcript (booking, dispatch, info, etc.)", trigger: "Post-call processing" },
  { name: "extract-entities", domain: "Voice", description: "Extracts structured entities from call transcript (name, date, service)", trigger: "Post-call processing" },
  { name: "generate-call-summary", domain: "Voice", description: "Generates human-readable call summary from transcript", trigger: "Post-call processing" },
  { name: "handle-transfer", domain: "Voice", description: "Executes warm/cold transfer to human agent", trigger: "AI agent transfer tool" },
  { name: "text-to-speech", domain: "Voice", description: "Converts text to speech for outbound messages", trigger: "API call" },
  { name: "handle-sms-incoming", domain: "Voice", description: "Processes inbound SMS messages", trigger: "Twilio SMS webhook" },
  { name: "send-sms", domain: "Voice", description: "Sends SMS messages to customers", trigger: "API call / automation" },

  // Booking
  { name: "create-booking", domain: "Booking", description: "Creates a booking from AI agent or manual entry", trigger: "AI tool call / API" },
  { name: "update-booking-status", domain: "Booking", description: "Updates booking status (confirm, cancel, complete)", trigger: "API / automation" },
  { name: "check-availability", domain: "Booking", description: "Checks available time slots considering hours, team, and overrides", trigger: "AI tool call / API" },
  { name: "sync-calendar", domain: "Booking", description: "Syncs bookings to/from Google Calendar", trigger: "Booking events / cron" },
  { name: "send-booking-reminder", domain: "Booking", description: "Sends appointment reminder SMS to customer", trigger: "Cron (24h before)" },
  { name: "handle-no-show", domain: "Booking", description: "Processes no-show bookings and triggers follow-up", trigger: "Manual / cron" },

  // Dispatch
  { name: "create-dispatch-job", domain: "Dispatch", description: "Creates a dispatch job from AI agent or manual entry", trigger: "AI tool call / API" },
  { name: "assign-driver", domain: "Dispatch", description: "Assigns a driver to a dispatch job based on proximity/availability", trigger: "API / auto-assign" },
  { name: "update-job-status", domain: "Dispatch", description: "Updates dispatch job status through the lifecycle", trigger: "Driver app / API" },
  { name: "calculate-eta", domain: "Dispatch", description: "Calculates ETA based on driver location and traffic", trigger: "API call" },
  { name: "driver-location-update", domain: "Dispatch", description: "Processes real-time driver location updates", trigger: "Driver app GPS" },
  { name: "dispatch-notification", domain: "Dispatch", description: "Sends dispatch notifications to drivers and customers", trigger: "Job status change" },

  // Food & Orders
  { name: "create-food-order", domain: "Food", description: "Creates a food order from AI agent with item validation", trigger: "AI tool call" },
  { name: "update-order-status", domain: "Food", description: "Updates food order status (confirmed → preparing → ready)", trigger: "Kitchen / API" },
  { name: "print-kitchen-ticket", domain: "Food", description: "Sends order to kitchen printer via webhook", trigger: "Order created" },
  { name: "create-catering-order", domain: "Food", description: "Creates a catering order with event details", trigger: "AI tool call / API" },
  { name: "create-reservation", domain: "Food", description: "Creates a table reservation", trigger: "AI tool call / API" },

  // Lead Recovery
  { name: "identify-recovery-leads", domain: "Recovery", description: "Identifies leads that need follow-up based on outcome and time", trigger: "Cron (daily)" },
  { name: "send-recovery-sms", domain: "Recovery", description: "Sends automated recovery SMS to unconverted leads", trigger: "Recovery campaign" },
  { name: "track-recovery-outcome", domain: "Recovery", description: "Tracks whether recovery outreach converts", trigger: "Customer response" },

  // Knowledge
  { name: "ingest-document", domain: "Knowledge", description: "Parses uploaded documents and extracts knowledge for AI", trigger: "Document upload" },
  { name: "suggest-knowledge", domain: "Knowledge", description: "AI suggests new FAQ/knowledge items from call patterns", trigger: "Cron (weekly)" },
  { name: "build-knowledge-context", domain: "Knowledge", description: "Assembles knowledge base context for AI system prompt", trigger: "Call start" },

  // Calendar
  { name: "google-calendar-auth", domain: "Calendar", description: "Handles Google Calendar OAuth flow", trigger: "User connection" },
  { name: "google-calendar-sync", domain: "Calendar", description: "Bidirectional sync of calendar events", trigger: "Webhook / cron" },
  { name: "google-calendar-webhook", domain: "Calendar", description: "Processes Google Calendar push notifications", trigger: "Google webhook" },

  // Telephony
  { name: "provision-phone-number", domain: "Telephony", description: "Purchases and configures a Twilio phone number for a tenant", trigger: "Go-live / admin" },
  { name: "configure-twilio-webhooks", domain: "Telephony", description: "Sets up Twilio webhook URLs for a phone number", trigger: "Phone provision" },
  { name: "release-phone-number", domain: "Telephony", description: "Releases a Twilio phone number when tenant cancels", trigger: "Cancellation" },
  { name: "handle-ivr", domain: "Telephony", description: "Processes IVR menu selections for multi-department routing", trigger: "Twilio gather" },
  { name: "register-a2p", domain: "Telephony", description: "Registers tenant for A2P 10DLC SMS compliance", trigger: "Go-live" },

  // Intelligence
  { name: "process-ai-memory", domain: "Intelligence", description: "Extracts and stores learnable facts from conversations", trigger: "Post-call" },
  { name: "calculate-roi", domain: "Intelligence", description: "Calculates revenue attribution for ROI dashboard", trigger: "Conversion event" },
  { name: "generate-roi-report", domain: "Intelligence", description: "Generates shareable ROI report with metrics", trigger: "API call" },
  { name: "analyze-call-patterns", domain: "Intelligence", description: "Analyzes call patterns for peak hours and common intents", trigger: "Cron (daily)" },

  // Integrations
  { name: "google-sheets-append", domain: "Integrations", description: "Appends data rows to connected Google Sheets", trigger: "Automation step" },
  { name: "google-sheets-auth", domain: "Integrations", description: "Handles Google Sheets OAuth connection", trigger: "User connection" },
  { name: "square-sync", domain: "Integrations", description: "Syncs orders/payments with Square POS", trigger: "Order events" },
  { name: "stripe-webhook", domain: "Integrations", description: "Processes Stripe subscription and payment events", trigger: "Stripe webhook" },
  { name: "stripe-checkout", domain: "Integrations", description: "Creates Stripe checkout session for go-live", trigger: "Go-live page" },
  { name: "webhook-deliver", domain: "Integrations", description: "Delivers event payloads to tenant webhook endpoints", trigger: "Any subscribed event" },
  { name: "tekmetric-sync", domain: "Integrations", description: "Syncs job data with Tekmetric shop management", trigger: "Job events" },
  { name: "quickbooks-sync", domain: "Integrations", description: "Syncs invoices and payments with QuickBooks Online", trigger: "Booking/order events" },
  { name: "hubspot-sync", domain: "Integrations", description: "Syncs contacts and deals with HubSpot CRM", trigger: "Lead/customer events" },

  // Admin
  { name: "admin-tenant-stats", domain: "Admin", description: "Aggregates tenant statistics for admin dashboard", trigger: "API call" },
  { name: "admin-impersonate", domain: "Admin", description: "Enables super_admin to impersonate a tenant", trigger: "Admin action" },
  { name: "create-demo-tenant", domain: "Admin", description: "Creates a demo tenant with pre-populated data", trigger: "Admin action" },
  { name: "process-setup-request", domain: "Admin", description: "Handles concierge setup request workflow", trigger: "Setup request" },
  { name: "prospect-leads", domain: "Admin", description: "AI-powered lead prospecting from business directories", trigger: "Admin Lead Finder" },
  { name: "process-agency-application", domain: "Admin", description: "Processes agency partnership applications", trigger: "Application submit" },

  // Cron Jobs
  { name: "cron-booking-reminders", domain: "Cron", description: "Sends booking reminders 24 hours before appointments", trigger: "Daily at 8am" },
  { name: "cron-usage-rollup", domain: "Cron", description: "Rolls up daily usage into monthly usage records", trigger: "Daily at midnight" },
  { name: "cron-recovery-scan", domain: "Cron", description: "Scans for leads eligible for recovery campaigns", trigger: "Daily at 10am" },
  { name: "cron-calendar-sync", domain: "Cron", description: "Periodic full calendar sync for all connected tenants", trigger: "Every 15 minutes" },
  { name: "cron-subscription-check", domain: "Cron", description: "Checks for expired trials and past-due subscriptions", trigger: "Daily at midnight" },
  { name: "cron-ai-suggestions", domain: "Cron", description: "Generates AI knowledge suggestions from call patterns", trigger: "Weekly on Sunday" },
  { name: "cron-stale-jobs", domain: "Cron", description: "Flags dispatch jobs that have been pending too long", trigger: "Every hour" },

  // Utilities
  { name: "health-check", domain: "Utilities", description: "System health check endpoint", trigger: "Monitoring" },
  { name: "send-email", domain: "Utilities", description: "Transactional email sender (welcome, reset, notifications)", trigger: "Various events" },
  { name: "upload-file", domain: "Utilities", description: "Handles file uploads to Supabase storage", trigger: "API call" },
  { name: "geocode-address", domain: "Utilities", description: "Geocodes addresses for coverage zone checks", trigger: "API call" },
  { name: "generate-pdf", domain: "Utilities", description: "Generates PDF documents (estimates, agreements, tickets)", trigger: "API call" },
  { name: "cleanup-expired-sessions", domain: "Utilities", description: "Removes expired auth sessions", trigger: "Cron (daily)" },
];

// ─── Hook Catalog ───────────────────────────────────────────────────────────

export interface BlueprintHook {
  name: string;
  domain: string;
  description: string;
}

export const HOOK_CATALOG: BlueprintHook[] = [
  // Auth & Identity
  { name: "useAuth", domain: "Auth", description: "User session, tenant, role, subscription, admin tenant switching" },
  { name: "useTenantConfig", domain: "Auth", description: "Business mode, enabled modules, HIPAA mode, capabilities" },
  { name: "useCapabilities", domain: "Auth", description: "Individual feature flags: hasAiVoice, hasBooking, hasDispatchQueue, etc." },
  { name: "useProfile", domain: "Auth", description: "Current user profile data" },
  { name: "useRole", domain: "Auth", description: "Current user role within active tenant" },

  // Bookings
  { name: "useBookings", domain: "Bookings", description: "Booking CRUD + stats + realtime subscriptions" },
  { name: "useBookingStats", domain: "Bookings", description: "Booking counts by status for dashboard" },
  { name: "useBookingDetail", domain: "Bookings", description: "Single booking detail with customer and service info" },
  { name: "useCreateBooking", domain: "Bookings", description: "Mutation to create a new booking" },
  { name: "useUpdateBooking", domain: "Bookings", description: "Mutation to update booking status or details" },
  { name: "useAvailability", domain: "Bookings", description: "Available time slots calculation with conflict detection" },

  // Leads & Customers
  { name: "useLeads", domain: "Leads", description: "Lead CRUD + stats with status filtering" },
  { name: "useLeadStats", domain: "Leads", description: "Lead counts by status and source" },
  { name: "useCustomers", domain: "Customers", description: "Customer CRUD (unique: tenant_id + phone_e164)" },
  { name: "useCustomerDetail", domain: "Customers", description: "Single customer with conversation history" },
  { name: "useCustomerSearch", domain: "Customers", description: "Phone/name search across customer records" },

  // Conversations & Calls
  { name: "useConversations", domain: "Calls", description: "Call/message thread list with filtering" },
  { name: "useConversationDetail", domain: "Calls", description: "Single conversation with transcript and outcome" },
  { name: "useCallStats", domain: "Calls", description: "Call volume and outcome statistics" },
  { name: "useVoicemails", domain: "Calls", description: "Voicemail list with transcriptions" },

  // Services & Catalog
  { name: "useServices", domain: "Services", description: "Service catalog CRUD" },
  { name: "useMenuItems", domain: "Services", description: "Menu item CRUD for food businesses" },
  { name: "usePriceModifiers", domain: "Services", description: "Dynamic pricing rules management" },
  { name: "useServicePackages", domain: "Services", description: "Service package bundle management" },

  // AI & Voice
  { name: "useAssistantSettings", domain: "AI", description: "AI config per tenant (auto-creates if missing)" },
  { name: "useAIReadinessV2", domain: "AI", description: "canGoLive boolean + p0Flags blocking issues" },
  { name: "useBrainCompletion", domain: "AI", description: "Business Brain progress scores by section" },
  { name: "useEssentialFieldStatus", domain: "AI", description: "Required field checklist per business mode" },
  { name: "useVoiceSettings", domain: "AI", description: "Voice tone, speed, and language settings" },
  { name: "useGreetingScript", domain: "AI", description: "Greeting script editor with variable injection" },

  // Dispatch
  { name: "useDispatchJobs", domain: "Dispatch", description: "Dispatch queue with status filtering and assignment" },
  { name: "useDispatchStats", domain: "Dispatch", description: "Job counts by status for dispatch dashboard" },
  { name: "useDrivers", domain: "Dispatch", description: "Driver list with availability and location" },
  { name: "useFleet", domain: "Dispatch", description: "Fleet vehicle management" },
  { name: "useDispatchMap", domain: "Dispatch", description: "Map data for driver and job visualization" },

  // Orders & Food
  { name: "useFoodOrders", domain: "Orders", description: "Food order list with status management" },
  { name: "useOrderStats", domain: "Orders", description: "Order counts and revenue by period" },
  { name: "useCateringOrders", domain: "Orders", description: "Catering order management" },
  { name: "useReservations", domain: "Orders", description: "Reservation list and table management" },
  { name: "useKitchenDisplay", domain: "Orders", description: "Kitchen display queue with auto-refresh" },

  // Medical
  { name: "useMedicalIntakes", domain: "Medical", description: "Patient intake records with HIPAA filtering" },
  { name: "useIntakeStats", domain: "Medical", description: "Intake counts by urgency and status" },

  // Sales
  { name: "useSalesDeals", domain: "Sales", description: "Sales pipeline deal management" },
  { name: "useTestDrives", domain: "Sales", description: "Test drive scheduling for dealerships" },
  { name: "useSalesInventory", domain: "Sales", description: "Vehicle/product inventory for sales" },

  // Operations
  { name: "useBusinessHours", domain: "Operations", description: "Business hours configuration" },
  { name: "useCoverageZones", domain: "Operations", description: "Coverage zone management with radius/polygon" },
  { name: "useServiceAreas", domain: "Operations", description: "Service area configuration" },
  { name: "useTeamMembers", domain: "Operations", description: "Team member list with scheduling" },
  { name: "useCalendarConnection", domain: "Operations", description: "Google Calendar OAuth connection status" },

  // Knowledge
  { name: "useFAQs", domain: "Knowledge", description: "FAQ CRUD for AI knowledge base" },
  { name: "useObjections", domain: "Knowledge", description: "Objection-response pair management" },
  { name: "usePolicies", domain: "Knowledge", description: "Business policy management" },
  { name: "useCustomKnowledge", domain: "Knowledge", description: "Custom knowledge entry management" },
  { name: "useDocuments", domain: "Knowledge", description: "Document upload and knowledge extraction" },
  { name: "useReviewQueue", domain: "Knowledge", description: "Knowledge review queue for AI suggestions" },

  // Integrations & Automation
  { name: "useWorkflows", domain: "Automation", description: "Automation workflow CRUD" },
  { name: "useWorkflowRuns", domain: "Automation", description: "Workflow execution history" },
  { name: "useIntegrationConnections", domain: "Automation", description: "Active integration connection status" },
  { name: "useWebhookEndpoints", domain: "Automation", description: "Webhook endpoint management" },
  { name: "useGoogleCalendar", domain: "Automation", description: "Google Calendar integration management" },
  { name: "useGoogleSheets", domain: "Automation", description: "Google Sheets export configuration" },

  // Analytics & Intelligence
  { name: "useROIDashboard", domain: "Analytics", description: "Revenue attribution metrics and ROI calculation" },
  { name: "useUsageStats", domain: "Analytics", description: "Minute and SMS usage with overage tracking" },
  { name: "useIntelligenceSettings", domain: "Analytics", description: "Memory/learning config (respects HIPAA)" },
  { name: "useAIMemories", domain: "Analytics", description: "AI-learned facts viewer" },
  { name: "useCallPatterns", domain: "Analytics", description: "Call volume patterns by hour/day" },

  // Estimates & Agreements
  { name: "useEstimates", domain: "Estimates", description: "Estimate CRUD with line items" },
  { name: "useAgreements", domain: "Agreements", description: "Service agreement management" },

  // Admin
  { name: "useAdminTenants", domain: "Admin", description: "Tenant list for admin management" },
  { name: "useAdminStats", domain: "Admin", description: "Platform-wide statistics" },
  { name: "useSetupRequests", domain: "Admin", description: "Setup request queue management" },
  { name: "useSupportTickets", domain: "Admin", description: "Support ticket management" },
  { name: "useDemoLibrary", domain: "Admin", description: "Demo call recording management" },
  { name: "useLeadFinder", domain: "Admin", description: "AI lead prospecting tool" },
  { name: "useAgencies", domain: "Admin", description: "Agency management for reseller program" },

  // Settings
  { name: "usePhoneNumbers", domain: "Settings", description: "Twilio phone number management" },
  { name: "useSubscription", domain: "Settings", description: "Current subscription status and plan details" },
  { name: "useTenantSettings", domain: "Settings", description: "General tenant settings management" },
  { name: "useNotificationPreferences", domain: "Settings", description: "Email/SMS notification preferences" },

  // Impound
  { name: "useImpoundVehicles", domain: "Impound", description: "Impound lot vehicle management" },
  { name: "useImpoundFees", domain: "Impound", description: "Impound fee calculation and tracking" },
];

// ─── RPC Function Catalog ───────────────────────────────────────────────────

export interface BlueprintRPC {
  name: string;
  description: string;
}

export const RPC_CATALOG: BlueprintRPC[] = [
  { name: "get_tenant_stats", description: "Returns aggregate stats for a tenant (calls, bookings, leads, revenue)" },
  { name: "get_admin_overview", description: "Returns platform-wide admin metrics" },
  { name: "get_available_slots", description: "Calculates available booking slots for a date range" },
  { name: "get_usage_summary", description: "Returns minute/SMS usage for current billing period" },
  { name: "get_roi_metrics", description: "Calculates ROI metrics with revenue attribution" },
  { name: "search_customers", description: "Full-text search across customer records" },
  { name: "get_call_analytics", description: "Returns call volume and outcome analytics" },
  { name: "get_brain_completion", description: "Calculates Business Brain completeness score" },
  { name: "assign_nearest_driver", description: "Finds and assigns the nearest available driver to a job" },
  { name: "calculate_dispatch_eta", description: "Calculates ETA based on distance and traffic patterns" },
  { name: "process_impound_release", description: "Handles impound vehicle release with fee calculation" },
  { name: "merge_customers", description: "Merges duplicate customer records" },
];
