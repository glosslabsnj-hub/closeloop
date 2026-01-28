export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_assistants: {
        Row: {
          created_at: string
          fallback_script: string | null
          greeting_script: string | null
          id: string
          is_enabled: boolean
          name: string
          tenant_id: string
          tone: Database["public"]["Enums"]["ai_tone"]
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          fallback_script?: string | null
          greeting_script?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          tenant_id: string
          tone?: Database["public"]["Enums"]["ai_tone"]
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          fallback_script?: string | null
          greeting_script?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          tenant_id?: string
          tone?: Database["public"]["Enums"]["ai_tone"]
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_call_sessions: {
        Row: {
          booking_id: string | null
          call_direction: Database["public"]["Enums"]["ai_call_direction"]
          created_at: string
          customer_id: string | null
          ended_at: string | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          outcome: Database["public"]["Enums"]["ai_call_outcome"] | null
          started_at: string
          summary: string | null
          tenant_id: string
          transcript: string | null
        }
        Insert: {
          booking_id?: string | null
          call_direction: Database["public"]["Enums"]["ai_call_direction"]
          created_at?: string
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          outcome?: Database["public"]["Enums"]["ai_call_outcome"] | null
          started_at?: string
          summary?: string | null
          tenant_id: string
          transcript?: string | null
        }
        Update: {
          booking_id?: string | null
          call_direction?: Database["public"]["Enums"]["ai_call_direction"]
          created_at?: string
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          outcome?: Database["public"]["Enums"]["ai_call_outcome"] | null
          started_at?: string
          summary?: string | null
          tenant_id?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_sessions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_base: {
        Row: {
          content: string
          created_at: string
          id: string
          priority_weight: number
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["ai_knowledge_type"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          priority_weight?: number
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["ai_knowledge_type"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          priority_weight?: number
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["ai_knowledge_type"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_settings: {
        Row: {
          ai_callback_delay_minutes: number | null
          business_phone_number: string | null
          busy_toggle: boolean
          closeloop_number: string | null
          created_at: string
          go_live_enabled: boolean
          instant_text_enabled: boolean
          missed_call_behavior: Database["public"]["Enums"]["missed_call_behavior"]
          overflow_rings: number
          phone_connected: boolean
          sms_first_delay_seconds: number
          tenant_id: string
          updated_at: string
          voice_ai_enabled: boolean
          voice_mode: Database["public"]["Enums"]["voice_mode"]
        }
        Insert: {
          ai_callback_delay_minutes?: number | null
          business_phone_number?: string | null
          busy_toggle?: boolean
          closeloop_number?: string | null
          created_at?: string
          go_live_enabled?: boolean
          instant_text_enabled?: boolean
          missed_call_behavior?: Database["public"]["Enums"]["missed_call_behavior"]
          overflow_rings?: number
          phone_connected?: boolean
          sms_first_delay_seconds?: number
          tenant_id: string
          updated_at?: string
          voice_ai_enabled?: boolean
          voice_mode?: Database["public"]["Enums"]["voice_mode"]
        }
        Update: {
          ai_callback_delay_minutes?: number | null
          business_phone_number?: string | null
          busy_toggle?: boolean
          closeloop_number?: string | null
          created_at?: string
          go_live_enabled?: boolean
          instant_text_enabled?: boolean
          missed_call_behavior?: Database["public"]["Enums"]["missed_call_behavior"]
          overflow_rings?: number
          phone_connected?: boolean
          sms_first_delay_seconds?: number
          tenant_id?: string
          updated_at?: string
          voice_ai_enabled?: boolean
          voice_mode?: Database["public"]["Enums"]["voice_mode"]
        }
        Relationships: [
          {
            foreignKeyName: "assistant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          meta_json: Json | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta_json?: Json | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta_json?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          name: string
          steps_json: Json
          tenant_id: string
          trigger: Database["public"]["Enums"]["automation_trigger"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          name: string
          steps_json?: Json
          tenant_id: string
          trigger: Database["public"]["Enums"]["automation_trigger"]
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          name?: string
          steps_json?: Json
          tenant_id?: string
          trigger?: Database["public"]["Enums"]["automation_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          deposit_paid: boolean
          deposit_required: boolean
          end_at: string
          id: string
          lead_id: string
          notes: string | null
          service_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          deposit_paid?: boolean
          deposit_required?: boolean
          end_at: string
          id?: string
          lead_id: string
          notes?: string | null
          service_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          deposit_paid?: boolean
          deposit_required?: boolean
          end_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          service_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_faqs: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          priority_weight: number | null
          question: string
          tenant_id: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          priority_weight?: number | null
          question: string
          tenant_id: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          priority_weight?: number | null
          question?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_faqs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"]
          created_at: string
          customer_id: string | null
          id: string
          lead_id: string
          opportunity_id: string | null
          tenant_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id: string
          opportunity_id?: string | null
          tenant_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string
          opportunity_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_merge_queue: {
        Row: {
          conflict_type: string
          created_at: string
          existing_customer_id: string
          id: string
          incoming_email: string | null
          incoming_name: string | null
          incoming_phone_e164: string
          resolution: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          source: string
          tenant_id: string
        }
        Insert: {
          conflict_type: string
          created_at?: string
          existing_customer_id: string
          id?: string
          incoming_email?: string | null
          incoming_name?: string | null
          incoming_phone_e164: string
          resolution?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          source: string
          tenant_id: string
        }
        Update: {
          conflict_type?: string
          created_at?: string
          existing_customer_id?: string
          id?: string
          incoming_email?: string | null
          incoming_name?: string | null
          incoming_phone_e164?: string
          resolution?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_merge_queue_existing_customer_id_fkey"
            columns: ["existing_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merge_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone_e164: string
          phone_raw: string | null
          source: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone_e164: string
          phone_raw?: string | null
          source?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone_e164?: string
          phone_raw?: string | null
          source?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_gaps: {
        Row: {
          ai_session_id: string | null
          created_at: string
          customer_question: string | null
          description: string
          gap_type: string
          id: string
          occurrence_count: number
          priority: number
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          tenant_id: string
        }
        Insert: {
          ai_session_id?: string | null
          created_at?: string
          customer_question?: string | null
          description: string
          gap_type: string
          id?: string
          occurrence_count?: number
          priority?: number
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id: string
        }
        Update: {
          ai_session_id?: string | null
          created_at?: string
          customer_question?: string | null
          description?: string
          gap_type?: string
          id?: string
          occurrence_count?: number
          priority?: number
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_gaps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_message_at: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[] | null
          tenant_id: string
          vehicle_or_context: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_message_at?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          tenant_id: string
          vehicle_or_context?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_message_at?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          tenant_id?: string
          vehicle_or_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          meta_json: Json | null
          sent_at: string
          status: Database["public"]["Enums"]["message_status"]
          tenant_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          meta_json?: Json | null
          sent_at?: string
          status?: Database["public"]["Enums"]["message_status"]
          tenant_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          meta_json?: Json | null
          sent_at?: string
          status?: Database["public"]["Enums"]["message_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      objection_responses: {
        Row: {
          created_at: string | null
          id: string
          objection: string
          priority_weight: number | null
          response: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          objection: string
          priority_weight?: number | null
          response: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          objection?: string
          priority_weight?: number | null
          response?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objection_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          closed_at: string | null
          context_json: Json | null
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          service_id: string | null
          source: string
          status: string
          tenant_id: string
          updated_at: string
          value_cents: number | null
        }
        Insert: {
          closed_at?: string | null
          context_json?: Json | null
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          service_id?: string | null
          source?: string
          status?: string
          tenant_id: string
          updated_at?: string
          value_cents?: number | null
        }
        Update: {
          closed_at?: string | null
          context_json?: Json | null
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          service_id?: string | null
          source?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          deposit_amount: number | null
          deposit_required: boolean | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          preparation_instructions: string | null
          price_amount: number | null
          price_type: Database["public"]["Enums"]["price_type"]
          tenant_id: string
          upsell_suggestions: string[] | null
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          deposit_required?: boolean | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          preparation_instructions?: string | null
          price_amount?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          tenant_id: string
          upsell_suggestions?: string[] | null
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          deposit_required?: boolean | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          preparation_instructions?: string | null
          price_amount?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          tenant_id?: string
          upsell_suggestions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_code: Database["public"]["Enums"]["plan_code"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_code: Database["public"]["Enums"]["plan_code"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_code?: Database["public"]["Enums"]["plan_code"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_events: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string | null
          event_type: string
          id: string
          payload_json: Json
          sync_target: string | null
          synced: boolean
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          event_type: string
          id?: string
          payload_json?: Json
          sync_target?: string | null
          synced?: boolean
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload_json?: Json
          sync_target?: string | null
          synced?: boolean
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          ai_enabled: boolean
          ai_never_promise: string[] | null
          ai_readiness_score: number | null
          appointment_buffer_minutes: number | null
          cancellation_policy: string | null
          closed_dates: Json | null
          context_fields_json: Json | null
          created_at: string
          custom_industry: string | null
          deposit_policy: string | null
          hours_json: Json | null
          id: string
          industry: Database["public"]["Enums"]["industry_type"]
          max_advance_days: number | null
          min_lead_hours: number | null
          name: string
          onboarding_completed_at: string | null
          payment_methods: string[] | null
          phone_public: string | null
          refund_policy: string | null
          service_area_json: Json | null
          tagline: string | null
          timezone: string
          website_url: string | null
          years_in_business: number | null
        }
        Insert: {
          address?: string | null
          ai_enabled?: boolean
          ai_never_promise?: string[] | null
          ai_readiness_score?: number | null
          appointment_buffer_minutes?: number | null
          cancellation_policy?: string | null
          closed_dates?: Json | null
          context_fields_json?: Json | null
          created_at?: string
          custom_industry?: string | null
          deposit_policy?: string | null
          hours_json?: Json | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          max_advance_days?: number | null
          min_lead_hours?: number | null
          name: string
          onboarding_completed_at?: string | null
          payment_methods?: string[] | null
          phone_public?: string | null
          refund_policy?: string | null
          service_area_json?: Json | null
          tagline?: string | null
          timezone?: string
          website_url?: string | null
          years_in_business?: number | null
        }
        Update: {
          address?: string | null
          ai_enabled?: boolean
          ai_never_promise?: string[] | null
          ai_readiness_score?: number | null
          appointment_buffer_minutes?: number | null
          cancellation_policy?: string | null
          closed_dates?: Json | null
          context_fields_json?: Json | null
          created_at?: string
          custom_industry?: string | null
          deposit_policy?: string | null
          hours_json?: Json | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          max_advance_days?: number | null
          min_lead_hours?: number | null
          name?: string
          onboarding_completed_at?: string | null
          payment_methods?: string[] | null
          phone_public?: string | null
          refund_policy?: string | null
          service_area_json?: Json | null
          tagline?: string | null
          timezone?: string
          website_url?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_ai_readiness: { Args: { _tenant_id: string }; Returns: number }
      fn_build_business_context: { Args: { _tenant_id: string }; Returns: Json }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_active_subscription: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      initialize_assistant_settings: {
        Args: {
          _plan_code: Database["public"]["Enums"]["plan_code"]
          _tenant_id: string
        }
        Returns: undefined
      }
      normalize_phone_e164: { Args: { phone: string }; Returns: string }
      resolve_customer: {
        Args: {
          _email?: string
          _name?: string
          _phone: string
          _source?: string
          _tenant_id: string
        }
        Returns: {
          conflict_id: string
          customer_id: string
          has_conflict: boolean
          is_new: boolean
        }[]
      }
    }
    Enums: {
      ai_call_direction: "inbound" | "outbound"
      ai_call_outcome: "booked" | "followup" | "lost" | "escalated"
      ai_knowledge_type: "faq" | "objection" | "policy" | "upsell"
      ai_tone: "friendly" | "professional" | "luxury" | "direct"
      automation_trigger:
        | "missed_call"
        | "new_lead"
        | "no_reply_10m"
        | "no_reply_24h"
        | "booking_created"
        | "booking_completed"
      booking_status:
        | "pending_deposit"
        | "confirmed"
        | "completed"
        | "canceled"
        | "no_show"
      channel_type: "sms" | "email" | "internal"
      industry_type:
        | "detailing"
        | "hvac"
        | "plumber"
        | "medspa"
        | "dental"
        | "other"
        | "tire_shop"
        | "cleaning"
        | "landscaping"
        | "pest_control"
        | "roofing"
        | "electrical"
        | "pool_service"
        | "moving"
        | "salon"
        | "fitness"
        | "photography"
        | "pet_grooming"
        | "towing"
        | "locksmith"
      lead_source: "missed_call" | "website_form" | "manual" | "referral"
      lead_status: "new" | "contacted" | "qualified" | "booked" | "lost" | "won"
      message_direction: "inbound" | "outbound"
      message_status: "queued" | "sent" | "delivered" | "failed"
      missed_call_behavior: "text_only" | "ai_callback" | "both"
      plan_code: "text" | "voice" | "both"
      price_type: "fixed" | "starting_at" | "quote_only"
      subscription_status: "active" | "trialing" | "past_due" | "canceled"
      user_role: "owner" | "staff" | "super_admin"
      voice_mode: "always_on" | "busy_mode" | "overflow" | "after_hours_only"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_call_direction: ["inbound", "outbound"],
      ai_call_outcome: ["booked", "followup", "lost", "escalated"],
      ai_knowledge_type: ["faq", "objection", "policy", "upsell"],
      ai_tone: ["friendly", "professional", "luxury", "direct"],
      automation_trigger: [
        "missed_call",
        "new_lead",
        "no_reply_10m",
        "no_reply_24h",
        "booking_created",
        "booking_completed",
      ],
      booking_status: [
        "pending_deposit",
        "confirmed",
        "completed",
        "canceled",
        "no_show",
      ],
      channel_type: ["sms", "email", "internal"],
      industry_type: [
        "detailing",
        "hvac",
        "plumber",
        "medspa",
        "dental",
        "other",
        "tire_shop",
        "cleaning",
        "landscaping",
        "pest_control",
        "roofing",
        "electrical",
        "pool_service",
        "moving",
        "salon",
        "fitness",
        "photography",
        "pet_grooming",
        "towing",
        "locksmith",
      ],
      lead_source: ["missed_call", "website_form", "manual", "referral"],
      lead_status: ["new", "contacted", "qualified", "booked", "lost", "won"],
      message_direction: ["inbound", "outbound"],
      message_status: ["queued", "sent", "delivered", "failed"],
      missed_call_behavior: ["text_only", "ai_callback", "both"],
      plan_code: ["text", "voice", "both"],
      price_type: ["fixed", "starting_at", "quote_only"],
      subscription_status: ["active", "trialing", "past_due", "canceled"],
      user_role: ["owner", "staff", "super_admin"],
      voice_mode: ["always_on", "busy_mode", "overflow", "after_hours_only"],
    },
  },
} as const
