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
      active_jobs: {
        Row: {
          actual_completion: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          estimated_completion: string | null
          id: string
          intake_method: string
          is_active: boolean
          job_number: string
          location_id: string | null
          metadata_json: Json
          notes: string | null
          notify_on_all_complete: boolean
          notify_on_step_complete: boolean
          priority: string
          source_session_id: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_completion?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          estimated_completion?: string | null
          id?: string
          intake_method?: string
          is_active?: boolean
          job_number: string
          location_id?: string | null
          metadata_json?: Json
          notes?: string | null
          notify_on_all_complete?: boolean
          notify_on_step_complete?: boolean
          priority?: string
          source_session_id?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_completion?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          estimated_completion?: string | null
          id?: string
          intake_method?: string
          is_active?: boolean
          job_number?: string
          location_id?: string | null
          metadata_json?: Json
          notes?: string | null
          notify_on_all_complete?: boolean
          notify_on_step_complete?: boolean
          priority?: string
          source_session_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "customer_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          admin_active_mode: string | null
          admin_active_tenant_id: string | null
          admin_phone_e164: string | null
          admin_phone_verified: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_active_mode?: string | null
          admin_active_tenant_id?: string | null
          admin_phone_e164?: string | null
          admin_phone_verified?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_active_mode?: string | null
          admin_active_tenant_id?: string | null
          admin_phone_e164?: string | null
          admin_phone_verified?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_admin_active_tenant_id_fkey"
            columns: ["admin_active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      aftercare_instructions: {
        Row: {
          ai_verbatim_script: string | null
          created_at: string
          follow_up_recommended: boolean | null
          follow_up_timeframe: string | null
          id: string
          immediate_care: string[] | null
          ongoing_care: string[] | null
          service_id: string | null
          service_name: string
          tenant_id: string
          things_to_avoid: string[] | null
          updated_at: string
          warning_signs: string[] | null
        }
        Insert: {
          ai_verbatim_script?: string | null
          created_at?: string
          follow_up_recommended?: boolean | null
          follow_up_timeframe?: string | null
          id?: string
          immediate_care?: string[] | null
          ongoing_care?: string[] | null
          service_id?: string | null
          service_name: string
          tenant_id: string
          things_to_avoid?: string[] | null
          updated_at?: string
          warning_signs?: string[] | null
        }
        Update: {
          ai_verbatim_script?: string | null
          created_at?: string
          follow_up_recommended?: boolean | null
          follow_up_timeframe?: string | null
          id?: string
          immediate_care?: string[] | null
          ongoing_care?: string[] | null
          service_id?: string | null
          service_name?: string
          tenant_id?: string
          things_to_avoid?: string[] | null
          updated_at?: string
          warning_signs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "aftercare_instructions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aftercare_instructions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
          followup_status: string | null
          id: string
          is_recovery_call: boolean | null
          lead_id: string | null
          lead_score: string | null
          opportunity_id: string | null
          outcome: Database["public"]["Enums"]["ai_call_outcome"] | null
          recovery_campaign_id: string | null
          recovery_context: Json | null
          started_at: string
          summary: string | null
          tenant_id: string
          transcript: string | null
          triggered_recovery: boolean | null
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
          followup_status?: string | null
          id?: string
          is_recovery_call?: boolean | null
          lead_id?: string | null
          lead_score?: string | null
          opportunity_id?: string | null
          outcome?: Database["public"]["Enums"]["ai_call_outcome"] | null
          recovery_campaign_id?: string | null
          recovery_context?: Json | null
          started_at?: string
          summary?: string | null
          tenant_id: string
          transcript?: string | null
          triggered_recovery?: boolean | null
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
          followup_status?: string | null
          id?: string
          is_recovery_call?: boolean | null
          lead_id?: string | null
          lead_score?: string | null
          opportunity_id?: string | null
          outcome?: Database["public"]["Enums"]["ai_call_outcome"] | null
          recovery_campaign_id?: string | null
          recovery_context?: Json | null
          started_at?: string
          summary?: string | null
          tenant_id?: string
          transcript?: string | null
          triggered_recovery?: boolean | null
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
            foreignKeyName: "ai_call_sessions_recovery_campaign_id_fkey"
            columns: ["recovery_campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_recovery_campaigns"
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
          dynamic_variables_json: Json | null
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
          dynamic_variables_json?: Json | null
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
          dynamic_variables_json?: Json | null
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
      ai_response_quality: {
        Row: {
          created_at: string | null
          customer_satisfied: boolean | null
          id: string
          knowledge_gap_id: string | null
          question_asked: string
          required_human_assist: boolean | null
          response_given: string | null
          response_source: string | null
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          customer_satisfied?: boolean | null
          id?: string
          knowledge_gap_id?: string | null
          question_asked: string
          required_human_assist?: boolean | null
          response_given?: string | null
          response_source?: string | null
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          customer_satisfied?: boolean | null
          id?: string
          knowledge_gap_id?: string | null
          question_asked?: string
          required_human_assist?: boolean | null
          response_given?: string | null
          response_source?: string | null
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_quality_knowledge_gap_id_fkey"
            columns: ["knowledge_gap_id"]
            isOneToOne: false
            referencedRelation: "knowledge_gaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_quality_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_quality_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_settings: {
        Row: {
          ai_behavior_mode: string | null
          ai_booking_mode: string | null
          ai_callback_delay_minutes: number | null
          booking_url: string | null
          business_phone_number: string | null
          busy_toggle: boolean
          calendar_provider: string | null
          cancellation_notice_hours: number | null
          closeloop_number: string | null
          confirmation_method: string | null
          connect_status: string | null
          created_at: string
          deposit_amount: string | null
          deposit_required: boolean | null
          dispatch_ivr_mode: string | null
          emergency_surcharge: string | null
          forwarding_phone_e164: string | null
          go_live_enabled: boolean
          impound_agent_id: string | null
          impound_fallback_script: string | null
          impound_greeting_script: string | null
          instant_text_enabled: boolean
          missed_call_behavior: Database["public"]["Enums"]["missed_call_behavior"]
          notification_sounds_enabled: boolean
          off_behavior: Database["public"]["Enums"]["off_behavior"] | null
          overflow_rings: number
          owner_forward_number: string | null
          owner_forward_verified: boolean
          pending_booking_notify_email: boolean | null
          pending_booking_notify_sms: boolean | null
          phone_connected: boolean
          phone_method: string | null
          readiness_last_computed_at: string | null
          readiness_p0_flags: Json | null
          readiness_p1_flags: Json | null
          readiness_recommendations: Json | null
          readiness_score: number | null
          recurring_enabled: boolean | null
          same_day_enabled: boolean | null
          service_default_flow: string | null
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
          waitlist_enabled: boolean | null
        }
        Insert: {
          ai_behavior_mode?: string | null
          ai_booking_mode?: string | null
          ai_callback_delay_minutes?: number | null
          booking_url?: string | null
          business_phone_number?: string | null
          busy_toggle?: boolean
          calendar_provider?: string | null
          cancellation_notice_hours?: number | null
          closeloop_number?: string | null
          confirmation_method?: string | null
          connect_status?: string | null
          created_at?: string
          deposit_amount?: string | null
          deposit_required?: boolean | null
          dispatch_ivr_mode?: string | null
          emergency_surcharge?: string | null
          forwarding_phone_e164?: string | null
          go_live_enabled?: boolean
          impound_agent_id?: string | null
          impound_fallback_script?: string | null
          impound_greeting_script?: string | null
          instant_text_enabled?: boolean
          missed_call_behavior?: Database["public"]["Enums"]["missed_call_behavior"]
          notification_sounds_enabled?: boolean
          off_behavior?: Database["public"]["Enums"]["off_behavior"] | null
          overflow_rings?: number
          owner_forward_number?: string | null
          owner_forward_verified?: boolean
          pending_booking_notify_email?: boolean | null
          pending_booking_notify_sms?: boolean | null
          phone_connected?: boolean
          phone_method?: string | null
          readiness_last_computed_at?: string | null
          readiness_p0_flags?: Json | null
          readiness_p1_flags?: Json | null
          readiness_recommendations?: Json | null
          readiness_score?: number | null
          recurring_enabled?: boolean | null
          same_day_enabled?: boolean | null
          service_default_flow?: string | null
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
          waitlist_enabled?: boolean | null
        }
        Update: {
          ai_behavior_mode?: string | null
          ai_booking_mode?: string | null
          ai_callback_delay_minutes?: number | null
          booking_url?: string | null
          business_phone_number?: string | null
          busy_toggle?: boolean
          calendar_provider?: string | null
          cancellation_notice_hours?: number | null
          closeloop_number?: string | null
          confirmation_method?: string | null
          connect_status?: string | null
          created_at?: string
          deposit_amount?: string | null
          deposit_required?: boolean | null
          dispatch_ivr_mode?: string | null
          emergency_surcharge?: string | null
          forwarding_phone_e164?: string | null
          go_live_enabled?: boolean
          impound_agent_id?: string | null
          impound_fallback_script?: string | null
          impound_greeting_script?: string | null
          instant_text_enabled?: boolean
          missed_call_behavior?: Database["public"]["Enums"]["missed_call_behavior"]
          notification_sounds_enabled?: boolean
          off_behavior?: Database["public"]["Enums"]["off_behavior"] | null
          overflow_rings?: number
          owner_forward_number?: string | null
          owner_forward_verified?: boolean
          pending_booking_notify_email?: boolean | null
          pending_booking_notify_sms?: boolean | null
          phone_connected?: boolean
          phone_method?: string | null
          readiness_last_computed_at?: string | null
          readiness_p0_flags?: Json | null
          readiness_p1_flags?: Json | null
          readiness_recommendations?: Json | null
          readiness_score?: number | null
          recurring_enabled?: boolean | null
          same_day_enabled?: boolean | null
          service_default_flow?: string | null
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
          waitlist_enabled?: boolean | null
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
          external_event_id: string | null
          id: string
          lead_id: string
          notes: string | null
          service_id: string | null
          session_id: string | null
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
          external_event_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          service_id?: string | null
          session_id?: string | null
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
          external_event_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          service_id?: string | null
          session_id?: string | null
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
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
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
      business_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          data_json: Json | null
          description: string
          dismissed_at: string | null
          first_observed_at: string | null
          id: string
          is_actionable: boolean | null
          is_dismissed: boolean | null
          last_observed_at: string | null
          observation_count: number | null
          pattern_key: string
          pattern_type: string
          suggested_action: string | null
          tenant_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          data_json?: Json | null
          description: string
          dismissed_at?: string | null
          first_observed_at?: string | null
          id?: string
          is_actionable?: boolean | null
          is_dismissed?: boolean | null
          last_observed_at?: string | null
          observation_count?: number | null
          pattern_key: string
          pattern_type: string
          suggested_action?: string | null
          tenant_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          data_json?: Json | null
          description?: string
          dismissed_at?: string | null
          first_observed_at?: string | null
          id?: string
          is_actionable?: boolean | null
          is_dismissed?: boolean | null
          last_observed_at?: string | null
          observation_count?: number | null
          pattern_key?: string
          pattern_type?: string
          suggested_action?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_patterns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      busy_blocks: {
        Row: {
          block_type: string
          booking_id: string | null
          created_at: string
          end_at: string
          expires_at: string | null
          external_event_id: string | null
          id: string
          is_active: boolean
          metadata_json: Json | null
          session_id: string | null
          source_connection_id: string | null
          start_at: string
          tenant_id: string
        }
        Insert: {
          block_type: string
          booking_id?: string | null
          created_at?: string
          end_at: string
          expires_at?: string | null
          external_event_id?: string | null
          id?: string
          is_active?: boolean
          metadata_json?: Json | null
          session_id?: string | null
          source_connection_id?: string | null
          start_at: string
          tenant_id: string
        }
        Update: {
          block_type?: string
          booking_id?: string | null
          created_at?: string
          end_at?: string
          expires_at?: string | null
          external_event_id?: string | null
          id?: string
          is_active?: boolean
          metadata_json?: Json | null
          session_id?: string | null
          source_connection_id?: string | null
          start_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "busy_blocks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "busy_blocks_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "busy_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          auth_type: string
          config_json: Json | null
          created_at: string
          display_name: string | null
          id: string
          last_sync_at: string | null
          provider: string
          scopes_json: Json | null
          status: string
          sync_error: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_type: string
          config_json?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          provider: string
          scopes_json?: Json | null
          status?: string
          sync_error?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          config_json?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: string
          scopes_json?: Json | null
          status?: string
          sync_error?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          scope: string | null
          tenant_id: string
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          scope?: string | null
          tenant_id: string
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          tenant_id?: string
          token_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      call_outcomes: {
        Row: {
          ai_handled_fully: boolean | null
          conversion_value_cents: number | null
          created_at: string | null
          duration_seconds: number | null
          escalation_reason: string | null
          id: string
          intent: string | null
          outcome_type: string
          service_requested: string | null
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          ai_handled_fully?: boolean | null
          conversion_value_cents?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          escalation_reason?: string | null
          id?: string
          intent?: string | null
          outcome_type: string
          service_requested?: string | null
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          ai_handled_fully?: boolean | null
          conversion_value_cents?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          escalation_reason?: string | null
          id?: string
          intent?: string | null
          outcome_type?: string
          service_requested?: string | null
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_outcomes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_definitions: {
        Row: {
          category: string
          conflicts_with: string[] | null
          created_at: string | null
          default_enabled_for_modes: string[] | null
          description: string | null
          display_name: string
          icon_name: string | null
          id: string
          requires: string[] | null
          sort_order: number | null
        }
        Insert: {
          category: string
          conflicts_with?: string[] | null
          created_at?: string | null
          default_enabled_for_modes?: string[] | null
          description?: string | null
          display_name: string
          icon_name?: string | null
          id: string
          requires?: string[] | null
          sort_order?: number | null
        }
        Update: {
          category?: string
          conflicts_with?: string[] | null
          created_at?: string | null
          default_enabled_for_modes?: string[] | null
          description?: string | null
          display_name?: string
          icon_name?: string | null
          id?: string
          requires?: string[] | null
          sort_order?: number | null
        }
        Relationships: []
      }
      catering_knowledge: {
        Row: {
          ai_script: string | null
          cancellation_policy: string | null
          created_at: string
          deposit_percentage: number | null
          event_type: string
          id: string
          lead_time_days: number | null
          max_guests: number | null
          menu_restrictions: string | null
          min_guests: number | null
          rental_equipment: string[] | null
          setup_requirements: string | null
          staffing_included: boolean | null
          tenant_id: string
          updated_at: string
          venue_requirements: string | null
        }
        Insert: {
          ai_script?: string | null
          cancellation_policy?: string | null
          created_at?: string
          deposit_percentage?: number | null
          event_type: string
          id?: string
          lead_time_days?: number | null
          max_guests?: number | null
          menu_restrictions?: string | null
          min_guests?: number | null
          rental_equipment?: string[] | null
          setup_requirements?: string | null
          staffing_included?: boolean | null
          tenant_id: string
          updated_at?: string
          venue_requirements?: string | null
        }
        Update: {
          ai_script?: string | null
          cancellation_policy?: string | null
          created_at?: string
          deposit_percentage?: number | null
          event_type?: string
          id?: string
          lead_time_days?: number | null
          max_guests?: number | null
          menu_restrictions?: string | null
          min_guests?: number | null
          rental_equipment?: string[] | null
          setup_requirements?: string | null
          staffing_included?: boolean | null
          tenant_id?: string
          updated_at?: string
          venue_requirements?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catering_knowledge_tenant_id_fkey"
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
      competitor_knowledge: {
        Row: {
          common_customer_concerns: string[] | null
          competitor_name: string
          created_at: string
          id: string
          never_say: string[] | null
          our_advantage: string[] | null
          price_comparison_notes: string | null
          response_script: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          common_customer_concerns?: string[] | null
          competitor_name: string
          created_at?: string
          id?: string
          never_say?: string[] | null
          our_advantage?: string[] | null
          price_comparison_notes?: string | null
          response_script?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          common_customer_concerns?: string[] | null
          competitor_name?: string
          created_at?: string
          id?: string
          never_say?: string[] | null
          our_advantage?: string[] | null
          price_comparison_notes?: string | null
          response_script?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_knowledge_tenant_id_fkey"
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
      customer_equipment: {
        Row: {
          brand: string | null
          condition: string | null
          created_at: string
          customer_id: string
          equipment_type: string
          id: string
          install_date: string | null
          installed_by: string | null
          last_service_date: string | null
          location_in_home: string | null
          model: string | null
          next_service_due: string | null
          notes: string | null
          photos: Json | null
          replaced_by_equipment_id: string | null
          serial_number: string | null
          specifications: Json | null
          status: string | null
          tenant_id: string
          updated_at: string
          warranty_expiry: string | null
          warranty_notes: string | null
          warranty_provider: string | null
        }
        Insert: {
          brand?: string | null
          condition?: string | null
          created_at?: string
          customer_id: string
          equipment_type: string
          id?: string
          install_date?: string | null
          installed_by?: string | null
          last_service_date?: string | null
          location_in_home?: string | null
          model?: string | null
          next_service_due?: string | null
          notes?: string | null
          photos?: Json | null
          replaced_by_equipment_id?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          warranty_expiry?: string | null
          warranty_notes?: string | null
          warranty_provider?: string | null
        }
        Update: {
          brand?: string | null
          condition?: string | null
          created_at?: string
          customer_id?: string
          equipment_type?: string
          id?: string
          install_date?: string | null
          installed_by?: string | null
          last_service_date?: string | null
          location_in_home?: string | null
          model?: string | null
          next_service_due?: string | null
          notes?: string | null
          photos?: Json | null
          replaced_by_equipment_id?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          warranty_expiry?: string | null
          warranty_notes?: string | null
          warranty_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_equipment_replaced_by_equipment_id_fkey"
            columns: ["replaced_by_equipment_id"]
            isOneToOne: false
            referencedRelation: "customer_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_equipment_tenant_id_fkey"
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
      customer_vehicles: {
        Row: {
          color: string | null
          created_at: string
          customer_id: string
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          notes: string | null
          tenant_id: string
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          customer_id: string
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          tenant_id: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          contact_preferences: Json | null
          created_at: string
          do_not_contact: boolean | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone_e164: string
          phone_raw: string | null
          preferred_contact_method: string | null
          source: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_preferences?: Json | null
          created_at?: string
          do_not_contact?: boolean | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone_e164: string
          phone_raw?: string | null
          preferred_contact_method?: string | null
          source?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_preferences?: Json | null
          created_at?: string
          do_not_contact?: boolean | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone_e164?: string
          phone_raw?: string | null
          preferred_contact_method?: string | null
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
      delivery_zones: {
        Row: {
          created_at: string
          delivery_fee_cents: number | null
          estimated_delivery_max_minutes: number | null
          estimated_delivery_min_minutes: number | null
          id: string
          is_active: boolean | null
          max_miles: number | null
          min_miles: number | null
          minimum_order_cents: number | null
          neighborhood_names: string[] | null
          peak_fee_cents: number | null
          peak_time_adjustment_minutes: number | null
          priority_order: number | null
          tenant_id: string
          updated_at: string
          zip_codes: string[] | null
          zone_name: string
          zone_type: string | null
        }
        Insert: {
          created_at?: string
          delivery_fee_cents?: number | null
          estimated_delivery_max_minutes?: number | null
          estimated_delivery_min_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_miles?: number | null
          min_miles?: number | null
          minimum_order_cents?: number | null
          neighborhood_names?: string[] | null
          peak_fee_cents?: number | null
          peak_time_adjustment_minutes?: number | null
          priority_order?: number | null
          tenant_id: string
          updated_at?: string
          zip_codes?: string[] | null
          zone_name: string
          zone_type?: string | null
        }
        Update: {
          created_at?: string
          delivery_fee_cents?: number | null
          estimated_delivery_max_minutes?: number | null
          estimated_delivery_min_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_miles?: number | null
          min_miles?: number | null
          minimum_order_cents?: number | null
          neighborhood_names?: string[] | null
          peak_fee_cents?: number | null
          peak_time_adjustment_minutes?: number | null
          priority_order?: number | null
          tenant_id?: string
          updated_at?: string
          zip_codes?: string[] | null
          zone_name?: string
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_coverage_zones: {
        Row: {
          available_24_7: boolean | null
          available_hours: Json | null
          base_rate_cents: number | null
          county_names: Json | null
          created_at: string
          definition_type: string | null
          eta_base_minutes: number | null
          eta_per_mile_minutes: number | null
          highway_numbers: string[] | null
          id: string
          is_active: boolean | null
          max_miles: number | null
          min_miles: number | null
          minimum_charge_cents: number | null
          per_mile_rate_cents: number | null
          priority_order: number | null
          tenant_id: string
          updated_at: string
          zip_codes: string[] | null
          zone_name: string
          zone_type: string | null
        }
        Insert: {
          available_24_7?: boolean | null
          available_hours?: Json | null
          base_rate_cents?: number | null
          county_names?: Json | null
          created_at?: string
          definition_type?: string | null
          eta_base_minutes?: number | null
          eta_per_mile_minutes?: number | null
          highway_numbers?: string[] | null
          id?: string
          is_active?: boolean | null
          max_miles?: number | null
          min_miles?: number | null
          minimum_charge_cents?: number | null
          per_mile_rate_cents?: number | null
          priority_order?: number | null
          tenant_id: string
          updated_at?: string
          zip_codes?: string[] | null
          zone_name: string
          zone_type?: string | null
        }
        Update: {
          available_24_7?: boolean | null
          available_hours?: Json | null
          base_rate_cents?: number | null
          county_names?: Json | null
          created_at?: string
          definition_type?: string | null
          eta_base_minutes?: number | null
          eta_per_mile_minutes?: number | null
          highway_numbers?: string[] | null
          id?: string
          is_active?: boolean | null
          max_miles?: number | null
          min_miles?: number | null
          minimum_charge_cents?: number | null
          per_mile_rate_cents?: number | null
          priority_order?: number | null
          tenant_id?: string
          updated_at?: string
          zip_codes?: string[] | null
          zone_name?: string
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_coverage_zones_tenant_id_fkey"
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
          additional_stops: Json | null
          affected_area_sqft: number | null
          arrived_at: string | null
          assigned_crew: string | null
          assigned_vehicle: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          damage_type: string | null
          description: string | null
          dispatch_distance_miles: number | null
          dispatched_at: string | null
          document_type: string | null
          drivable: boolean | null
          driver_id: string | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_required: boolean | null
          en_route_at: string | null
          equipment_required: string[] | null
          estimated_arrival_at: string | null
          estimated_duration_minutes: number | null
          estimated_eta_minutes: number | null
          id: string
          inventory_items: Json | null
          item_count: number | null
          job_number: string
          job_type: string | null
          notes: string | null
          on_site_at: string | null
          passenger_count: number | null
          patient_info: Json | null
          pet_info: Json | null
          photo_requested: boolean | null
          photos: Json | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          price_breakdown: Json | null
          price_cents: number | null
          pricing_note: string | null
          priority: Database["public"]["Enums"]["dispatch_priority"]
          recurring_schedule: Json | null
          requested_at: string | null
          scheduled_at: string | null
          service_category: string | null
          service_tier: string | null
          session_id: string | null
          signer_count: number | null
          special_requirements: string[] | null
          status: Database["public"]["Enums"]["dispatch_status"]
          tenant_id: string
          total_distance_miles: number | null
          tow_distance_miles: number | null
          updated_at: string
          vehicle_id: string | null
          volume_estimate: string | null
          weight_estimate: string | null
        }
        Insert: {
          additional_stops?: Json | null
          affected_area_sqft?: number | null
          arrived_at?: string | null
          assigned_crew?: string | null
          assigned_vehicle?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          damage_type?: string | null
          description?: string | null
          dispatch_distance_miles?: number | null
          dispatched_at?: string | null
          document_type?: string | null
          drivable?: boolean | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_required?: boolean | null
          en_route_at?: string | null
          equipment_required?: string[] | null
          estimated_arrival_at?: string | null
          estimated_duration_minutes?: number | null
          estimated_eta_minutes?: number | null
          id?: string
          inventory_items?: Json | null
          item_count?: number | null
          job_number: string
          job_type?: string | null
          notes?: string | null
          on_site_at?: string | null
          passenger_count?: number | null
          patient_info?: Json | null
          pet_info?: Json | null
          photo_requested?: boolean | null
          photos?: Json | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price_breakdown?: Json | null
          price_cents?: number | null
          pricing_note?: string | null
          priority?: Database["public"]["Enums"]["dispatch_priority"]
          recurring_schedule?: Json | null
          requested_at?: string | null
          scheduled_at?: string | null
          service_category?: string | null
          service_tier?: string | null
          session_id?: string | null
          signer_count?: number | null
          special_requirements?: string[] | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          tenant_id: string
          total_distance_miles?: number | null
          tow_distance_miles?: number | null
          updated_at?: string
          vehicle_id?: string | null
          volume_estimate?: string | null
          weight_estimate?: string | null
        }
        Update: {
          additional_stops?: Json | null
          affected_area_sqft?: number | null
          arrived_at?: string | null
          assigned_crew?: string | null
          assigned_vehicle?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          damage_type?: string | null
          description?: string | null
          dispatch_distance_miles?: number | null
          dispatched_at?: string | null
          document_type?: string | null
          drivable?: boolean | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_required?: boolean | null
          en_route_at?: string | null
          equipment_required?: string[] | null
          estimated_arrival_at?: string | null
          estimated_duration_minutes?: number | null
          estimated_eta_minutes?: number | null
          id?: string
          inventory_items?: Json | null
          item_count?: number | null
          job_number?: string
          job_type?: string | null
          notes?: string | null
          on_site_at?: string | null
          passenger_count?: number | null
          patient_info?: Json | null
          pet_info?: Json | null
          photo_requested?: boolean | null
          photos?: Json | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price_breakdown?: Json | null
          price_cents?: number | null
          pricing_note?: string | null
          priority?: Database["public"]["Enums"]["dispatch_priority"]
          recurring_schedule?: Json | null
          requested_at?: string | null
          scheduled_at?: string | null
          service_category?: string | null
          service_tier?: string | null
          session_id?: string | null
          signer_count?: number | null
          special_requirements?: string[] | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          tenant_id?: string
          total_distance_miles?: number | null
          tow_distance_miles?: number | null
          updated_at?: string
          vehicle_id?: string | null
          volume_estimate?: string | null
          weight_estimate?: string | null
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
            foreignKeyName: "dispatch_jobs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_policies: {
        Row: {
          accepted_payment_methods: string[] | null
          cancel_after_dispatch_fee_cents: number | null
          cancel_en_route_fee_cents: number | null
          cancel_on_scene_fee_cents: number | null
          cash_only_after_hours: boolean | null
          created_at: string | null
          damage_waiver_text: string | null
          emergency_surcharge_cents: number | null
          id: string
          insurance_requirement_text: string | null
          liability_limit_cents: number | null
          lockout_attempt_limit: number | null
          lockout_disclaimer: string | null
          payment_due_at_service: boolean | null
          pre_existing_damage_policy: string | null
          prepayment_required: boolean | null
          priority_fee_percentage: number | null
          release_authorized_agent_allowed: boolean | null
          release_police_hold_policy: string | null
          release_requires_id: boolean | null
          release_requires_insurance: boolean | null
          release_requires_registration: boolean | null
          release_requires_title: boolean | null
          spare_key_policy: string | null
          storage_daily_rate_cents: number | null
          storage_grace_period_hours: number | null
          storage_lien_sale_days: number | null
          storage_max_days: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_payment_methods?: string[] | null
          cancel_after_dispatch_fee_cents?: number | null
          cancel_en_route_fee_cents?: number | null
          cancel_on_scene_fee_cents?: number | null
          cash_only_after_hours?: boolean | null
          created_at?: string | null
          damage_waiver_text?: string | null
          emergency_surcharge_cents?: number | null
          id?: string
          insurance_requirement_text?: string | null
          liability_limit_cents?: number | null
          lockout_attempt_limit?: number | null
          lockout_disclaimer?: string | null
          payment_due_at_service?: boolean | null
          pre_existing_damage_policy?: string | null
          prepayment_required?: boolean | null
          priority_fee_percentage?: number | null
          release_authorized_agent_allowed?: boolean | null
          release_police_hold_policy?: string | null
          release_requires_id?: boolean | null
          release_requires_insurance?: boolean | null
          release_requires_registration?: boolean | null
          release_requires_title?: boolean | null
          spare_key_policy?: string | null
          storage_daily_rate_cents?: number | null
          storage_grace_period_hours?: number | null
          storage_lien_sale_days?: number | null
          storage_max_days?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_payment_methods?: string[] | null
          cancel_after_dispatch_fee_cents?: number | null
          cancel_en_route_fee_cents?: number | null
          cancel_on_scene_fee_cents?: number | null
          cash_only_after_hours?: boolean | null
          created_at?: string | null
          damage_waiver_text?: string | null
          emergency_surcharge_cents?: number | null
          id?: string
          insurance_requirement_text?: string | null
          liability_limit_cents?: number | null
          lockout_attempt_limit?: number | null
          lockout_disclaimer?: string | null
          payment_due_at_service?: boolean | null
          pre_existing_damage_policy?: string | null
          prepayment_required?: boolean | null
          priority_fee_percentage?: number | null
          release_authorized_agent_allowed?: boolean | null
          release_police_hold_policy?: string | null
          release_requires_id?: boolean | null
          release_requires_insurance?: boolean | null
          release_requires_registration?: boolean | null
          release_requires_title?: boolean | null
          spare_key_policy?: string | null
          storage_daily_rate_cents?: number | null
          storage_grace_period_hours?: number | null
          storage_lien_sale_days?: number | null
          storage_max_days?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          accepted_terms: boolean | null
          booking_id: string | null
          converted_to_booking_id: string | null
          converted_to_job_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_notes: string | null
          discount_cents: number | null
          estimate_number: string
          id: string
          internal_notes: string | null
          job_id: string | null
          line_items: Json
          pdf_generated_at: string | null
          pdf_url: string | null
          pricing_options: Json | null
          reminder_sent_at: string | null
          selected_option: string | null
          sent_at: string | null
          signature_data: string | null
          signature_ip: string | null
          signed_at: string | null
          status: string
          subtotal_cents: number | null
          tax_cents: number | null
          tax_rate_percent: number | null
          tenant_id: string
          terms_and_conditions: string | null
          title: string | null
          total_cents: number | null
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_terms?: boolean | null
          booking_id?: string | null
          converted_to_booking_id?: string | null
          converted_to_job_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_cents?: number | null
          estimate_number: string
          id?: string
          internal_notes?: string | null
          job_id?: string | null
          line_items?: Json
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pricing_options?: Json | null
          reminder_sent_at?: string | null
          selected_option?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signature_ip?: string | null
          signed_at?: string | null
          status?: string
          subtotal_cents?: number | null
          tax_cents?: number | null
          tax_rate_percent?: number | null
          tenant_id: string
          terms_and_conditions?: string | null
          title?: string | null
          total_cents?: number | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_terms?: boolean | null
          booking_id?: string | null
          converted_to_booking_id?: string | null
          converted_to_job_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_cents?: number | null
          estimate_number?: string
          id?: string
          internal_notes?: string | null
          job_id?: string | null
          line_items?: Json
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pricing_options?: Json | null
          reminder_sent_at?: string | null
          selected_option?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signature_ip?: string | null
          signed_at?: string | null
          status?: string
          subtotal_cents?: number | null
          tax_cents?: number | null
          tax_rate_percent?: number | null
          tenant_id?: string
          terms_and_conditions?: string | null
          title?: string | null
          total_cents?: number | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_converted_to_booking_id_fkey"
            columns: ["converted_to_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_converted_to_job_id_fkey"
            columns: ["converted_to_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_tenant_id_fkey"
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
      fleet_drivers: {
        Row: {
          created_at: string | null
          default_vehicle_id: string | null
          email: string | null
          full_name: string
          id: string
          last_known_lat: number | null
          last_known_lng: number | null
          license_expiry: string | null
          license_number: string | null
          location_enabled: boolean | null
          location_updated_at: string | null
          phone_e164: string | null
          photo_url: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_vehicle_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          last_known_lat?: number | null
          last_known_lng?: number | null
          license_expiry?: string | null
          license_number?: string | null
          location_enabled?: boolean | null
          location_updated_at?: string | null
          phone_e164?: string | null
          photo_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_vehicle_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_known_lat?: number | null
          last_known_lng?: number | null
          license_expiry?: string | null
          license_number?: string | null
          location_enabled?: boolean | null
          location_updated_at?: string | null
          phone_e164?: string | null
          photo_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_drivers_default_vehicle_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_drivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          capacity_notes: string | null
          created_at: string | null
          current_driver_id: string | null
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          photo_url: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          vehicle_type: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          capacity_notes?: string | null
          created_at?: string | null
          current_driver_id?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          photo_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          capacity_notes?: string | null
          created_at?: string | null
          current_driver_id?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          photo_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_vehicles_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_vehicles_tenant_id_fkey"
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
          allows_special_instructions: boolean | null
          catering_lead_days: number | null
          catering_min_guests: number | null
          created_at: string | null
          delivery_fee_cents: number | null
          delivery_fee_config: Json | null
          delivery_fee_type: string | null
          delivery_minimum_cents: number | null
          delivery_radius_miles: number | null
          estimated_prep_minutes: number | null
          kitchen_hours_json: Json | null
          max_order_items: number | null
          menu_notes: string | null
          order_confirmation_mode: string | null
          peak_time_buffer_minutes: number | null
          tenant_id: string
          tip_suggestions: number[] | null
          updated_at: string | null
        }
        Insert: {
          accepts_catering?: boolean | null
          accepts_delivery?: boolean | null
          accepts_dine_in?: boolean | null
          accepts_pickup?: boolean | null
          allows_special_instructions?: boolean | null
          catering_lead_days?: number | null
          catering_min_guests?: number | null
          created_at?: string | null
          delivery_fee_cents?: number | null
          delivery_fee_config?: Json | null
          delivery_fee_type?: string | null
          delivery_minimum_cents?: number | null
          delivery_radius_miles?: number | null
          estimated_prep_minutes?: number | null
          kitchen_hours_json?: Json | null
          max_order_items?: number | null
          menu_notes?: string | null
          order_confirmation_mode?: string | null
          peak_time_buffer_minutes?: number | null
          tenant_id: string
          tip_suggestions?: number[] | null
          updated_at?: string | null
        }
        Update: {
          accepts_catering?: boolean | null
          accepts_delivery?: boolean | null
          accepts_dine_in?: boolean | null
          accepts_pickup?: boolean | null
          allows_special_instructions?: boolean | null
          catering_lead_days?: number | null
          catering_min_guests?: number | null
          created_at?: string | null
          delivery_fee_cents?: number | null
          delivery_fee_config?: Json | null
          delivery_fee_type?: string | null
          delivery_minimum_cents?: number | null
          delivery_radius_miles?: number | null
          estimated_prep_minutes?: number | null
          kitchen_hours_json?: Json | null
          max_order_items?: number | null
          menu_notes?: string | null
          order_confirmation_mode?: string | null
          peak_time_buffer_minutes?: number | null
          tenant_id?: string
          tip_suggestions?: number[] | null
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
          customer_id: string
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
          session_id: string | null
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
          customer_id: string
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
          session_id?: string | null
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
          customer_id?: string
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
          session_id?: string | null
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
            foreignKeyName: "food_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
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
      food_policies: {
        Row: {
          allergy_disclaimer: string | null
          cake_cutting_fee_cents: number | null
          catering_cancellation_days: number | null
          catering_cancellation_fee_policy: string | null
          catering_deposit_percentage: number | null
          catering_final_count_hours: number | null
          catering_minimum_guests: number | null
          contactless_delivery_default: boolean | null
          corkage_fee_cents: number | null
          created_at: string | null
          cross_contamination_warning: string | null
          delivery_driver_tip_policy: string | null
          delivery_instructions_required: boolean | null
          delivery_photo_proof: boolean | null
          dietary_accommodation_policy: string | null
          id: string
          large_party_deposit_cents: number | null
          large_party_deposit_policy: string | null
          large_party_minimum: number | null
          missing_item_policy: string | null
          nutrition_info_available: boolean | null
          order_cancellation_allowed: boolean | null
          order_cancellation_cutoff_minutes: number | null
          order_cancellation_fee_cents: number | null
          order_modification_cutoff_minutes: number | null
          outside_food_allowed: boolean | null
          private_event_minimum_cents: number | null
          quality_issue_policy: string | null
          reservation_cancellation_hours: number | null
          reservation_hold_minutes: number | null
          reservation_no_show_fee_cents: number | null
          tenant_id: string
          updated_at: string | null
          wrong_order_refund_policy: string | null
        }
        Insert: {
          allergy_disclaimer?: string | null
          cake_cutting_fee_cents?: number | null
          catering_cancellation_days?: number | null
          catering_cancellation_fee_policy?: string | null
          catering_deposit_percentage?: number | null
          catering_final_count_hours?: number | null
          catering_minimum_guests?: number | null
          contactless_delivery_default?: boolean | null
          corkage_fee_cents?: number | null
          created_at?: string | null
          cross_contamination_warning?: string | null
          delivery_driver_tip_policy?: string | null
          delivery_instructions_required?: boolean | null
          delivery_photo_proof?: boolean | null
          dietary_accommodation_policy?: string | null
          id?: string
          large_party_deposit_cents?: number | null
          large_party_deposit_policy?: string | null
          large_party_minimum?: number | null
          missing_item_policy?: string | null
          nutrition_info_available?: boolean | null
          order_cancellation_allowed?: boolean | null
          order_cancellation_cutoff_minutes?: number | null
          order_cancellation_fee_cents?: number | null
          order_modification_cutoff_minutes?: number | null
          outside_food_allowed?: boolean | null
          private_event_minimum_cents?: number | null
          quality_issue_policy?: string | null
          reservation_cancellation_hours?: number | null
          reservation_hold_minutes?: number | null
          reservation_no_show_fee_cents?: number | null
          tenant_id: string
          updated_at?: string | null
          wrong_order_refund_policy?: string | null
        }
        Update: {
          allergy_disclaimer?: string | null
          cake_cutting_fee_cents?: number | null
          catering_cancellation_days?: number | null
          catering_cancellation_fee_policy?: string | null
          catering_deposit_percentage?: number | null
          catering_final_count_hours?: number | null
          catering_minimum_guests?: number | null
          contactless_delivery_default?: boolean | null
          corkage_fee_cents?: number | null
          created_at?: string | null
          cross_contamination_warning?: string | null
          delivery_driver_tip_policy?: string | null
          delivery_instructions_required?: boolean | null
          delivery_photo_proof?: boolean | null
          dietary_accommodation_policy?: string | null
          id?: string
          large_party_deposit_cents?: number | null
          large_party_deposit_policy?: string | null
          large_party_minimum?: number | null
          missing_item_policy?: string | null
          nutrition_info_available?: boolean | null
          order_cancellation_allowed?: boolean | null
          order_cancellation_cutoff_minutes?: number | null
          order_cancellation_fee_cents?: number | null
          order_modification_cutoff_minutes?: number | null
          outside_food_allowed?: boolean | null
          private_event_minimum_cents?: number | null
          quality_issue_policy?: string | null
          reservation_cancellation_hours?: number | null
          reservation_hold_minutes?: number | null
          reservation_no_show_fee_cents?: number | null
          tenant_id?: string
          updated_at?: string | null
          wrong_order_refund_policy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      general_policies: {
        Row: {
          ada_accommodations_text: string | null
          callback_availability: string | null
          created_at: string | null
          data_retention_policy: string | null
          dispute_resolution_policy: string | null
          force_majeure_text: string | null
          holiday_policy: string | null
          id: string
          language_support: string[] | null
          marketing_opt_in_default: boolean | null
          preferred_contact_method: string | null
          privacy_policy_url: string | null
          response_time_hours: number | null
          tenant_id: string
          terms_of_service_url: string | null
          updated_at: string | null
          weather_cancellation_policy: string | null
        }
        Insert: {
          ada_accommodations_text?: string | null
          callback_availability?: string | null
          created_at?: string | null
          data_retention_policy?: string | null
          dispute_resolution_policy?: string | null
          force_majeure_text?: string | null
          holiday_policy?: string | null
          id?: string
          language_support?: string[] | null
          marketing_opt_in_default?: boolean | null
          preferred_contact_method?: string | null
          privacy_policy_url?: string | null
          response_time_hours?: number | null
          tenant_id: string
          terms_of_service_url?: string | null
          updated_at?: string | null
          weather_cancellation_policy?: string | null
        }
        Update: {
          ada_accommodations_text?: string | null
          callback_availability?: string | null
          created_at?: string | null
          data_retention_policy?: string | null
          dispute_resolution_policy?: string | null
          force_majeure_text?: string | null
          holiday_policy?: string | null
          id?: string
          language_support?: string[] | null
          marketing_opt_in_default?: boolean | null
          preferred_contact_method?: string | null
          privacy_policy_url?: string | null
          response_time_hours?: number | null
          tenant_id?: string
          terms_of_service_url?: string | null
          updated_at?: string | null
          weather_cancellation_policy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "general_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      golden_path_runs: {
        Row: {
          created_at: string
          fail_count: number | null
          finished_at: string | null
          id: string
          mode: string | null
          overall_status: string
          pass_count: number | null
          results_json: Json
          run_by: string | null
          started_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          fail_count?: number | null
          finished_at?: string | null
          id?: string
          mode?: string | null
          overall_status?: string
          pass_count?: number | null
          results_json?: Json
          run_by?: string | null
          started_at?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          fail_count?: number | null
          finished_at?: string | null
          id?: string
          mode?: string | null
          overall_status?: string
          pass_count?: number | null
          results_json?: Json
          run_by?: string | null
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "golden_path_runs_tenant_id_fkey"
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
      impound_lots: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          directions: string | null
          hours_json: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          phone: string | null
          state: string | null
          tenant_id: string
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          directions?: string | null
          hours_json?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          phone?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          directions?: string | null
          hours_json?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          phone?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impound_lots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impound_settings: {
        Row: {
          accepted_payment: string[] | null
          admin_fee_cents: number | null
          base_tow_fee_cents: number | null
          daily_storage_cents: number | null
          default_release_requirements: string[] | null
          gate_fee_cents: number | null
          impound_handling_enabled: boolean | null
          notify_on_new_impound: boolean | null
          notify_on_release: boolean | null
          release_hours_json: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_payment?: string[] | null
          admin_fee_cents?: number | null
          base_tow_fee_cents?: number | null
          daily_storage_cents?: number | null
          default_release_requirements?: string[] | null
          gate_fee_cents?: number | null
          impound_handling_enabled?: boolean | null
          notify_on_new_impound?: boolean | null
          notify_on_release?: boolean | null
          release_hours_json?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_payment?: string[] | null
          admin_fee_cents?: number | null
          base_tow_fee_cents?: number | null
          daily_storage_cents?: number | null
          default_release_requirements?: string[] | null
          gate_fee_cents?: number | null
          impound_handling_enabled?: boolean | null
          notify_on_new_impound?: boolean | null
          notify_on_release?: boolean | null
          release_hours_json?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impound_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impound_vehicles: {
        Row: {
          additional_fees_cents: number | null
          admin_fee_cents: number | null
          base_tow_fee_cents: number | null
          created_at: string | null
          days_stored: number | null
          dispatch_job_id: string | null
          gate_fee_cents: number | null
          id: string
          license_plate: string | null
          license_plate_state: string | null
          logged_by_driver_id: string | null
          lot_id: string | null
          notes: string | null
          payment_method: string | null
          photos: Json | null
          release_notes: string | null
          release_requirements: string[] | null
          released_at: string | null
          released_to_name: string | null
          released_to_phone: string | null
          status: string | null
          storage_fee_daily_cents: number | null
          tenant_id: string
          total_fees_cents: number | null
          total_storage_cents: number | null
          tow_reason: string | null
          towed_at: string
          towed_from_address: string | null
          updated_at: string | null
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: string | null
          vin: string | null
        }
        Insert: {
          additional_fees_cents?: number | null
          admin_fee_cents?: number | null
          base_tow_fee_cents?: number | null
          created_at?: string | null
          days_stored?: number | null
          dispatch_job_id?: string | null
          gate_fee_cents?: number | null
          id?: string
          license_plate?: string | null
          license_plate_state?: string | null
          logged_by_driver_id?: string | null
          lot_id?: string | null
          notes?: string | null
          payment_method?: string | null
          photos?: Json | null
          release_notes?: string | null
          release_requirements?: string[] | null
          released_at?: string | null
          released_to_name?: string | null
          released_to_phone?: string | null
          status?: string | null
          storage_fee_daily_cents?: number | null
          tenant_id: string
          total_fees_cents?: number | null
          total_storage_cents?: number | null
          tow_reason?: string | null
          towed_at?: string
          towed_from_address?: string | null
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
          vin?: string | null
        }
        Update: {
          additional_fees_cents?: number | null
          admin_fee_cents?: number | null
          base_tow_fee_cents?: number | null
          created_at?: string | null
          days_stored?: number | null
          dispatch_job_id?: string | null
          gate_fee_cents?: number | null
          id?: string
          license_plate?: string | null
          license_plate_state?: string | null
          logged_by_driver_id?: string | null
          lot_id?: string | null
          notes?: string | null
          payment_method?: string | null
          photos?: Json | null
          release_notes?: string | null
          release_requirements?: string[] | null
          released_at?: string | null
          released_to_name?: string | null
          released_to_phone?: string | null
          status?: string | null
          storage_fee_daily_cents?: number | null
          tenant_id?: string
          total_fees_cents?: number | null
          total_storage_cents?: number | null
          tow_reason?: string | null
          towed_at?: string
          towed_from_address?: string | null
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impound_vehicles_dispatch_job_id_fkey"
            columns: ["dispatch_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impound_vehicles_logged_by_driver_id_fkey"
            columns: ["logged_by_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impound_vehicles_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "impound_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impound_vehicles_tenant_id_fkey"
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
      insurance_knowledge: {
        Row: {
          billing_notes: string | null
          carrier_name: string
          common_coverage_notes: string | null
          copay_typical_range: string | null
          created_at: string
          id: string
          is_accepted: boolean | null
          patient_script: string | null
          plan_types: string[] | null
          pre_authorization_required: string[] | null
          tenant_id: string
          updated_at: string
          verification_process: string | null
        }
        Insert: {
          billing_notes?: string | null
          carrier_name: string
          common_coverage_notes?: string | null
          copay_typical_range?: string | null
          created_at?: string
          id?: string
          is_accepted?: boolean | null
          patient_script?: string | null
          plan_types?: string[] | null
          pre_authorization_required?: string[] | null
          tenant_id: string
          updated_at?: string
          verification_process?: string | null
        }
        Update: {
          billing_notes?: string | null
          carrier_name?: string
          common_coverage_notes?: string | null
          copay_typical_range?: string | null
          created_at?: string
          id?: string
          is_accepted?: boolean | null
          patient_script?: string | null
          plan_types?: string[] | null
          pre_authorization_required?: string[] | null
          tenant_id?: string
          updated_at?: string
          verification_process?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_knowledge_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_field_templates: {
        Row: {
          ai_prompt_hint: string | null
          created_at: string
          display_order: number | null
          field_key: string
          field_label: string
          field_type: string
          id: string
          industry_key: string
          is_required: boolean | null
          options_json: Json | null
          placeholder: string | null
          validation_hint: string | null
        }
        Insert: {
          ai_prompt_hint?: string | null
          created_at?: string
          display_order?: number | null
          field_key: string
          field_label: string
          field_type?: string
          id?: string
          industry_key: string
          is_required?: boolean | null
          options_json?: Json | null
          placeholder?: string | null
          validation_hint?: string | null
        }
        Update: {
          ai_prompt_hint?: string | null
          created_at?: string
          display_order?: number | null
          field_key?: string
          field_label?: string
          field_type?: string
          id?: string
          industry_key?: string
          is_required?: boolean | null
          options_json?: Json | null
          placeholder?: string | null
          validation_hint?: string | null
        }
        Relationships: []
      }
      intake_requirements: {
        Row: {
          ai_prompt_hint: string | null
          ask_order: number | null
          created_at: string | null
          field_key: string
          field_label: string
          field_type: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options_json: Json | null
          tenant_id: string
          updated_at: string | null
          validation_hint: string | null
          visible_intents: string[] | null
          visible_modes: string[] | null
        }
        Insert: {
          ai_prompt_hint?: string | null
          ask_order?: number | null
          created_at?: string | null
          field_key: string
          field_label: string
          field_type?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options_json?: Json | null
          tenant_id: string
          updated_at?: string | null
          validation_hint?: string | null
          visible_intents?: string[] | null
          visible_modes?: string[] | null
        }
        Update: {
          ai_prompt_hint?: string | null
          ask_order?: number | null
          created_at?: string | null
          field_key?: string
          field_label?: string
          field_type?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options_json?: Json | null
          tenant_id?: string
          updated_at?: string | null
          validation_hint?: string | null
          visible_intents?: string[] | null
          visible_modes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          access_token_encrypted: string | null
          connected_at: string | null
          connected_by: string | null
          consecutive_errors: number | null
          created_at: string
          disconnected_at: string | null
          external_account_id: string | null
          external_account_name: string | null
          id: string
          integration_type: string
          last_error: string | null
          last_error_at: string | null
          last_sync_at: string | null
          last_sync_items_count: number | null
          last_sync_status: string | null
          refresh_token_encrypted: string | null
          scopes: string[] | null
          settings: Json | null
          status: string
          sync_direction: string | null
          sync_frequency: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          connected_at?: string | null
          connected_by?: string | null
          consecutive_errors?: number | null
          created_at?: string
          disconnected_at?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          integration_type: string
          last_error?: string | null
          last_error_at?: string | null
          last_sync_at?: string | null
          last_sync_items_count?: number | null
          last_sync_status?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          settings?: Json | null
          status?: string
          sync_direction?: string | null
          sync_frequency?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          connected_at?: string | null
          connected_by?: string | null
          consecutive_errors?: number | null
          created_at?: string
          disconnected_at?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          integration_type?: string
          last_error?: string | null
          last_error_at?: string | null
          last_sync_at?: string | null
          last_sync_items_count?: number | null
          last_sync_status?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          settings?: Json | null
          status?: string
          sync_direction?: string | null
          sync_frequency?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      intelligence_digest: {
        Row: {
          created_at: string | null
          digest_type: string | null
          gaps_identified: number | null
          highlights_json: Json
          id: string
          metrics_json: Json
          patterns_discovered: number | null
          period_end: string
          period_start: string
          recommendations_json: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          digest_type?: string | null
          gaps_identified?: number | null
          highlights_json?: Json
          id?: string
          metrics_json?: Json
          patterns_discovered?: number | null
          period_end: string
          period_start: string
          recommendations_json?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          digest_type?: string | null
          gaps_identified?: number | null
          highlights_json?: Json
          id?: string
          metrics_json?: Json
          patterns_discovered?: number | null
          period_end?: string
          period_start?: string
          recommendations_json?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_digest_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_insights: {
        Row: {
          action_link: string | null
          actioned_at: string | null
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          impact_estimate: string | null
          insight_type: string
          is_actioned: boolean | null
          is_read: boolean | null
          recommended_action: string | null
          severity: string | null
          source_pattern_id: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          action_link?: string | null
          actioned_at?: string | null
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          impact_estimate?: string | null
          insight_type: string
          is_actioned?: boolean | null
          is_read?: boolean | null
          recommended_action?: string | null
          severity?: string | null
          source_pattern_id?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          action_link?: string | null
          actioned_at?: string | null
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          impact_estimate?: string | null
          insight_type?: string
          is_actioned?: boolean | null
          is_read?: boolean | null
          recommended_action?: string | null
          severity?: string | null
          source_pattern_id?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_insights_source_pattern_id_fkey"
            columns: ["source_pattern_id"]
            isOneToOne: false
            referencedRelation: "business_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_stock_level: number | null
          name: string
          sell_price_cents: number | null
          sku: string | null
          tenant_id: string
          unit_cost_cents: number | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_stock_level?: number | null
          name: string
          sell_price_cents?: number | null
          sku?: string | null
          tenant_id: string
          unit_cost_cents?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_stock_level?: number | null
          name?: string
          sell_price_cents?: number | null
          sku?: string | null
          tenant_id?: string
          unit_cost_cents?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          address: string | null
          assigned_user_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location_type: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          address?: string | null
          assigned_user_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name: string
          tenant_id: string
        }
        Update: {
          address?: string | null
          assigned_user_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          id: string
          item_id: string
          location_id: string
          quantity: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          location_id: string
          quantity?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          location_id?: string
          quantity?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          job_id: string | null
          location_id: string
          notes: string | null
          quantity: number
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          job_id?: string | null
          location_id: string
          notes?: string | null
          quantity: number
          tenant_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          job_id?: string | null
          location_id?: string
          notes?: string | null
          quantity?: number
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_service_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          id: string
          job_id: string
          notes: string | null
          service_id: string | null
          sort_order: number
          started_at: string | null
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          service_id?: string | null
          sort_order?: number
          started_at?: string | null
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          service_id?: string | null
          sort_order?: number
          started_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_service_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "active_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_service_items_tenant_id_fkey"
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
          last_seen_at: string | null
          occurrence_count: number
          priority: number
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          suggested_section: string | null
          tenant_id: string
          urgency: string | null
        }
        Insert: {
          ai_session_id?: string | null
          created_at?: string
          customer_question?: string | null
          description: string
          gap_type: string
          id?: string
          last_seen_at?: string | null
          occurrence_count?: number
          priority?: number
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_section?: string | null
          tenant_id: string
          urgency?: string | null
        }
        Update: {
          ai_session_id?: string | null
          created_at?: string
          customer_question?: string | null
          description?: string
          gap_type?: string
          id?: string
          last_seen_at?: string | null
          occurrence_count?: number
          priority?: number
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_section?: string | null
          tenant_id?: string
          urgency?: string | null
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
      knowledge_merge_queue: {
        Row: {
          conflict_type: string
          created_at: string
          entity_key: string
          entity_type: string
          existing_value: Json | null
          id: string
          proposed_value: Json
          status: string
          tenant_id: string
          upload_id: string | null
        }
        Insert: {
          conflict_type: string
          created_at?: string
          entity_key: string
          entity_type: string
          existing_value?: Json | null
          id?: string
          proposed_value: Json
          status?: string
          tenant_id: string
          upload_id?: string | null
        }
        Update: {
          conflict_type?: string
          created_at?: string
          entity_key?: string
          entity_type?: string
          existing_value?: Json | null
          id?: string
          proposed_value?: Json
          status?: string
          tenant_id?: string
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_merge_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_merge_queue_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "knowledge_uploads"
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
      knowledge_uploads: {
        Row: {
          conflict_summary: Json | null
          created_at: string
          error_message: string | null
          extracted_text: string | null
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          parsed_json: Json | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          conflict_summary?: Json | null
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          parsed_json?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          conflict_summary?: Json | null
          created_at?: string
          error_message?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          parsed_json?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_recovery_actions: {
        Row: {
          action_type: string
          call_session_id: string | null
          campaign_id: string
          created_at: string | null
          delivery_error: string | null
          delivery_status: string | null
          executed_at: string | null
          external_message_id: string | null
          id: string
          message_sent: string | null
          response_at: string | null
          response_content: string | null
          response_outcome: string | null
          response_received: boolean | null
          response_sentiment: string | null
          step_id: string | null
          task_completed: boolean | null
          task_completed_at: string | null
          task_completed_by: string | null
        }
        Insert: {
          action_type: string
          call_session_id?: string | null
          campaign_id: string
          created_at?: string | null
          delivery_error?: string | null
          delivery_status?: string | null
          executed_at?: string | null
          external_message_id?: string | null
          id?: string
          message_sent?: string | null
          response_at?: string | null
          response_content?: string | null
          response_outcome?: string | null
          response_received?: boolean | null
          response_sentiment?: string | null
          step_id?: string | null
          task_completed?: boolean | null
          task_completed_at?: string | null
          task_completed_by?: string | null
        }
        Update: {
          action_type?: string
          call_session_id?: string | null
          campaign_id?: string
          created_at?: string | null
          delivery_error?: string | null
          delivery_status?: string | null
          executed_at?: string | null
          external_message_id?: string | null
          id?: string
          message_sent?: string | null
          response_at?: string | null
          response_content?: string | null
          response_outcome?: string | null
          response_received?: boolean | null
          response_sentiment?: string | null
          step_id?: string | null
          task_completed?: boolean | null
          task_completed_at?: string | null
          task_completed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_recovery_actions_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_actions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_recovery_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_actions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "lead_recovery_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_recovery_campaigns: {
        Row: {
          converted_at: string | null
          converted_booking_id: string | null
          converted_dispatch_job_id: string | null
          converted_food_order_id: string | null
          created_at: string | null
          current_step: number | null
          customer_id: string | null
          id: string
          internal_notes: string | null
          last_attempt_at: string | null
          last_response_at: string | null
          lead_id: string | null
          next_action_at: string | null
          notes: string | null
          original_call_id: string | null
          original_call_outcome: string | null
          original_intent: string | null
          original_objection: string | null
          original_service_interest: string | null
          recovered_value_cents: number | null
          sequence_id: string | null
          status: string | null
          stopped_at: string | null
          stopped_reason: string | null
          tenant_id: string
          total_attempts: number | null
          total_responses: number | null
          updated_at: string | null
        }
        Insert: {
          converted_at?: string | null
          converted_booking_id?: string | null
          converted_dispatch_job_id?: string | null
          converted_food_order_id?: string | null
          created_at?: string | null
          current_step?: number | null
          customer_id?: string | null
          id?: string
          internal_notes?: string | null
          last_attempt_at?: string | null
          last_response_at?: string | null
          lead_id?: string | null
          next_action_at?: string | null
          notes?: string | null
          original_call_id?: string | null
          original_call_outcome?: string | null
          original_intent?: string | null
          original_objection?: string | null
          original_service_interest?: string | null
          recovered_value_cents?: number | null
          sequence_id?: string | null
          status?: string | null
          stopped_at?: string | null
          stopped_reason?: string | null
          tenant_id: string
          total_attempts?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Update: {
          converted_at?: string | null
          converted_booking_id?: string | null
          converted_dispatch_job_id?: string | null
          converted_food_order_id?: string | null
          created_at?: string | null
          current_step?: number | null
          customer_id?: string | null
          id?: string
          internal_notes?: string | null
          last_attempt_at?: string | null
          last_response_at?: string | null
          lead_id?: string | null
          next_action_at?: string | null
          notes?: string | null
          original_call_id?: string | null
          original_call_outcome?: string | null
          original_intent?: string | null
          original_objection?: string | null
          original_service_interest?: string | null
          recovered_value_cents?: number | null
          sequence_id?: string | null
          status?: string | null
          stopped_at?: string | null
          stopped_reason?: string | null
          tenant_id?: string
          total_attempts?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_recovery_campaigns_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_campaigns_converted_dispatch_job_id_fkey"
            columns: ["converted_dispatch_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_campaigns_converted_food_order_id_fkey"
            columns: ["converted_food_order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_campaigns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_campaigns_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_campaigns_original_call_id_fkey"
            columns: ["original_call_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_campaigns_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "lead_recovery_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_recovery_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_recovery_sequence_steps: {
        Row: {
          action_type: string
          ai_call_max_duration_seconds: number | null
          ai_call_purpose: string | null
          ai_call_script_hints: string | null
          created_at: string | null
          delay_minutes: number
          id: string
          message_template: string | null
          respect_business_hours: boolean | null
          sequence_id: string
          skip_if_booked: boolean | null
          skip_if_declined: boolean | null
          skip_if_responded: boolean | null
          step_order: number
          task_description: string | null
          task_priority: string | null
        }
        Insert: {
          action_type: string
          ai_call_max_duration_seconds?: number | null
          ai_call_purpose?: string | null
          ai_call_script_hints?: string | null
          created_at?: string | null
          delay_minutes: number
          id?: string
          message_template?: string | null
          respect_business_hours?: boolean | null
          sequence_id: string
          skip_if_booked?: boolean | null
          skip_if_declined?: boolean | null
          skip_if_responded?: boolean | null
          step_order: number
          task_description?: string | null
          task_priority?: string | null
        }
        Update: {
          action_type?: string
          ai_call_max_duration_seconds?: number | null
          ai_call_purpose?: string | null
          ai_call_script_hints?: string | null
          created_at?: string | null
          delay_minutes?: number
          id?: string
          message_template?: string | null
          respect_business_hours?: boolean | null
          sequence_id?: string
          skip_if_booked?: boolean | null
          skip_if_declined?: boolean | null
          skip_if_responded?: boolean | null
          step_order?: number
          task_description?: string | null
          task_priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_recovery_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "lead_recovery_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_recovery_sequences: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_system_template: boolean | null
          name: string
          target_business_mode: string | null
          tenant_id: string
          trigger_on_outcomes: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_system_template?: boolean | null
          name: string
          target_business_mode?: string | null
          tenant_id: string
          trigger_on_outcomes?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_system_template?: boolean | null
          name?: string
          target_business_mode?: string | null
          tenant_id?: string
          trigger_on_outcomes?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_recovery_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_recovery_settings: {
        Row: {
          ai_call_hours_end: string | null
          ai_call_hours_start: string | null
          ai_calls_enabled: boolean | null
          auto_start_recovery: boolean | null
          cooldown_days: number | null
          default_offer_code: string | null
          default_offer_description: string | null
          max_attempts_per_lead: number | null
          max_campaigns_per_day: number | null
          notification_email: string | null
          notification_sms: string | null
          notify_on_conversion: boolean | null
          notify_on_response: boolean | null
          quiet_days: string[] | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          recovery_enabled: boolean | null
          require_phone_number: boolean | null
          respect_business_hours: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          ai_call_hours_end?: string | null
          ai_call_hours_start?: string | null
          ai_calls_enabled?: boolean | null
          auto_start_recovery?: boolean | null
          cooldown_days?: number | null
          default_offer_code?: string | null
          default_offer_description?: string | null
          max_attempts_per_lead?: number | null
          max_campaigns_per_day?: number | null
          notification_email?: string | null
          notification_sms?: string | null
          notify_on_conversion?: boolean | null
          notify_on_response?: boolean | null
          quiet_days?: string[] | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          recovery_enabled?: boolean | null
          require_phone_number?: boolean | null
          respect_business_hours?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          ai_call_hours_end?: string | null
          ai_call_hours_start?: string | null
          ai_calls_enabled?: boolean | null
          auto_start_recovery?: boolean | null
          cooldown_days?: number | null
          default_offer_code?: string | null
          default_offer_description?: string | null
          max_attempts_per_lead?: number | null
          max_campaigns_per_day?: number | null
          notification_email?: string | null
          notification_sms?: string | null
          notify_on_conversion?: boolean | null
          notify_on_response?: boolean | null
          quiet_days?: string[] | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          recovery_enabled?: boolean | null
          require_phone_number?: boolean | null
          respect_business_hours?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_recovery_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_recovery_templates: {
        Row: {
          category: string | null
          channel: string
          content: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          subject: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          channel: string
          content: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          subject?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          channel?: string
          content?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_recovery_templates_tenant_id_fkey"
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
          last_recovery_at: string | null
          phone: string | null
          recovery_attempts: number | null
          recovery_campaign_id: string | null
          recovery_status: string | null
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
          last_recovery_at?: string | null
          phone?: string | null
          recovery_attempts?: number | null
          recovery_campaign_id?: string | null
          recovery_status?: string | null
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
          last_recovery_at?: string | null
          phone?: string | null
          recovery_attempts?: number | null
          recovery_campaign_id?: string | null
          recovery_status?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          tenant_id?: string
          vehicle_or_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_recovery_campaign_id_fkey"
            columns: ["recovery_campaign_id"]
            isOneToOne: false
            referencedRelation: "lead_recovery_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_balances: {
        Row: {
          customer_id: string
          id: string
          joined_at: string | null
          lifetime_points: number
          points_balance: number
          program_id: string
          tenant_id: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          customer_id: string
          id?: string
          joined_at?: string | null
          lifetime_points?: number
          points_balance?: number
          program_id: string
          tenant_id: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          customer_id?: string
          id?: string
          joined_at?: string | null
          lifetime_points?: number
          points_balance?: number
          program_id?: string
          tenant_id?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_balances_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          points_for_signup: number | null
          points_per_dollar: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_for_signup?: number | null
          points_per_dollar?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_for_signup?: number | null
          points_per_dollar?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_required: number
          program_id: string
          reward_percentage: number | null
          reward_type: string | null
          reward_value_cents: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required: number
          program_id: string
          reward_percentage?: number | null
          reward_type?: string | null
          reward_value_cents?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number
          program_id?: string
          reward_percentage?: number | null
          reward_type?: string | null
          reward_value_cents?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          order_id: string | null
          points: number
          program_id: string
          reward_id: string | null
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          order_id?: string | null
          points: number
          program_id: string
          reward_id?: string | null
          tenant_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          points?: number
          program_id?: string
          reward_id?: string | null
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_coverage_settings: {
        Row: {
          accepts_medicaid: boolean | null
          accepts_medicare: boolean | null
          created_at: string
          home_visit_duration_minutes: number | null
          home_visit_fee_cents: number | null
          home_visit_radius_miles: number | null
          in_network_insurers: string[] | null
          new_patient_extra_minutes: number | null
          offers_home_visits: boolean | null
          offers_telehealth: boolean | null
          out_of_network_policy: string | null
          procedure_buffer_minutes: number | null
          reserves_urgent_slots: boolean | null
          standard_buffer_minutes: number | null
          telehealth_platforms: string[] | null
          telehealth_states: string[] | null
          tenant_id: string
          updated_at: string
          urgent_slots_per_day: number | null
        }
        Insert: {
          accepts_medicaid?: boolean | null
          accepts_medicare?: boolean | null
          created_at?: string
          home_visit_duration_minutes?: number | null
          home_visit_fee_cents?: number | null
          home_visit_radius_miles?: number | null
          in_network_insurers?: string[] | null
          new_patient_extra_minutes?: number | null
          offers_home_visits?: boolean | null
          offers_telehealth?: boolean | null
          out_of_network_policy?: string | null
          procedure_buffer_minutes?: number | null
          reserves_urgent_slots?: boolean | null
          standard_buffer_minutes?: number | null
          telehealth_platforms?: string[] | null
          telehealth_states?: string[] | null
          tenant_id: string
          updated_at?: string
          urgent_slots_per_day?: number | null
        }
        Update: {
          accepts_medicaid?: boolean | null
          accepts_medicare?: boolean | null
          created_at?: string
          home_visit_duration_minutes?: number | null
          home_visit_fee_cents?: number | null
          home_visit_radius_miles?: number | null
          in_network_insurers?: string[] | null
          new_patient_extra_minutes?: number | null
          offers_home_visits?: boolean | null
          offers_telehealth?: boolean | null
          out_of_network_policy?: string | null
          procedure_buffer_minutes?: number | null
          reserves_urgent_slots?: boolean | null
          standard_buffer_minutes?: number | null
          telehealth_platforms?: string[] | null
          telehealth_states?: string[] | null
          tenant_id?: string
          updated_at?: string
          urgent_slots_per_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_coverage_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      medical_policies: {
        Row: {
          after_hours_contact_policy: string | null
          appointment_late_arrival_minutes: number | null
          appointment_late_reschedule: boolean | null
          appointment_no_show_fee_cents: number | null
          balance_due_policy: string | null
          cancellation_fee_cents: number | null
          cancellation_notice_hours: number | null
          collections_notice: string | null
          complaint_procedure: string | null
          controlled_substance_policy: string | null
          created_at: string | null
          emergency_protocol: string | null
          financial_agreement_required: boolean | null
          hipaa_consent_required: boolean | null
          hospital_affiliation: string | null
          id: string
          insurance_verification_days_before: number | null
          insurance_verification_required: boolean | null
          minor_consent_policy: string | null
          new_patient_arrival_minutes: number | null
          out_of_network_disclosure: string | null
          patient_rights_summary: string | null
          payment_plan_available: boolean | null
          payment_plan_minimum_cents: number | null
          prescription_refill_appointment_required: boolean | null
          prescription_refill_notice_days: number | null
          records_release_form_required: boolean | null
          records_request_fee_cents: number | null
          records_request_processing_days: number | null
          telehealth_consent_required: boolean | null
          tenant_id: string
          treatment_consent_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          after_hours_contact_policy?: string | null
          appointment_late_arrival_minutes?: number | null
          appointment_late_reschedule?: boolean | null
          appointment_no_show_fee_cents?: number | null
          balance_due_policy?: string | null
          cancellation_fee_cents?: number | null
          cancellation_notice_hours?: number | null
          collections_notice?: string | null
          complaint_procedure?: string | null
          controlled_substance_policy?: string | null
          created_at?: string | null
          emergency_protocol?: string | null
          financial_agreement_required?: boolean | null
          hipaa_consent_required?: boolean | null
          hospital_affiliation?: string | null
          id?: string
          insurance_verification_days_before?: number | null
          insurance_verification_required?: boolean | null
          minor_consent_policy?: string | null
          new_patient_arrival_minutes?: number | null
          out_of_network_disclosure?: string | null
          patient_rights_summary?: string | null
          payment_plan_available?: boolean | null
          payment_plan_minimum_cents?: number | null
          prescription_refill_appointment_required?: boolean | null
          prescription_refill_notice_days?: number | null
          records_release_form_required?: boolean | null
          records_request_fee_cents?: number | null
          records_request_processing_days?: number | null
          telehealth_consent_required?: boolean | null
          tenant_id: string
          treatment_consent_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          after_hours_contact_policy?: string | null
          appointment_late_arrival_minutes?: number | null
          appointment_late_reschedule?: boolean | null
          appointment_no_show_fee_cents?: number | null
          balance_due_policy?: string | null
          cancellation_fee_cents?: number | null
          cancellation_notice_hours?: number | null
          collections_notice?: string | null
          complaint_procedure?: string | null
          controlled_substance_policy?: string | null
          created_at?: string | null
          emergency_protocol?: string | null
          financial_agreement_required?: boolean | null
          hipaa_consent_required?: boolean | null
          hospital_affiliation?: string | null
          id?: string
          insurance_verification_days_before?: number | null
          insurance_verification_required?: boolean | null
          minor_consent_policy?: string | null
          new_patient_arrival_minutes?: number | null
          out_of_network_disclosure?: string | null
          patient_rights_summary?: string | null
          payment_plan_available?: boolean | null
          payment_plan_minimum_cents?: number | null
          prescription_refill_appointment_required?: boolean | null
          prescription_refill_notice_days?: number | null
          records_release_form_required?: boolean | null
          records_request_fee_cents?: number | null
          records_request_processing_days?: number | null
          telehealth_consent_required?: boolean | null
          tenant_id?: string
          treatment_consent_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_practice_settings: {
        Row: {
          accepted_insurance_carriers: string[] | null
          accepts_insurance: boolean | null
          consultation_fee_cents: number | null
          created_at: string
          follow_up_fee_cents: number | null
          insurance_notes: string | null
          new_patient_fee_cents: number | null
          requires_consent_form: boolean | null
          requires_medical_history: boolean | null
          series_discount_percent: number | null
          tenant_id: string
          updated_at: string
          waive_consultation_with_treatment: boolean | null
        }
        Insert: {
          accepted_insurance_carriers?: string[] | null
          accepts_insurance?: boolean | null
          consultation_fee_cents?: number | null
          created_at?: string
          follow_up_fee_cents?: number | null
          insurance_notes?: string | null
          new_patient_fee_cents?: number | null
          requires_consent_form?: boolean | null
          requires_medical_history?: boolean | null
          series_discount_percent?: number | null
          tenant_id: string
          updated_at?: string
          waive_consultation_with_treatment?: boolean | null
        }
        Update: {
          accepted_insurance_carriers?: string[] | null
          accepts_insurance?: boolean | null
          consultation_fee_cents?: number | null
          created_at?: string
          follow_up_fee_cents?: number | null
          insurance_notes?: string | null
          new_patient_fee_cents?: number | null
          requires_consent_form?: boolean | null
          requires_medical_history?: boolean | null
          series_discount_percent?: number | null
          tenant_id?: string
          updated_at?: string
          waive_consultation_with_treatment?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_practice_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      menu_item_sizes: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          menu_item_id: string
          name: string
          price_cents: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          menu_item_id: string
          name: string
          price_cents: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          menu_item_id?: string
          name?: string
          price_cents?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_sizes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_sizes_tenant_id_fkey"
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
      menu_knowledge: {
        Row: {
          allergens: string[] | null
          calorie_count: number | null
          chef_notes: string | null
          created_at: string
          detailed_description: string | null
          dietary_tags: string[] | null
          id: string
          ingredients: string[] | null
          is_seasonal: boolean | null
          is_signature: boolean | null
          item_name: string
          menu_item_id: string | null
          pairing_suggestions: string | null
          prep_notes: string | null
          seasonal_availability: string | null
          spice_level: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          calorie_count?: number | null
          chef_notes?: string | null
          created_at?: string
          detailed_description?: string | null
          dietary_tags?: string[] | null
          id?: string
          ingredients?: string[] | null
          is_seasonal?: boolean | null
          is_signature?: boolean | null
          item_name: string
          menu_item_id?: string | null
          pairing_suggestions?: string | null
          prep_notes?: string | null
          seasonal_availability?: string | null
          spice_level?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          calorie_count?: number | null
          chef_notes?: string | null
          created_at?: string
          detailed_description?: string | null
          dietary_tags?: string[] | null
          id?: string
          ingredients?: string[] | null
          is_seasonal?: boolean | null
          is_signature?: boolean | null
          item_name?: string
          menu_item_id?: string | null
          pairing_suggestions?: string | null
          prep_notes?: string | null
          seasonal_availability?: string | null
          spice_level?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_knowledge_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_knowledge_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_specials: {
        Row: {
          active_days: number[] | null
          created_at: string
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          items: Json
          name: string
          schedule_type: string
          start_date: string | null
          start_time: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_days?: number[] | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name: string
          schedule_type?: string
          start_date?: string | null
          start_time?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_days?: number[] | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name?: string
          schedule_type?: string
          start_date?: string | null
          start_time?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_specials_tenant_id_fkey"
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
          sound_type: string | null
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
          sound_type?: string | null
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
          sound_type?: string | null
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
      peak_hours: {
        Row: {
          created_at: string
          day_of_week: number
          delivery_buffer_minutes: number | null
          end_time: string
          fee_adjustment_cents: number | null
          id: string
          is_active: boolean | null
          name: string
          prep_buffer_minutes: number | null
          start_time: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          delivery_buffer_minutes?: number | null
          end_time: string
          fee_adjustment_cents?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          prep_buffer_minutes?: number | null
          start_time: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          delivery_buffer_minutes?: number | null
          end_time?: string
          fee_adjustment_cents?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          prep_buffer_minutes?: number | null
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peak_hours_tenant_id_fkey"
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
          fallback_tenant_id: string | null
          id: string
          is_admin_test_line: boolean | null
          location_id: string | null
          phone_e164: string
          purpose: string
          status: string
          tenant_id: string
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string
          fallback_tenant_id?: string | null
          id?: string
          is_admin_test_line?: boolean | null
          location_id?: string | null
          phone_e164: string
          purpose?: string
          status?: string
          tenant_id: string
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string
          fallback_tenant_id?: string | null
          id?: string
          is_admin_test_line?: boolean | null
          location_id?: string | null
          phone_e164?: string
          purpose?: string
          status?: string
          tenant_id?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_fallback_tenant_id_fkey"
            columns: ["fallback_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
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
      price_modifiers: {
        Row: {
          active_days: number[] | null
          active_end_time: string | null
          active_start_time: string | null
          adjustment_type: string
          adjustment_value: number
          applies_to_categories: string[] | null
          applies_to_modes: string[] | null
          applies_to_services: string[] | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          modifier_type: string
          name: string
          show_to_customer: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_days?: number[] | null
          active_end_time?: string | null
          active_start_time?: string | null
          adjustment_type?: string
          adjustment_value?: number
          applies_to_categories?: string[] | null
          applies_to_modes?: string[] | null
          applies_to_services?: string[] | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          modifier_type: string
          name: string
          show_to_customer?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_days?: number[] | null
          active_end_time?: string | null
          active_start_time?: string | null
          adjustment_type?: string
          adjustment_value?: number
          applies_to_categories?: string[] | null
          applies_to_modes?: string[] | null
          applies_to_services?: string[] | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          modifier_type?: string
          name?: string
          show_to_customer?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_modifiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_knowledge: {
        Row: {
          benefits: string[] | null
          brand: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_premium: boolean | null
          price_range: string | null
          product_name: string
          related_services: string[] | null
          tenant_id: string
          updated_at: string
          upsell_script: string | null
          usage_instructions: string | null
          warnings: string | null
        }
        Insert: {
          benefits?: string[] | null
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean | null
          price_range?: string | null
          product_name: string
          related_services?: string[] | null
          tenant_id: string
          updated_at?: string
          upsell_script?: string | null
          usage_instructions?: string | null
          warnings?: string | null
        }
        Update: {
          benefits?: string[] | null
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean | null
          price_range?: string | null
          product_name?: string
          related_services?: string[] | null
          tenant_id?: string
          updated_at?: string
          upsell_script?: string | null
          usage_instructions?: string | null
          warnings?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_knowledge_tenant_id_fkey"
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
          customer_id: string
          customer_name: string
          customer_phone: string | null
          id: string
          party_size: number
          reservation_date: string
          reservation_time: string
          session_id: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          table_preference: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          reservation_date: string
          reservation_time: string
          session_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          table_preference?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          session_id?: string | null
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
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
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
      response_time_settings: {
        Row: {
          after_hours_callback_mode: string | null
          after_hours_target_minutes: number | null
          callback_max_minutes: number | null
          callback_target_minutes: number | null
          created_at: string
          email_max_hours: number | null
          email_target_hours: number | null
          priority_response_minutes: number | null
          priority_zip_codes: string[] | null
          tenant_id: string
          updated_at: string
          urgent_callback_minutes: number | null
          urgent_surcharge_cents: number | null
        }
        Insert: {
          after_hours_callback_mode?: string | null
          after_hours_target_minutes?: number | null
          callback_max_minutes?: number | null
          callback_target_minutes?: number | null
          created_at?: string
          email_max_hours?: number | null
          email_target_hours?: number | null
          priority_response_minutes?: number | null
          priority_zip_codes?: string[] | null
          tenant_id: string
          updated_at?: string
          urgent_callback_minutes?: number | null
          urgent_surcharge_cents?: number | null
        }
        Update: {
          after_hours_callback_mode?: string | null
          after_hours_target_minutes?: number | null
          callback_max_minutes?: number | null
          callback_target_minutes?: number | null
          created_at?: string
          email_max_hours?: number | null
          email_target_hours?: number | null
          priority_response_minutes?: number | null
          priority_zip_codes?: string[] | null
          tenant_id?: string
          updated_at?: string
          urgent_callback_minutes?: number | null
          urgent_surcharge_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "response_time_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      revenue_attributions: {
        Row: {
          attributed_at: string
          completed_at: string | null
          created_at: string
          customer_id: string | null
          entity_id: string
          entity_type: string
          id: string
          revenue_cents: number
          session_id: string | null
          source_type: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attributed_at?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          revenue_cents?: number
          session_id?: string | null
          source_type?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attributed_at?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          revenue_cents?: number
          session_id?: string | null
          source_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_attributions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_attributions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_attributions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_stats_monthly: {
        Row: {
          ai_revenue_cents: number
          avg_entity_value_cents: number
          calls_answered: number
          conversion_rate: number
          created_at: string
          entities_completed: number
          entities_created: number
          id: string
          month: string
          subscription_cost_cents: number
          tenant_id: string
          total_calls: number
          total_revenue_cents: number
          updated_at: string
        }
        Insert: {
          ai_revenue_cents?: number
          avg_entity_value_cents?: number
          calls_answered?: number
          conversion_rate?: number
          created_at?: string
          entities_completed?: number
          entities_created?: number
          id?: string
          month: string
          subscription_cost_cents?: number
          tenant_id: string
          total_calls?: number
          total_revenue_cents?: number
          updated_at?: string
        }
        Update: {
          ai_revenue_cents?: number
          avg_entity_value_cents?: number
          calls_answered?: number
          conversion_rate?: number
          created_at?: string
          entities_completed?: number
          entities_created?: number
          id?: string
          month?: string
          subscription_cost_cents?: number
          tenant_id?: string
          total_calls?: number
          total_revenue_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_stats_monthly_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          booking_id: string | null
          clicked_at: string | null
          clicked_platform: string | null
          created_at: string
          custom_review_url: string | null
          customer_id: string | null
          facebook_review_url: string | null
          google_review_url: string | null
          id: string
          job_id: string | null
          opened_at: string | null
          order_id: string | null
          review_platform: string | null
          review_rating: number | null
          review_received: boolean | null
          sent_at: string
          sent_to: string
          sent_via: string
          status: string
          tenant_id: string
          yelp_review_url: string | null
        }
        Insert: {
          booking_id?: string | null
          clicked_at?: string | null
          clicked_platform?: string | null
          created_at?: string
          custom_review_url?: string | null
          customer_id?: string | null
          facebook_review_url?: string | null
          google_review_url?: string | null
          id?: string
          job_id?: string | null
          opened_at?: string | null
          order_id?: string | null
          review_platform?: string | null
          review_rating?: number | null
          review_received?: boolean | null
          sent_at?: string
          sent_to: string
          sent_via: string
          status?: string
          tenant_id: string
          yelp_review_url?: string | null
        }
        Update: {
          booking_id?: string | null
          clicked_at?: string | null
          clicked_platform?: string | null
          created_at?: string
          custom_review_url?: string | null
          customer_id?: string | null
          facebook_review_url?: string | null
          google_review_url?: string | null
          id?: string
          job_id?: string | null
          opened_at?: string | null
          order_id?: string | null
          review_platform?: string | null
          review_rating?: number | null
          review_received?: boolean | null
          sent_at?: string
          sent_to?: string
          sent_via?: string
          status?: string
          tenant_id?: string
          yelp_review_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "food_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_knowledge: {
        Row: {
          ai_script: string | null
          can_be_self_service: boolean | null
          common_questions: string[] | null
          created_at: string
          escalation_triggers: string[] | null
          estimated_service_time_minutes: number | null
          id: string
          priority_level: string | null
          safety_instructions: string | null
          self_service_tips: string | null
          situation_type: string
          tenant_id: string
          tools_required: string[] | null
          updated_at: string
        }
        Insert: {
          ai_script?: string | null
          can_be_self_service?: boolean | null
          common_questions?: string[] | null
          created_at?: string
          escalation_triggers?: string[] | null
          estimated_service_time_minutes?: number | null
          id?: string
          priority_level?: string | null
          safety_instructions?: string | null
          self_service_tips?: string | null
          situation_type: string
          tenant_id: string
          tools_required?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_script?: string | null
          can_be_self_service?: boolean | null
          common_questions?: string[] | null
          created_at?: string
          escalation_triggers?: string[] | null
          estimated_service_time_minutes?: number | null
          id?: string
          priority_level?: string | null
          safety_instructions?: string | null
          self_service_tips?: string | null
          situation_type?: string
          tenant_id?: string
          tools_required?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadside_knowledge_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          config_json: Json | null
          created_at: string
          destination: string
          enabled: boolean
          id: string
          integration_id: string | null
          label: string
          tenant_id: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          destination: string
          enabled?: boolean
          id?: string
          integration_id?: string | null
          label: string
          tenant_id: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          destination?: string
          enabled?: boolean
          id?: string
          integration_id?: string | null
          label?: string
          tenant_id?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_knowledge: {
        Row: {
          ai_announcement: string | null
          booking_tips: string | null
          created_at: string
          end_date: string | null
          event_name: string
          id: string
          is_recurring: boolean | null
          special_hours: string | null
          special_menu_notes: string | null
          special_pricing_notes: string | null
          start_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_announcement?: string | null
          booking_tips?: string | null
          created_at?: string
          end_date?: string | null
          event_name: string
          id?: string
          is_recurring?: boolean | null
          special_hours?: string | null
          special_menu_notes?: string | null
          special_pricing_notes?: string | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_announcement?: string | null
          booking_tips?: string | null
          created_at?: string
          end_date?: string | null
          event_name?: string
          id?: string
          is_recurring?: boolean | null
          special_hours?: string | null
          special_menu_notes?: string | null
          special_pricing_notes?: string | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_knowledge_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_agreements: {
        Row: {
          agreement_number: string
          auto_renew: boolean | null
          billing_frequency: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          discount_percent: number | null
          end_date: string | null
          id: string
          last_billed_at: string | null
          next_billing_date: string | null
          notes: string | null
          plan_name: string
          plan_type: string | null
          price_cents: number
          priority_scheduling: boolean | null
          renewal_date: string | null
          renewal_reminder_sent_at: string | null
          renewed_from_agreement_id: string | null
          services_included: Json | null
          start_date: string
          status: string
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
          waived_trip_charge: boolean | null
        }
        Insert: {
          agreement_number: string
          auto_renew?: boolean | null
          billing_frequency?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          discount_percent?: number | null
          end_date?: string | null
          id?: string
          last_billed_at?: string | null
          next_billing_date?: string | null
          notes?: string | null
          plan_name: string
          plan_type?: string | null
          price_cents: number
          priority_scheduling?: boolean | null
          renewal_date?: string | null
          renewal_reminder_sent_at?: string | null
          renewed_from_agreement_id?: string | null
          services_included?: Json | null
          start_date: string
          status?: string
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
          waived_trip_charge?: boolean | null
        }
        Update: {
          agreement_number?: string
          auto_renew?: boolean | null
          billing_frequency?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          discount_percent?: number | null
          end_date?: string | null
          id?: string
          last_billed_at?: string | null
          next_billing_date?: string | null
          notes?: string | null
          plan_name?: string
          plan_type?: string | null
          price_cents?: number
          priority_scheduling?: boolean | null
          renewal_date?: string | null
          renewal_reminder_sent_at?: string | null
          renewed_from_agreement_id?: string | null
          services_included?: Json | null
          start_date?: string
          status?: string
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
          waived_trip_charge?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "service_agreements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_renewed_from_agreement_id_fkey"
            columns: ["renewed_from_agreement_id"]
            isOneToOne: false
            referencedRelation: "service_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_coverage_settings: {
        Row: {
          accepts_same_day_urgent: boolean | null
          avoid_traffic_hours: boolean | null
          buffer_mode: string | null
          created_at: string
          default_onsite_minutes: number | null
          onsite_by_service_type: Json | null
          preferred_zip_priority: Json | null
          same_day_cutoff_time: string | null
          same_day_enabled: boolean | null
          same_day_radius_miles: number | null
          tenant_id: string
          travel_buffer_minutes: number | null
          updated_at: string
          urgent_upcharge_percent: number | null
        }
        Insert: {
          accepts_same_day_urgent?: boolean | null
          avoid_traffic_hours?: boolean | null
          buffer_mode?: string | null
          created_at?: string
          default_onsite_minutes?: number | null
          onsite_by_service_type?: Json | null
          preferred_zip_priority?: Json | null
          same_day_cutoff_time?: string | null
          same_day_enabled?: boolean | null
          same_day_radius_miles?: number | null
          tenant_id: string
          travel_buffer_minutes?: number | null
          updated_at?: string
          urgent_upcharge_percent?: number | null
        }
        Update: {
          accepts_same_day_urgent?: boolean | null
          avoid_traffic_hours?: boolean | null
          buffer_mode?: string | null
          created_at?: string
          default_onsite_minutes?: number | null
          onsite_by_service_type?: Json | null
          preferred_zip_priority?: Json | null
          same_day_cutoff_time?: string | null
          same_day_enabled?: boolean | null
          same_day_radius_miles?: number | null
          tenant_id?: string
          travel_buffer_minutes?: number | null
          updated_at?: string
          urgent_upcharge_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_coverage_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          billing_interval: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          included_items: Json
          included_services_per_period: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          member_discount_percent: number | null
          name: string
          package_price_cents: number
          package_type: string
          regular_price_cents: number | null
          session_validity_days: number | null
          tenant_id: string
          total_sessions: number | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          included_items?: Json
          included_services_per_period?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          member_discount_percent?: number | null
          name: string
          package_price_cents: number
          package_type?: string
          regular_price_cents?: number | null
          session_validity_days?: number | null
          tenant_id: string
          total_sessions?: number | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          included_items?: Json
          included_services_per_period?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          member_discount_percent?: number | null
          name?: string
          package_price_cents?: number
          package_type?: string
          regular_price_cents?: number | null
          session_validity_days?: number | null
          tenant_id?: string
          total_sessions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_policies: {
        Row: {
          access_requirements: string | null
          age_restriction_years: number | null
          created_at: string | null
          damage_policy: string | null
          id: string
          insurance_info: string | null
          late_arrival_fee_cents: number | null
          late_arrival_grace_minutes: number | null
          liability_waiver_required: boolean | null
          liability_waiver_text: string | null
          max_reschedules_allowed: number | null
          minimum_service_charge_cents: number | null
          no_show_fee_cents: number | null
          no_show_fee_type: string | null
          parking_requirements: string | null
          pet_policy: string | null
          rescheduling_fee_cents: number | null
          rescheduling_notice_hours: number | null
          satisfaction_guarantee_enabled: boolean | null
          satisfaction_guarantee_text: string | null
          tenant_id: string
          travel_fee_policy: string | null
          updated_at: string | null
          warranty_days: number | null
          warranty_text: string | null
        }
        Insert: {
          access_requirements?: string | null
          age_restriction_years?: number | null
          created_at?: string | null
          damage_policy?: string | null
          id?: string
          insurance_info?: string | null
          late_arrival_fee_cents?: number | null
          late_arrival_grace_minutes?: number | null
          liability_waiver_required?: boolean | null
          liability_waiver_text?: string | null
          max_reschedules_allowed?: number | null
          minimum_service_charge_cents?: number | null
          no_show_fee_cents?: number | null
          no_show_fee_type?: string | null
          parking_requirements?: string | null
          pet_policy?: string | null
          rescheduling_fee_cents?: number | null
          rescheduling_notice_hours?: number | null
          satisfaction_guarantee_enabled?: boolean | null
          satisfaction_guarantee_text?: string | null
          tenant_id: string
          travel_fee_policy?: string | null
          updated_at?: string | null
          warranty_days?: number | null
          warranty_text?: string | null
        }
        Update: {
          access_requirements?: string | null
          age_restriction_years?: number | null
          created_at?: string | null
          damage_policy?: string | null
          id?: string
          insurance_info?: string | null
          late_arrival_fee_cents?: number | null
          late_arrival_grace_minutes?: number | null
          liability_waiver_required?: boolean | null
          liability_waiver_text?: string | null
          max_reschedules_allowed?: number | null
          minimum_service_charge_cents?: number | null
          no_show_fee_cents?: number | null
          no_show_fee_type?: string | null
          parking_requirements?: string | null
          pet_policy?: string | null
          rescheduling_fee_cents?: number | null
          rescheduling_notice_hours?: number | null
          satisfaction_guarantee_enabled?: boolean | null
          satisfaction_guarantee_text?: string | null
          tenant_id?: string
          travel_fee_policy?: string | null
          updated_at?: string | null
          warranty_days?: number | null
          warranty_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          complexity: string
          created_at: string
          deposit_amount: number | null
          deposit_required: boolean | null
          description: string | null
          display_order: number | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          preparation_instructions: string | null
          price_amount: number | null
          price_factors: string | null
          price_type: Database["public"]["Enums"]["price_type"]
          pricing_config_json: Json | null
          requires_dropoff: boolean | null
          service_category: string | null
          service_type: string | null
          tenant_id: string
          upsell_suggestions: string[] | null
        }
        Insert: {
          complexity?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_required?: boolean | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          preparation_instructions?: string | null
          price_amount?: number | null
          price_factors?: string | null
          price_type?: Database["public"]["Enums"]["price_type"]
          pricing_config_json?: Json | null
          requires_dropoff?: boolean | null
          service_category?: string | null
          service_type?: string | null
          tenant_id: string
          upsell_suggestions?: string[] | null
        }
        Update: {
          complexity?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_required?: boolean | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          preparation_instructions?: string | null
          price_amount?: number | null
          price_factors?: string | null
          price_type?: Database["public"]["Enums"]["price_type"]
          pricing_config_json?: Json | null
          requires_dropoff?: boolean | null
          service_category?: string | null
          service_type?: string | null
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
      setup_requests: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          completed_at: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          credentials_notes: string | null
          credentials_provided: boolean | null
          id: string
          notes: string | null
          status: string
          sync_type: string[]
          target_system: string
          target_system_other: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          credentials_notes?: string | null
          credentials_provided?: boolean | null
          id?: string
          notes?: string | null
          status?: string
          sync_type?: string[]
          target_system: string
          target_system_other?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          credentials_notes?: string | null
          credentials_provided?: boolean | null
          id?: string
          notes?: string | null
          status?: string
          sync_type?: string[]
          target_system?: string
          target_system_other?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_requests_tenant_id_fkey"
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
      symptom_triage: {
        Row: {
          can_be_telehealth: boolean | null
          created_at: string
          escalation_action: string | null
          hipaa_safe_response: string | null
          id: string
          pre_visit_instructions: string | null
          questions_to_ask: string[] | null
          severity_indicators: string[] | null
          specialty_referral: string | null
          symptom_category: string
          symptom_name: string
          tenant_id: string
          typical_duration_minutes: number | null
          updated_at: string
        }
        Insert: {
          can_be_telehealth?: boolean | null
          created_at?: string
          escalation_action?: string | null
          hipaa_safe_response?: string | null
          id?: string
          pre_visit_instructions?: string | null
          questions_to_ask?: string[] | null
          severity_indicators?: string[] | null
          specialty_referral?: string | null
          symptom_category: string
          symptom_name: string
          tenant_id: string
          typical_duration_minutes?: number | null
          updated_at?: string
        }
        Update: {
          can_be_telehealth?: boolean | null
          created_at?: string
          escalation_action?: string | null
          hipaa_safe_response?: string | null
          id?: string
          pre_visit_instructions?: string | null
          questions_to_ask?: string[] | null
          severity_indicators?: string[] | null
          specialty_referral?: string | null
          symptom_category?: string
          symptom_name?: string
          tenant_id?: string
          typical_duration_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_triage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
      technician_locations: {
        Row: {
          accuracy_meters: number | null
          battery_percent: number | null
          heading: number | null
          id: string
          is_charging: boolean | null
          job_id: string | null
          latitude: number
          longitude: number
          recorded_at: string
          speed_mph: number | null
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_percent?: number | null
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          job_id?: string | null
          latitude: number
          longitude: number
          recorded_at?: string
          speed_mph?: number | null
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_percent?: number | null
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          job_id?: string | null
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed_mph?: number | null
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_locations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_distance_settings: {
        Row: {
          after_hours_end: string | null
          after_hours_multiplier: number | null
          after_hours_start: string | null
          base_lat: number | null
          base_lng: number | null
          base_place_name: string | null
          base_state_hint: string | null
          busy_buffer_minutes: number | null
          created_at: string
          default_distance_basis: string | null
          distance_provider_enabled: boolean
          dropoff_coverage_mode: string
          dropoff_max_miles: number | null
          eta_base_minutes: number
          eta_max_minutes: number | null
          eta_min_minutes: number | null
          eta_per_mile_minutes: number | null
          eta_rounding_minutes: number
          eta_rounding_mode: string | null
          fuel_surcharge_percent: number | null
          geocode_provider: string
          highway_response_faster_minutes: number | null
          holiday_dates: string[] | null
          holiday_multiplier: number | null
          mapbox_route_profile: string
          max_eta_minutes: number | null
          minimum_charge_cents: number | null
          provider: string
          remote_area_buffer_minutes: number | null
          service_radius_miles: number | null
          special_equipment_fees: Json | null
          tenant_id: string
          traffic_buffer_percent: number | null
          updated_at: string
          weekend_multiplier: number | null
        }
        Insert: {
          after_hours_end?: string | null
          after_hours_multiplier?: number | null
          after_hours_start?: string | null
          base_lat?: number | null
          base_lng?: number | null
          base_place_name?: string | null
          base_state_hint?: string | null
          busy_buffer_minutes?: number | null
          created_at?: string
          default_distance_basis?: string | null
          distance_provider_enabled?: boolean
          dropoff_coverage_mode?: string
          dropoff_max_miles?: number | null
          eta_base_minutes?: number
          eta_max_minutes?: number | null
          eta_min_minutes?: number | null
          eta_per_mile_minutes?: number | null
          eta_rounding_minutes?: number
          eta_rounding_mode?: string | null
          fuel_surcharge_percent?: number | null
          geocode_provider?: string
          highway_response_faster_minutes?: number | null
          holiday_dates?: string[] | null
          holiday_multiplier?: number | null
          mapbox_route_profile?: string
          max_eta_minutes?: number | null
          minimum_charge_cents?: number | null
          provider?: string
          remote_area_buffer_minutes?: number | null
          service_radius_miles?: number | null
          special_equipment_fees?: Json | null
          tenant_id: string
          traffic_buffer_percent?: number | null
          updated_at?: string
          weekend_multiplier?: number | null
        }
        Update: {
          after_hours_end?: string | null
          after_hours_multiplier?: number | null
          after_hours_start?: string | null
          base_lat?: number | null
          base_lng?: number | null
          base_place_name?: string | null
          base_state_hint?: string | null
          busy_buffer_minutes?: number | null
          created_at?: string
          default_distance_basis?: string | null
          distance_provider_enabled?: boolean
          dropoff_coverage_mode?: string
          dropoff_max_miles?: number | null
          eta_base_minutes?: number
          eta_max_minutes?: number | null
          eta_min_minutes?: number | null
          eta_per_mile_minutes?: number | null
          eta_rounding_minutes?: number
          eta_rounding_mode?: string | null
          fuel_surcharge_percent?: number | null
          geocode_provider?: string
          highway_response_faster_minutes?: number | null
          holiday_dates?: string[] | null
          holiday_multiplier?: number | null
          mapbox_route_profile?: string
          max_eta_minutes?: number | null
          minimum_charge_cents?: number | null
          provider?: string
          remote_area_buffer_minutes?: number | null
          service_radius_miles?: number | null
          special_equipment_fees?: Json | null
          tenant_id?: string
          traffic_buffer_percent?: number | null
          updated_at?: string
          weekend_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_distance_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      tenant_revenue_settings: {
        Row: {
          created_at: string
          default_service_value_cents: number
          id: string
          send_monthly_report: boolean
          subscription_cost_override_cents: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_service_value_cents?: number
          id?: string
          send_monthly_report?: boolean
          subscription_cost_override_cents?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_service_value_cents?: number
          id?: string
          send_monthly_report?: boolean
          subscription_cost_override_cents?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_revenue_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
          auto_send_reviews: boolean | null
          business_mode: Database["public"]["Enums"]["business_mode"]
          busyness_rules_jsonb: Json | null
          calendar_last_synced_at: string | null
          calendar_sync_enabled: boolean | null
          calendar_sync_provider: string | null
          cancellation_policy: string | null
          capabilities_json: Json | null
          closed_dates: Json | null
          context_fields_json: Json | null
          created_at: string
          custom_industry: string | null
          deposit_policy: string | null
          dispatch_config_json: Json | null
          enabled_modules: Json | null
          food_settings: Json | null
          google_review_url: string | null
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
          pricing_rules_jsonb: Json | null
          refund_policy: string | null
          review_channel: string | null
          review_delay_hours: number | null
          service_area_json: Json | null
          tagline: string | null
          timezone: string
          website_url: string | null
          years_in_business: number | null
          yelp_review_url: string | null
        }
        Insert: {
          address?: string | null
          ai_enabled?: boolean
          ai_never_promise?: string[] | null
          ai_policies_json?: Json | null
          ai_readiness_score?: number | null
          appointment_buffer_minutes?: number | null
          auto_send_reviews?: boolean | null
          business_mode?: Database["public"]["Enums"]["business_mode"]
          busyness_rules_jsonb?: Json | null
          calendar_last_synced_at?: string | null
          calendar_sync_enabled?: boolean | null
          calendar_sync_provider?: string | null
          cancellation_policy?: string | null
          capabilities_json?: Json | null
          closed_dates?: Json | null
          context_fields_json?: Json | null
          created_at?: string
          custom_industry?: string | null
          deposit_policy?: string | null
          dispatch_config_json?: Json | null
          enabled_modules?: Json | null
          food_settings?: Json | null
          google_review_url?: string | null
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
          pricing_rules_jsonb?: Json | null
          refund_policy?: string | null
          review_channel?: string | null
          review_delay_hours?: number | null
          service_area_json?: Json | null
          tagline?: string | null
          timezone?: string
          website_url?: string | null
          years_in_business?: number | null
          yelp_review_url?: string | null
        }
        Update: {
          address?: string | null
          ai_enabled?: boolean
          ai_never_promise?: string[] | null
          ai_policies_json?: Json | null
          ai_readiness_score?: number | null
          appointment_buffer_minutes?: number | null
          auto_send_reviews?: boolean | null
          business_mode?: Database["public"]["Enums"]["business_mode"]
          busyness_rules_jsonb?: Json | null
          calendar_last_synced_at?: string | null
          calendar_sync_enabled?: boolean | null
          calendar_sync_provider?: string | null
          cancellation_policy?: string | null
          capabilities_json?: Json | null
          closed_dates?: Json | null
          context_fields_json?: Json | null
          created_at?: string
          custom_industry?: string | null
          deposit_policy?: string | null
          dispatch_config_json?: Json | null
          enabled_modules?: Json | null
          food_settings?: Json | null
          google_review_url?: string | null
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
          pricing_rules_jsonb?: Json | null
          refund_policy?: string | null
          review_channel?: string | null
          review_delay_hours?: number | null
          service_area_json?: Json | null
          tagline?: string | null
          timezone?: string
          website_url?: string | null
          years_in_business?: number | null
          yelp_review_url?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billable: boolean | null
          booking_id: string | null
          clock_in: string
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_out: string | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          created_at: string
          duration_minutes: number | null
          entry_type: string
          hourly_rate_cents: number | null
          id: string
          job_id: string | null
          notes: string | null
          payroll_batch_id: string | null
          payroll_exported_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billable?: boolean | null
          booking_id?: string | null
          clock_in: string
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out?: string | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string
          duration_minutes?: number | null
          entry_type?: string
          hourly_rate_cents?: number | null
          id?: string
          job_id?: string | null
          notes?: string | null
          payroll_batch_id?: string | null
          payroll_exported_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billable?: boolean | null
          booking_id?: string | null
          clock_in?: string
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out?: string | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string
          duration_minutes?: number | null
          entry_type?: string
          hourly_rate_cents?: number | null
          id?: string
          job_id?: string | null
          notes?: string | null
          payroll_batch_id?: string | null
          payroll_exported_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_knowledge: {
        Row: {
          additional_fees_apply: boolean | null
          common_issues: string[] | null
          created_at: string
          equipment_required: string[] | null
          estimated_hookup_minutes: number | null
          fee_notes: string | null
          id: string
          max_weight_lbs: number | null
          requires_special_permit: boolean | null
          special_instructions: string | null
          tenant_id: string
          updated_at: string
          vehicle_category: string
          weight_class: string | null
        }
        Insert: {
          additional_fees_apply?: boolean | null
          common_issues?: string[] | null
          created_at?: string
          equipment_required?: string[] | null
          estimated_hookup_minutes?: number | null
          fee_notes?: string | null
          id?: string
          max_weight_lbs?: number | null
          requires_special_permit?: boolean | null
          special_instructions?: string | null
          tenant_id: string
          updated_at?: string
          vehicle_category: string
          weight_class?: string | null
        }
        Update: {
          additional_fees_apply?: boolean | null
          common_issues?: string[] | null
          created_at?: string
          equipment_required?: string[] | null
          estimated_hookup_minutes?: number | null
          fee_notes?: string | null
          id?: string
          max_weight_lbs?: number | null
          requires_special_permit?: boolean | null
          special_instructions?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_category?: string
          weight_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_knowledge_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_options: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          provider_voice_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          provider_voice_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider_voice_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          contacted_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          expires_at: string | null
          id: string
          notes: string | null
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          service_id: string | null
          service_name: string | null
          session_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          contacted_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_id?: string | null
          service_name?: string | null
          session_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          contacted_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_id?: string | null
          service_name?: string | null
          session_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      cleanup_expired_holds: { Args: never; Returns: number }
      create_default_recovery_sequence: {
        Args: { p_business_mode: string; p_tenant_id: string }
        Returns: string
      }
      create_default_recovery_templates: {
        Args: { p_business_mode: string; p_tenant_id: string }
        Returns: undefined
      }
      ensure_tenant_has_default_sequence: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      fn_build_business_context: { Args: { _tenant_id: string }; Returns: Json }
      fn_calculate_booking_revenue: {
        Args: { p_booking_id: string; p_tenant_id: string }
        Returns: number
      }
      fn_cleanup_expired_holds: { Args: never; Returns: number }
      fn_compute_available_slots: {
        Args: {
          _buffer_minutes?: number
          _business_hours?: Json
          _duration_minutes?: number
          _end_date: string
          _start_date: string
          _tenant_id: string
        }
        Returns: {
          slot_date: string
          slot_end: string
          slot_start: string
          slot_time_local: string
        }[]
      }
      fn_confirm_booking: {
        Args: {
          _hold_id: string
          _lead_id?: string
          _notes?: string
          _service_id?: string
        }
        Returns: string
      }
      fn_confirm_slot_from_session: {
        Args: {
          _customer_id?: string
          _notes?: string
          _service_id?: string
          _session_id: string
          _slot_end: string
          _slot_start: string
        }
        Returns: {
          booking_id: string
          error_message: string
          success: boolean
        }[]
      }
      fn_extend_session_locks: {
        Args: { _extend_minutes?: number; _session_id: string }
        Returns: number
      }
      fn_lock_offered_slots: {
        Args: {
          _lock_minutes?: number
          _session_id: string
          _slots: Json
          _tenant_id: string
        }
        Returns: number
      }
      fn_place_hold:
        | {
            Args: {
              _end_at: string
              _hold_minutes?: number
              _session_id?: string
              _start_at: string
              _tenant_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _end_at: string
              _session_id: string
              _start_at: string
              _tenant_id: string
              _ttl_minutes?: number
            }
            Returns: {
              conflict_reason: string
              hold_id: string
              success: boolean
            }[]
          }
      fn_refresh_session_slots: { Args: never; Returns: number }
      fn_release_session_locks: {
        Args: { _session_id: string }
        Returns: number
      }
      fn_sync_busy_blocks: {
        Args: { _connection_id: string; _events: Json; _tenant_id: string }
        Returns: number
      }
      generate_job_number: { Args: { p_tenant_id: string }; Returns: string }
      get_ai_readiness: { Args: { tenant_uuid: string }; Returns: Json }
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
      is_tenant_member: { Args: { p_tenant_id: string }; Returns: boolean }
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
        | "lead.recovered"
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
      business_mode:
        | "service"
        | "dispatch"
        | "food"
        | "medical"
        | "general"
        | "sales"
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
        | "required_inputs"
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
      off_behavior: "FORWARD_OWNER" | "VOICEMAIL" | "CALLBACK_ONLY"
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
      user_role: "owner" | "staff" | "super_admin" | "driver"
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
        "lead.recovered",
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
      business_mode: [
        "service",
        "dispatch",
        "food",
        "medical",
        "general",
        "sales",
      ],
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
        "required_inputs",
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
      off_behavior: ["FORWARD_OWNER", "VOICEMAIL", "CALLBACK_ONLY"],
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
      user_role: ["owner", "staff", "super_admin", "driver"],
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
