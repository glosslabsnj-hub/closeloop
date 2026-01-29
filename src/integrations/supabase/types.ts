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
          elevenlabs_agent_id: string | null
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
          elevenlabs_agent_id?: string | null
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
          elevenlabs_agent_id?: string | null
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
          caller_phone: string | null
          context_json: Json | null
          created_at: string
          customer_id: string | null
          elevenlabs_conversation_id: string | null
          ended_at: string | null
          extracted_payload: Json | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          outcome: Database["public"]["Enums"]["ai_call_outcome"] | null
          started_at: string
          summary: string | null
          tenant_id: string
          transcript: string | null
          twilio_call_sid: string | null
        }
        Insert: {
          booking_id?: string | null
          call_direction: Database["public"]["Enums"]["ai_call_direction"]
          caller_phone?: string | null
          context_json?: Json | null
          created_at?: string
          customer_id?: string | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          extracted_payload?: Json | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          outcome?: Database["public"]["Enums"]["ai_call_outcome"] | null
          started_at?: string
          summary?: string | null
          tenant_id: string
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Update: {
          booking_id?: string | null
          call_direction?: Database["public"]["Enums"]["ai_call_direction"]
          caller_phone?: string | null
          context_json?: Json | null
          created_at?: string
          customer_id?: string | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          extracted_payload?: Json | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          outcome?: Database["public"]["Enums"]["ai_call_outcome"] | null
          started_at?: string
          summary?: string | null
          tenant_id?: string
          transcript?: string | null
          twilio_call_sid?: string | null
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
      ai_context_snapshots: {
        Row: {
          call_sid: string | null
          channel: string
          context_json: Json
          created_at: string
          customer_id: string | null
          id: string
          location_id: string | null
          missing_sections: string[]
          session_id: string
          tenant_id: string
        }
        Insert: {
          call_sid?: string | null
          channel: string
          context_json?: Json
          created_at?: string
          customer_id?: string | null
          id?: string
          location_id?: string | null
          missing_sections?: string[]
          session_id: string
          tenant_id: string
        }
        Update: {
          call_sid?: string | null
          channel?: string
          context_json?: Json
          created_at?: string
          customer_id?: string | null
          id?: string
          location_id?: string | null
          missing_sections?: string[]
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_context_snapshots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_context_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_context_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_event_logs: {
        Row: {
          call_sid: string | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          event_data: Json | null
          id: string
          session_id: string | null
          stage: string
          tenant_id: string
        }
        Insert: {
          call_sid?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          event_data?: Json | null
          id?: string
          session_id?: string | null
          stage: string
          tenant_id: string
        }
        Update: {
          call_sid?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          event_data?: Json | null
          id?: string
          session_id?: string | null
          stage?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_event_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_event_logs_tenant_id_fkey"
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
          ai_booking_mode: string | null
          ai_callback_delay_minutes: number | null
          booking_url: string | null
          business_phone_number: string | null
          busy_toggle: boolean
          calendar_provider: string | null
          closeloop_number: string | null
          connect_status: string | null
          created_at: string
          forwarding_phone_e164: string | null
          go_live_enabled: boolean
          instant_text_enabled: boolean
          missed_call_behavior: Database["public"]["Enums"]["missed_call_behavior"]
          overflow_rings: number
          pending_booking_notify_email: boolean | null
          pending_booking_notify_sms: boolean | null
          phone_connected: boolean
          phone_method: string | null
          setup_completed_at: string | null
          setup_step_calendar: boolean | null
          setup_step_phone: boolean | null
          setup_step_tested: boolean | null
          sms_first_delay_seconds: number
          tenant_id: string
          twilio_phone_sid: string | null
          twilio_provisioned_at: string | null
          updated_at: string
          voice_ai_enabled: boolean
          voice_mode: Database["public"]["Enums"]["voice_mode"]
        }
        Insert: {
          ai_booking_mode?: string | null
          ai_callback_delay_minutes?: number | null
          booking_url?: string | null
          business_phone_number?: string | null
          busy_toggle?: boolean
          calendar_provider?: string | null
          closeloop_number?: string | null
          connect_status?: string | null
          created_at?: string
          forwarding_phone_e164?: string | null
          go_live_enabled?: boolean
          instant_text_enabled?: boolean
          missed_call_behavior?: Database["public"]["Enums"]["missed_call_behavior"]
          overflow_rings?: number
          pending_booking_notify_email?: boolean | null
          pending_booking_notify_sms?: boolean | null
          phone_connected?: boolean
          phone_method?: string | null
          setup_completed_at?: string | null
          setup_step_calendar?: boolean | null
          setup_step_phone?: boolean | null
          setup_step_tested?: boolean | null
          sms_first_delay_seconds?: number
          tenant_id: string
          twilio_phone_sid?: string | null
          twilio_provisioned_at?: string | null
          updated_at?: string
          voice_ai_enabled?: boolean
          voice_mode?: Database["public"]["Enums"]["voice_mode"]
        }
        Update: {
          ai_booking_mode?: string | null
          ai_callback_delay_minutes?: number | null
          booking_url?: string | null
          business_phone_number?: string | null
          busy_toggle?: boolean
          calendar_provider?: string | null
          closeloop_number?: string | null
          connect_status?: string | null
          created_at?: string
          forwarding_phone_e164?: string | null
          go_live_enabled?: boolean
          instant_text_enabled?: boolean
          missed_call_behavior?: Database["public"]["Enums"]["missed_call_behavior"]
          overflow_rings?: number
          pending_booking_notify_email?: boolean | null
          pending_booking_notify_sms?: boolean | null
          phone_connected?: boolean
          phone_method?: string | null
          setup_completed_at?: string | null
          setup_step_calendar?: boolean | null
          setup_step_phone?: boolean | null
          setup_step_tested?: boolean | null
          sms_first_delay_seconds?: number
          tenant_id?: string
          twilio_phone_sid?: string | null
          twilio_provisioned_at?: string | null
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
      audit_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          entity_id: string | null
          entity_type: string | null
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id: string
          location_id: string | null
          occurred_at: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          location_id?: string | null
          occurred_at?: string
          payload?: Json
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          location_id?: string | null
          occurred_at?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
      automation_rules: {
        Row: {
          action_type: string
          behavior_json: Json | null
          created_at: string
          description: string | null
          destination_provider: string
          enabled: boolean
          field_mapping_json: Json | null
          id: string
          integration_id: string | null
          name: string
          priority: number
          tenant_id: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_type: string
          behavior_json?: Json | null
          created_at?: string
          description?: string | null
          destination_provider: string
          enabled?: boolean
          field_mapping_json?: Json | null
          id?: string
          integration_id?: string | null
          name: string
          priority?: number
          tenant_id: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          behavior_json?: Json | null
          created_at?: string
          description?: string | null
          destination_provider?: string
          enabled?: boolean
          field_mapping_json?: Json | null
          id?: string
          integration_id?: string | null
          name?: string
          priority?: number
          tenant_id?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_run_steps: {
        Row: {
          action_type: string
          created_at: string
          destination_provider: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          request_payload: Json | null
          response_payload: Json | null
          run_id: string
          started_at: string
          status: string
        }
        Insert: {
          action_type: string
          created_at?: string
          destination_provider?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          run_id: string
          started_at?: string
          status?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          destination_provider?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          run_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string | null
          finished_at: string | null
          id: string
          payload_snapshot: Json | null
          retry_count: number
          rule_id: string | null
          started_at: string
          status: string
          tenant_id: string
          trigger_event: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          payload_snapshot?: Json | null
          retry_count?: number
          rule_id?: string | null
          started_at?: string
          status?: string
          tenant_id: string
          trigger_event: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          payload_snapshot?: Json | null
          retry_count?: number
          rule_id?: string | null
          started_at?: string
          status?: string
          tenant_id?: string
          trigger_event?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
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
      availability_slots: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_times: {
        Row: {
          created_at: string | null
          end_at: string
          external_event_id: string | null
          id: string
          reason: string | null
          source: string | null
          start_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          end_at: string
          external_event_id?: string | null
          id?: string
          reason?: string | null
          source?: string | null
          start_at: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          end_at?: string
          external_event_id?: string | null
          id?: string
          reason?: string | null
          source?: string | null
          start_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_delivery_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          handoff_methods: Json | null
          notify_email: string | null
          notify_phone: string | null
          tenant_id: string
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          tenant_id: string
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          tenant_id?: string
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_delivery_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      business_intent_rules: {
        Row: {
          action_json: Json
          condition_json: Json
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          is_suggested: boolean | null
          name: string
          priority: number | null
          rule_type: Database["public"]["Enums"]["intent_rule_type"]
          suggested_reason: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          action_json?: Json
          condition_json?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          is_suggested?: boolean | null
          name: string
          priority?: number | null
          rule_type: Database["public"]["Enums"]["intent_rule_type"]
          suggested_reason?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          action_json?: Json
          condition_json?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          is_suggested?: boolean | null
          name?: string
          priority?: number | null
          rule_type?: Database["public"]["Enums"]["intent_rule_type"]
          suggested_reason?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_intent_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_memory: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          first_observed_at: string | null
          id: string
          is_active: boolean | null
          last_observed_at: string | null
          location_id: string | null
          memory_type: Database["public"]["Enums"]["memory_type"]
          observation_count: number | null
          subject_key: string | null
          summary: string
          tenant_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          first_observed_at?: string | null
          id?: string
          is_active?: boolean | null
          last_observed_at?: string | null
          location_id?: string | null
          memory_type: Database["public"]["Enums"]["memory_type"]
          observation_count?: number | null
          subject_key?: string | null
          summary: string
          tenant_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          first_observed_at?: string | null
          id?: string
          is_active?: boolean | null
          last_observed_at?: string | null
          location_id?: string | null
          memory_type?: Database["public"]["Enums"]["memory_type"]
          observation_count?: number | null
          subject_key?: string | null
          summary?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_memory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catering_requests: {
        Row: {
          budget_range: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          dietary_restrictions: string | null
          event_date: string | null
          event_time: string | null
          event_type: string | null
          guest_count: number | null
          id: string
          location: string | null
          menu_preferences: string | null
          notes: string | null
          quote_amount_cents: number | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          dietary_restrictions?: string | null
          event_date?: string | null
          event_time?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          location?: string | null
          menu_preferences?: string | null
          notes?: string | null
          quote_amount_cents?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          dietary_restrictions?: string | null
          event_date?: string | null
          event_time?: string | null
          event_type?: string | null
          guest_count?: number | null
          id?: string
          location?: string | null
          menu_preferences?: string | null
          notes?: string | null
          quote_amount_cents?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catering_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catering_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmation_receipts: {
        Row: {
          confirmation_hash: string
          confirmation_summary: string
          confirmed_by: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tenant_id: string
        }
        Insert: {
          confirmation_hash: string
          confirmation_summary: string
          confirmed_by: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tenant_id: string
        }
        Update: {
          confirmation_hash?: string
          confirmation_summary?: string
          confirmed_by?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_receipts_tenant_id_fkey"
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
      data_retention_settings: {
        Row: {
          allow_customer_memory: boolean
          audit_log_retention_days: number | null
          call_summary_retention_days: number | null
          created_at: string
          phi_minimization_enabled: boolean
          recording_retention_days: number | null
          require_verbal_consent: boolean
          store_caller_phone: boolean
          store_recordings: boolean
          store_transcripts: boolean
          tenant_id: string
          transcript_retention_days: number | null
          updated_at: string
        }
        Insert: {
          allow_customer_memory?: boolean
          audit_log_retention_days?: number | null
          call_summary_retention_days?: number | null
          created_at?: string
          phi_minimization_enabled?: boolean
          recording_retention_days?: number | null
          require_verbal_consent?: boolean
          store_caller_phone?: boolean
          store_recordings?: boolean
          store_transcripts?: boolean
          tenant_id: string
          transcript_retention_days?: number | null
          updated_at?: string
        }
        Update: {
          allow_customer_memory?: boolean
          audit_log_retention_days?: number | null
          call_summary_retention_days?: number | null
          created_at?: string
          phi_minimization_enabled?: boolean
          recording_retention_days?: number | null
          require_verbal_consent?: boolean
          store_caller_phone?: boolean
          store_recordings?: boolean
          store_transcripts?: boolean
          tenant_id?: string
          transcript_retention_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempts: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["delivery_entity_type"]
          error_message: string | null
          id: string
          method: string
          request_payload: Json | null
          response_body: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["delivery_entity_type"]
          error_message?: string | null
          id?: string
          method: string
          request_payload?: Json | null
          response_body?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["delivery_entity_type"]
          error_message?: string | null
          id?: string
          method?: string
          request_payload?: Json | null
          response_body?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_rules: {
        Row: {
          auto_confirm: boolean
          created_at: string
          entity_type: Database["public"]["Enums"]["delivery_entity_type"]
          id: string
          notify_on_new: boolean
          review_queue_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_confirm?: boolean
          created_at?: string
          entity_type: Database["public"]["Enums"]["delivery_entity_type"]
          id?: string
          notify_on_new?: boolean
          review_queue_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_confirm?: boolean
          created_at?: string
          entity_type?: Database["public"]["Enums"]["delivery_entity_type"]
          id?: string
          notify_on_new?: boolean
          review_queue_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_delivery_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          handoff_methods: Json | null
          notify_email: string | null
          notify_phone: string | null
          tenant_id: string
          updated_at: string | null
          urgent_sms_phone: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          tenant_id: string
          updated_at?: string | null
          urgent_sms_phone?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          tenant_id?: string
          updated_at?: string | null
          urgent_sms_phone?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_delivery_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_jobs: {
        Row: {
          arrived_at: string | null
          assigned_crew: string | null
          assigned_vehicle: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          dispatched_at: string | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_duration_minutes: number | null
          id: string
          job_number: string
          job_type: string | null
          notes: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          price_cents: number | null
          priority: Database["public"]["Enums"]["dispatch_priority"]
          requested_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["dispatch_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          assigned_crew?: string | null
          assigned_vehicle?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          dispatched_at?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          job_number: string
          job_type?: string | null
          notes?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price_cents?: number | null
          priority?: Database["public"]["Enums"]["dispatch_priority"]
          requested_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          assigned_crew?: string | null
          assigned_vehicle?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          dispatched_at?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          job_number?: string
          job_type?: string | null
          notes?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price_cents?: number | null
          priority?: Database["public"]["Enums"]["dispatch_priority"]
          requested_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_knowledge_suggestions: {
        Row: {
          created_at: string
          extracted_data: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
          status: Database["public"]["Enums"]["suggestion_status"]
          suggestion_type: Database["public"]["Enums"]["suggestion_type"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          extracted_data?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggestion_type: Database["public"]["Enums"]["suggestion_type"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          extracted_data?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggestion_type?: Database["public"]["Enums"]["suggestion_type"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_knowledge_suggestions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_knowledge_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      food_order_settings: {
        Row: {
          accepts_catering: boolean | null
          accepts_delivery: boolean | null
          accepts_dine_in: boolean | null
          accepts_pickup: boolean | null
          catering_lead_days: number | null
          catering_min_guests: number | null
          created_at: string | null
          delivery_minimum_cents: number | null
          delivery_radius_miles: number | null
          estimated_prep_minutes: number | null
          menu_notes: string | null
          order_confirmation_mode: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          accepts_catering?: boolean | null
          accepts_delivery?: boolean | null
          accepts_dine_in?: boolean | null
          accepts_pickup?: boolean | null
          catering_lead_days?: number | null
          catering_min_guests?: number | null
          created_at?: string | null
          delivery_minimum_cents?: number | null
          delivery_radius_miles?: number | null
          estimated_prep_minutes?: number | null
          menu_notes?: string | null
          order_confirmation_mode?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          accepts_catering?: boolean | null
          accepts_delivery?: boolean | null
          accepts_dine_in?: boolean | null
          accepts_pickup?: boolean | null
          catering_lead_days?: number | null
          catering_min_guests?: number | null
          created_at?: string | null
          delivery_minimum_cents?: number | null
          delivery_radius_miles?: number | null
          estimated_prep_minutes?: number | null
          menu_notes?: string | null
          order_confirmation_mode?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_order_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      food_orders: {
        Row: {
          address_json: Json | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          handoff_state: Json | null
          id: string
          items_json: Json
          order_number: string
          order_type: string
          requested_time: string | null
          scheduled_at: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number | null
          tax_cents: number | null
          tenant_id: string
          total_cents: number | null
          totals_estimate: Json | null
          updated_at: string
        }
        Insert: {
          address_json?: Json | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          handoff_state?: Json | null
          id?: string
          items_json?: Json
          order_number: string
          order_type?: string
          requested_time?: string | null
          scheduled_at?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number | null
          tax_cents?: number | null
          tenant_id: string
          total_cents?: number | null
          totals_estimate?: Json | null
          updated_at?: string
        }
        Update: {
          address_json?: Json | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          handoff_state?: Json | null
          id?: string
          items_json?: Json
          order_number?: string
          order_type?: string
          requested_time?: string | null
          scheduled_at?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number | null
          tax_cents?: number | null
          tenant_id?: string
          total_cents?: number | null
          totals_estimate?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      handoff_attempts: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          method: string
          order_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          method: string
          order_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          method?: string
          order_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handoff_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoff_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_demos: {
        Row: {
          audio_url: string | null
          caption_bullets: Json
          created_at: string
          id: string
          industry_key: string
          is_active: boolean
          title: string
          transcript_excerpt: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          caption_bullets?: Json
          created_at?: string
          id?: string
          industry_key: string
          is_active?: boolean
          title: string
          transcript_excerpt?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          caption_bullets?: Json
          created_at?: string
          id?: string
          industry_key?: string
          is_active?: boolean
          title?: string
          transcript_excerpt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_secrets: {
        Row: {
          created_at: string
          encrypted_value: string
          expires_at: string | null
          id: string
          integration_id: string
          secret_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_value: string
          expires_at?: string | null
          id?: string
          integration_id: string
          secret_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_value?: string
          expires_at?: string | null
          id?: string
          integration_id?: string
          secret_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_secrets_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          auth_type: string
          config_json: Json | null
          created_at: string
          display_name: string
          error_message: string | null
          id: string
          last_tested_at: string | null
          provider: string
          scopes_json: Json | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_type?: string
          config_json?: Json | null
          created_at?: string
          display_name: string
          error_message?: string | null
          id?: string
          last_tested_at?: string | null
          provider: string
          scopes_json?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          config_json?: Json | null
          created_at?: string
          display_name?: string
          error_message?: string | null
          id?: string
          last_tested_at?: string | null
          provider?: string
          scopes_json?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_conflicts: {
        Row: {
          conflict_type: Database["public"]["Enums"]["conflict_type"]
          created_at: string
          differing_fields: string[]
          entity_type: string
          existing_data: Json
          existing_entity_id: string | null
          id: string
          proposed_data: Json
          resolved_at: string | null
          resolved_by: string | null
          source_id: string
          status: Database["public"]["Enums"]["conflict_status"]
          tenant_id: string
        }
        Insert: {
          conflict_type?: Database["public"]["Enums"]["conflict_type"]
          created_at?: string
          differing_fields?: string[]
          entity_type: string
          existing_data?: Json
          existing_entity_id?: string | null
          id?: string
          proposed_data?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          source_id: string
          status?: Database["public"]["Enums"]["conflict_status"]
          tenant_id: string
        }
        Update: {
          conflict_type?: Database["public"]["Enums"]["conflict_type"]
          created_at?: string
          differing_fields?: string[]
          entity_type?: string
          existing_data?: Json
          existing_entity_id?: string | null
          id?: string
          proposed_data?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string
          status?: Database["public"]["Enums"]["conflict_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_conflicts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_conflicts_tenant_id_fkey"
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
      knowledge_sources: {
        Row: {
          created_at: string
          error_message: string | null
          file_name: string
          file_url: string | null
          id: string
          processed_at: string | null
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          status: Database["public"]["Enums"]["knowledge_source_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_name: string
          file_url?: string | null
          id?: string
          processed_at?: string | null
          source_type?: Database["public"]["Enums"]["knowledge_source_type"]
          status?: Database["public"]["Enums"]["knowledge_source_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_url?: string | null
          id?: string
          processed_at?: string | null
          source_type?: Database["public"]["Enums"]["knowledge_source_type"]
          status?: Database["public"]["Enums"]["knowledge_source_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_tenant_id_fkey"
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
      medical_intakes: {
        Row: {
          ai_summary: string | null
          call_session_id: string | null
          consent_timestamp: string | null
          created_at: string
          customer_id: string | null
          id: string
          insurance_provider: string | null
          intake_type: string | null
          preferred_date: string | null
          preferred_time_range: string | null
          reason_for_visit: string | null
          status: string
          tenant_id: string
          updated_at: string
          urgency_level: string | null
          verbal_consent_given: boolean | null
        }
        Insert: {
          ai_summary?: string | null
          call_session_id?: string | null
          consent_timestamp?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          insurance_provider?: string | null
          intake_type?: string | null
          preferred_date?: string | null
          preferred_time_range?: string | null
          reason_for_visit?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          urgency_level?: string | null
          verbal_consent_given?: boolean | null
        }
        Update: {
          ai_summary?: string | null
          call_session_id?: string | null
          consent_timestamp?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          insurance_provider?: string | null
          intake_type?: string | null
          preferred_date?: string | null
          preferred_time_range?: string | null
          reason_for_visit?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          urgency_level?: string | null
          verbal_consent_given?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_intakes_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_intakes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_intakes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_settings: {
        Row: {
          created_at: string
          id: string
          intake_fields_json: Json | null
          require_verbal_consent: boolean
          retention_days: number
          scheduling_rules_json: Json | null
          store_recordings: boolean
          store_transcripts: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intake_fields_json?: Json | null
          require_verbal_consent?: boolean
          retention_days?: number
          scheduling_rules_json?: Json | null
          store_recordings?: boolean
          store_transcripts?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intake_fields_json?: Json | null
          require_verbal_consent?: boolean
          retention_days?: number
          scheduling_rules_json?: Json | null
          store_recordings?: boolean
          store_transcripts?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_documents: {
        Row: {
          created_at: string
          file_name: string
          file_url: string | null
          id: string
          parsed_json: Json | null
          parsed_text: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url?: string | null
          id?: string
          parsed_json?: Json | null
          parsed_text?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string | null
          id?: string
          parsed_json?: Json | null
          parsed_text?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          dietary_tags: string[] | null
          id: string
          is_available: boolean
          modifiers: string[] | null
          name: string
          prep_time_minutes: number | null
          price_cents: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          is_available?: boolean
          modifiers?: string[] | null
          name: string
          prep_time_minutes?: number | null
          price_cents?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          is_available?: boolean
          modifiers?: string[] | null
          name?: string
          prep_time_minutes?: number | null
          price_cents?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_tenant_id_fkey"
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
      order_delivery_settings: {
        Row: {
          auto_print: boolean | null
          cancel_window_minutes: number | null
          created_at: string | null
          enabled: boolean | null
          handoff_methods: Json | null
          notify_email: string | null
          notify_phone: string | null
          print_format: string | null
          tenant_id: string
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          auto_print?: boolean | null
          cancel_window_minutes?: number | null
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          print_format?: string | null
          tenant_id: string
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          auto_print?: boolean | null
          cancel_window_minutes?: number | null
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          print_format?: string | null
          tenant_id?: string
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_delivery_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_notifications: {
        Row: {
          action_path: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_source_id: string | null
          severity: Database["public"]["Enums"]["notification_severity"]
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          action_path?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_source_id?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          action_path?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_source_id?: string | null
          severity?: Database["public"]["Enums"]["notification_severity"]
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "owner_notifications_related_source_id_fkey"
            columns: ["related_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          phone_e164: string
          purpose: string
          status: string
          tenant_id: string
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          phone_e164: string
          purpose?: string
          status?: string
          tenant_id: string
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          phone_e164?: string
          purpose?: string
          status?: string
          tenant_id?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_numbers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          party_size: number
          reservation_date: string
          reservation_time: string
          special_requests: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          table_preference: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          reservation_date: string
          reservation_time: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          table_preference?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          table_preference?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          audit_days: number
          created_at: string
          hipaa_mode: boolean
          recording_days: number
          store_recordings: boolean
          store_transcripts: boolean
          tenant_id: string
          transcript_days: number
          updated_at: string
        }
        Insert: {
          audit_days?: number
          created_at?: string
          hipaa_mode?: boolean
          recording_days?: number
          store_recordings?: boolean
          store_transcripts?: boolean
          tenant_id: string
          transcript_days?: number
          updated_at?: string
        }
        Update: {
          audit_days?: number
          created_at?: string
          hipaa_mode?: boolean
          recording_days?: number
          store_recordings?: boolean
          store_transcripts?: boolean
          tenant_id?: string
          transcript_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      subscription_usage: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string | null
          id: string
          sms_segments_used: number | null
          tenant_id: string
          updated_at: string | null
          voice_minutes_used: number | null
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string | null
          id?: string
          sms_segments_used?: number | null
          tenant_id: string
          updated_at?: string | null
          voice_minutes_used?: number | null
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string | null
          id?: string
          sms_segments_used?: number | null
          tenant_id?: string
          updated_at?: string | null
          voice_minutes_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_tenant_id_fkey"
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
          included_minutes: number | null
          included_sms_segments: number | null
          overage_minute_rate_cents: number | null
          overage_sms_rate_cents: number | null
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
          included_minutes?: number | null
          included_sms_segments?: number | null
          overage_minute_rate_cents?: number | null
          overage_sms_rate_cents?: number | null
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
          included_minutes?: number | null
          included_sms_segments?: number | null
          overage_minute_rate_cents?: number | null
          overage_sms_rate_cents?: number | null
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
      tenant_intelligence_settings: {
        Row: {
          copilot_can_suggest_rules: boolean | null
          created_at: string | null
          memory_enabled: boolean | null
          min_confidence_threshold: number | null
          min_observation_threshold: number | null
          share_memory_across_locations: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          copilot_can_suggest_rules?: boolean | null
          created_at?: string | null
          memory_enabled?: boolean | null
          min_confidence_threshold?: number | null
          min_observation_threshold?: number | null
          share_memory_across_locations?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          copilot_can_suggest_rules?: boolean | null
          created_at?: string | null
          memory_enabled?: boolean | null
          min_confidence_threshold?: number | null
          min_observation_threshold?: number | null
          share_memory_across_locations?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_intelligence_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_locations: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          location_name: string
          monthly_fee_cents: number
          phone_number_id: string | null
          status: string | null
          stripe_subscription_item_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          location_name: string
          monthly_fee_cents: number
          phone_number_id?: string | null
          status?: string | null
          stripe_subscription_item_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          location_name?: string
          monthly_fee_cents?: number
          phone_number_id?: string | null
          status?: string | null
          stripe_subscription_item_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_locations_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_locations_tenant_id_fkey"
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
          ai_policies_json: Json | null
          ai_readiness_score: number | null
          appointment_buffer_minutes: number | null
          business_mode: Database["public"]["Enums"]["business_mode"]
          calendar_last_synced_at: string | null
          calendar_sync_enabled: boolean | null
          calendar_sync_provider: string | null
          cancellation_policy: string | null
          closed_dates: Json | null
          context_fields_json: Json | null
          created_at: string
          custom_industry: string | null
          deposit_policy: string | null
          enabled_modules: Json | null
          food_settings: Json | null
          hipaa_mode: boolean
          hours_json: Json | null
          id: string
          industry: string
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
          ai_policies_json?: Json | null
          ai_readiness_score?: number | null
          appointment_buffer_minutes?: number | null
          business_mode?: Database["public"]["Enums"]["business_mode"]
          calendar_last_synced_at?: string | null
          calendar_sync_enabled?: boolean | null
          calendar_sync_provider?: string | null
          cancellation_policy?: string | null
          closed_dates?: Json | null
          context_fields_json?: Json | null
          created_at?: string
          custom_industry?: string | null
          deposit_policy?: string | null
          enabled_modules?: Json | null
          food_settings?: Json | null
          hipaa_mode?: boolean
          hours_json?: Json | null
          id?: string
          industry?: string
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
          ai_policies_json?: Json | null
          ai_readiness_score?: number | null
          appointment_buffer_minutes?: number | null
          business_mode?: Database["public"]["Enums"]["business_mode"]
          calendar_last_synced_at?: string | null
          calendar_sync_enabled?: boolean | null
          calendar_sync_provider?: string | null
          cancellation_policy?: string | null
          closed_dates?: Json | null
          context_fields_json?: Json | null
          created_at?: string
          custom_industry?: string | null
          deposit_policy?: string | null
          enabled_modules?: Json | null
          food_settings?: Json | null
          hipaa_mode?: boolean
          hours_json?: Json | null
          id?: string
          industry?: string
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
      twilio_event_logs: {
        Row: {
          created_at: string
          error_message: string | null
          from_number: string
          http_status: number | null
          id: string
          raw_payload: Json | null
          stage: string
          tenant_id: string | null
          to_number: string
          twilio_call_sid: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          from_number: string
          http_status?: number | null
          id?: string
          raw_payload?: Json | null
          stage: string
          tenant_id?: string | null
          to_number: string
          twilio_call_sid: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          from_number?: string
          http_status?: number | null
          id?: string
          raw_payload?: Json | null
          stage?: string
          tenant_id?: string | null
          to_number?: string
          twilio_call_sid?: string
        }
        Relationships: [
          {
            foreignKeyName: "twilio_event_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_delivery_settings: {
        Row: {
          auth_header_name: string | null
          auth_header_value: string | null
          auth_mode: Database["public"]["Enums"]["webhook_auth_mode"]
          basic_pass: string | null
          basic_user: string | null
          created_at: string
          email_enabled: boolean
          internal_enabled: boolean
          notify_email: string | null
          notify_phone: string | null
          sms_enabled: boolean
          tenant_id: string
          updated_at: string
          webhook_enabled: boolean
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          auth_header_name?: string | null
          auth_header_value?: string | null
          auth_mode?: Database["public"]["Enums"]["webhook_auth_mode"]
          basic_pass?: string | null
          basic_user?: string | null
          created_at?: string
          email_enabled?: boolean
          internal_enabled?: boolean
          notify_email?: string | null
          notify_phone?: string | null
          sms_enabled?: boolean
          tenant_id: string
          updated_at?: string
          webhook_enabled?: boolean
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          auth_header_name?: string | null
          auth_header_value?: string | null
          auth_mode?: Database["public"]["Enums"]["webhook_auth_mode"]
          basic_pass?: string | null
          basic_user?: string | null
          created_at?: string
          email_enabled?: boolean
          internal_enabled?: boolean
          notify_email?: string | null
          notify_phone?: string | null
          sms_enabled?: boolean
          tenant_id?: string
          updated_at?: string
          webhook_enabled?: boolean
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "universal_delivery_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      webhook_executions: {
        Row: {
          entity_id: string
          executed_at: string
          id: string
          idempotency_key: string
          node_id: string
          response_body: string | null
          response_code: number | null
          run_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          entity_id: string
          executed_at?: string
          id?: string
          idempotency_key: string
          node_id: string
          response_body?: string | null
          response_code?: number | null
          run_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          entity_id?: string
          executed_at?: string
          id?: string
          idempotency_key?: string
          node_id?: string
          response_body?: string | null
          response_code?: number | null
          run_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_executions_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_executions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          condition: Json
          created_at: string
          from_node_id: string
          id: string
          label: string | null
          to_node_id: string
          workflow_id: string
        }
        Insert: {
          condition?: Json
          created_at?: string
          from_node_id: string
          id?: string
          label?: string | null
          to_node_id: string
          workflow_id: string
        }
        Update: {
          condition?: Json
          created_at?: string
          from_node_id?: string
          id?: string
          label?: string | null
          to_node_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          node_type: Database["public"]["Enums"]["workflow_node_type"]
          position: Json
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          node_type: Database["public"]["Enums"]["workflow_node_type"]
          position?: Json
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          node_type?: Database["public"]["Enums"]["workflow_node_type"]
          position?: Json
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_steps: {
        Row: {
          can_retry: boolean | null
          error: string | null
          finished_at: string | null
          id: string
          node_id: string
          node_type: Database["public"]["Enums"]["workflow_node_type"]
          output: Json
          retry_count: number | null
          run_id: string
          started_at: string
          status: string
        }
        Insert: {
          can_retry?: boolean | null
          error?: string | null
          finished_at?: string | null
          id?: string
          node_id: string
          node_type: Database["public"]["Enums"]["workflow_node_type"]
          output?: Json
          retry_count?: number | null
          run_id: string
          started_at?: string
          status?: string
        }
        Update: {
          can_retry?: boolean | null
          error?: string | null
          finished_at?: string | null
          id?: string
          node_id?: string
          node_type?: Database["public"]["Enums"]["workflow_node_type"]
          output?: Json
          retry_count?: number | null
          run_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_steps_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          context: Json
          entity_id: string
          entity_type: string
          error: string | null
          finished_at: string | null
          id: string
          is_dry_run: boolean | null
          parent_run_id: string | null
          retry_count: number | null
          started_at: string
          status: Database["public"]["Enums"]["workflow_run_status"]
          tenant_id: string
          trigger: Database["public"]["Enums"]["workflow_trigger"]
          workflow_id: string
        }
        Insert: {
          context?: Json
          entity_id: string
          entity_type: string
          error?: string | null
          finished_at?: string | null
          id?: string
          is_dry_run?: boolean | null
          parent_run_id?: string | null
          retry_count?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_run_status"]
          tenant_id: string
          trigger: Database["public"]["Enums"]["workflow_trigger"]
          workflow_id: string
        }
        Update: {
          context?: Json
          entity_id?: string
          entity_type?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          is_dry_run?: boolean | null
          parent_run_id?: string | null
          retry_count?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_run_status"]
          tenant_id?: string
          trigger?: Database["public"]["Enums"]["workflow_trigger"]
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_scheduled_steps: {
        Row: {
          created_at: string
          executed: boolean
          id: string
          node_id: string
          run_id: string
          scheduled_for: string
        }
        Insert: {
          created_at?: string
          executed?: boolean
          id?: string
          node_id: string
          run_id: string
          scheduled_for: string
        }
        Update: {
          created_at?: string
          executed?: boolean
          id?: string
          node_id?: string
          run_id?: string
          scheduled_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_scheduled_steps_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_scheduled_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          location_id: string | null
          name: string
          status: Database["public"]["Enums"]["workflow_status"]
          tenant_id: string
          trigger: Database["public"]["Enums"]["workflow_trigger"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          location_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["workflow_status"]
          tenant_id: string
          trigger: Database["public"]["Enums"]["workflow_trigger"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          location_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          tenant_id?: string
          trigger?: Database["public"]["Enums"]["workflow_trigger"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflows_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      booking_delivery_settings_safe: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          handoff_methods: Json | null
          notify_email: string | null
          notify_phone: string | null
          tenant_id: string | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          webhook_secret?: never
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          webhook_secret?: never
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_delivery_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_delivery_settings_safe: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          handoff_methods: Json | null
          notify_email: string | null
          notify_phone: string | null
          tenant_id: string | null
          updated_at: string | null
          urgent_sms_phone: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          urgent_sms_phone?: string | null
          webhook_secret?: never
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          urgent_sms_phone?: string | null
          webhook_secret?: never
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_delivery_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_delivery_settings_safe: {
        Row: {
          auto_print: boolean | null
          cancel_window_minutes: number | null
          created_at: string | null
          enabled: boolean | null
          handoff_methods: Json | null
          notify_email: string | null
          notify_phone: string | null
          print_format: string | null
          tenant_id: string | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          auto_print?: boolean | null
          cancel_window_minutes?: number | null
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          print_format?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          webhook_secret?: never
          webhook_url?: string | null
        }
        Update: {
          auto_print?: boolean | null
          cancel_window_minutes?: number | null
          created_at?: string | null
          enabled?: boolean | null
          handoff_methods?: Json | null
          notify_email?: string | null
          notify_phone?: string | null
          print_format?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          webhook_secret?: never
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_delivery_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      initialize_delivery_rules: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      initialize_intelligence_settings: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      initialize_retention_settings: {
        Args: { _tenant_id: string }
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
      ai_call_outcome:
        | "booked"
        | "followup"
        | "lost"
        | "escalated"
        | "order"
        | "dispatch"
        | "message"
        | "lead_captured"
      ai_knowledge_type: "faq" | "objection" | "policy" | "upsell"
      ai_tone: "friendly" | "professional" | "luxury" | "direct"
      audit_event_type:
        | "call.started"
        | "call.ended"
        | "sms.received"
        | "sms.sent"
        | "order.created"
        | "order.confirmed"
        | "booking.created"
        | "booking.confirmed"
        | "dispatch.created"
        | "dispatch.confirmed"
        | "handoff.sent"
        | "handoff.failed"
        | "ai.summary.created"
        | "ai.policy.violation"
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
      business_mode: "service" | "dispatch" | "food" | "medical" | "general"
      channel_type: "sms" | "email" | "internal"
      conflict_status:
        | "unresolved"
        | "keep_existing"
        | "accept_upload"
        | "custom_merged"
      conflict_type:
        | "price_mismatch"
        | "description_mismatch"
        | "name_mismatch"
        | "duration_mismatch"
        | "other"
      delivery_entity_type:
        | "order"
        | "booking"
        | "dispatch"
        | "reservation"
        | "catering"
        | "intake"
      dispatch_priority: "low" | "normal" | "high" | "urgent"
      dispatch_status:
        | "pending"
        | "assigned"
        | "en_route"
        | "on_site"
        | "completed"
        | "cancelled"
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
      intent_rule_type:
        | "time_preference"
        | "upsell_rule"
        | "discount_guardrail"
        | "urgency_handling"
        | "capacity_protection"
      knowledge_source_status: "uploading" | "processing" | "ready" | "failed"
      knowledge_source_type:
        | "menu_pdf"
        | "pricing"
        | "services_doc"
        | "faq_doc"
        | "general"
      lead_source: "missed_call" | "website_form" | "manual" | "referral"
      lead_status: "new" | "contacted" | "qualified" | "booked" | "lost" | "won"
      memory_type:
        | "customer_preference"
        | "time_pattern"
        | "service_pattern"
        | "capacity_pattern"
        | "exception_pattern"
      message_direction: "inbound" | "outbound"
      message_status: "queued" | "sent" | "delivered" | "failed"
      missed_call_behavior: "text_only" | "ai_callback" | "both"
      notification_severity: "info" | "warning" | "critical"
      notification_type:
        | "upload_processing"
        | "upload_ready"
        | "upload_failed"
        | "suggestions_pending"
        | "conflicts_detected"
        | "conflicts_resolved"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
        | "needs_followup"
      plan_code:
        | "text"
        | "voice"
        | "both"
        | "sms-500"
        | "sms-1500"
        | "sms-3500"
        | "voice-200"
        | "voice-600"
        | "voice-1500"
        | "both-200-500"
        | "both-600-1500"
        | "both-1500-3500"
      price_type: "fixed" | "starting_at" | "quote_only"
      reservation_status:
        | "pending"
        | "confirmed"
        | "seated"
        | "completed"
        | "cancelled"
        | "no_show"
      subscription_status: "active" | "trialing" | "past_due" | "canceled"
      suggestion_status: "pending_review" | "approved" | "rejected" | "merged"
      suggestion_type: "service" | "faq" | "menu_item" | "policy" | "objection"
      user_role: "owner" | "staff" | "super_admin"
      voice_mode: "always_on" | "busy_mode" | "overflow" | "after_hours_only"
      webhook_auth_mode: "none" | "header" | "basic"
      workflow_node_type:
        | "print_ticket"
        | "notify_sms"
        | "notify_email"
        | "webhook_push"
        | "update_crm"
        | "create_calendar_event"
        | "assign_to_user"
        | "delay"
        | "branch"
        | "set_field"
      workflow_run_status: "running" | "success" | "failed" | "cancelled"
      workflow_status: "draft" | "active" | "paused" | "archived"
      workflow_trigger:
        | "order.created"
        | "order.confirmed"
        | "order.ready"
        | "order.completed"
        | "booking.created"
        | "booking.confirmed"
        | "booking.completed"
        | "dispatch.created"
        | "dispatch.confirmed"
        | "dispatch.completed"
        | "reservation.created"
        | "reservation.confirmed"
        | "catering.created"
        | "catering.quoted"
        | "intake.created"
        | "intake.scheduled"
        | "call.ended"
        | "sms.received"
        | "missed_call"
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
      ai_call_outcome: [
        "booked",
        "followup",
        "lost",
        "escalated",
        "order",
        "dispatch",
        "message",
        "lead_captured",
      ],
      ai_knowledge_type: ["faq", "objection", "policy", "upsell"],
      ai_tone: ["friendly", "professional", "luxury", "direct"],
      audit_event_type: [
        "call.started",
        "call.ended",
        "sms.received",
        "sms.sent",
        "order.created",
        "order.confirmed",
        "booking.created",
        "booking.confirmed",
        "dispatch.created",
        "dispatch.confirmed",
        "handoff.sent",
        "handoff.failed",
        "ai.summary.created",
        "ai.policy.violation",
      ],
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
      business_mode: ["service", "dispatch", "food", "medical", "general"],
      channel_type: ["sms", "email", "internal"],
      conflict_status: [
        "unresolved",
        "keep_existing",
        "accept_upload",
        "custom_merged",
      ],
      conflict_type: [
        "price_mismatch",
        "description_mismatch",
        "name_mismatch",
        "duration_mismatch",
        "other",
      ],
      delivery_entity_type: [
        "order",
        "booking",
        "dispatch",
        "reservation",
        "catering",
        "intake",
      ],
      dispatch_priority: ["low", "normal", "high", "urgent"],
      dispatch_status: [
        "pending",
        "assigned",
        "en_route",
        "on_site",
        "completed",
        "cancelled",
      ],
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
      intent_rule_type: [
        "time_preference",
        "upsell_rule",
        "discount_guardrail",
        "urgency_handling",
        "capacity_protection",
      ],
      knowledge_source_status: ["uploading", "processing", "ready", "failed"],
      knowledge_source_type: [
        "menu_pdf",
        "pricing",
        "services_doc",
        "faq_doc",
        "general",
      ],
      lead_source: ["missed_call", "website_form", "manual", "referral"],
      lead_status: ["new", "contacted", "qualified", "booked", "lost", "won"],
      memory_type: [
        "customer_preference",
        "time_pattern",
        "service_pattern",
        "capacity_pattern",
        "exception_pattern",
      ],
      message_direction: ["inbound", "outbound"],
      message_status: ["queued", "sent", "delivered", "failed"],
      missed_call_behavior: ["text_only", "ai_callback", "both"],
      notification_severity: ["info", "warning", "critical"],
      notification_type: [
        "upload_processing",
        "upload_ready",
        "upload_failed",
        "suggestions_pending",
        "conflicts_detected",
        "conflicts_resolved",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
        "needs_followup",
      ],
      plan_code: [
        "text",
        "voice",
        "both",
        "sms-500",
        "sms-1500",
        "sms-3500",
        "voice-200",
        "voice-600",
        "voice-1500",
        "both-200-500",
        "both-600-1500",
        "both-1500-3500",
      ],
      price_type: ["fixed", "starting_at", "quote_only"],
      reservation_status: [
        "pending",
        "confirmed",
        "seated",
        "completed",
        "cancelled",
        "no_show",
      ],
      subscription_status: ["active", "trialing", "past_due", "canceled"],
      suggestion_status: ["pending_review", "approved", "rejected", "merged"],
      suggestion_type: ["service", "faq", "menu_item", "policy", "objection"],
      user_role: ["owner", "staff", "super_admin"],
      voice_mode: ["always_on", "busy_mode", "overflow", "after_hours_only"],
      webhook_auth_mode: ["none", "header", "basic"],
      workflow_node_type: [
        "print_ticket",
        "notify_sms",
        "notify_email",
        "webhook_push",
        "update_crm",
        "create_calendar_event",
        "assign_to_user",
        "delay",
        "branch",
        "set_field",
      ],
      workflow_run_status: ["running", "success", "failed", "cancelled"],
      workflow_status: ["draft", "active", "paused", "archived"],
      workflow_trigger: [
        "order.created",
        "order.confirmed",
        "order.ready",
        "order.completed",
        "booking.created",
        "booking.confirmed",
        "booking.completed",
        "dispatch.created",
        "dispatch.confirmed",
        "dispatch.completed",
        "reservation.created",
        "reservation.confirmed",
        "catering.created",
        "catering.quoted",
        "intake.created",
        "intake.scheduled",
        "call.ended",
        "sms.received",
        "missed_call",
      ],
    },
  },
} as const
