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
          ended_at: string | null
          id: string
          lead_id: string | null
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
          ended_at?: string | null
          id?: string
          lead_id?: string | null
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
          ended_at?: string | null
          id?: string
          lead_id?: string | null
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
            foreignKeyName: "ai_call_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      conversations: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"]
          created_at: string
          id: string
          lead_id: string
          tenant_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          lead_id: string
          tenant_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          lead_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      services: {
        Row: {
          created_at: string
          deposit_amount: number | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_amount: number | null
          price_type: Database["public"]["Enums"]["price_type"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price_amount?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_amount?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          tenant_id?: string
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
          ai_enabled: boolean
          context_fields_json: Json | null
          created_at: string
          custom_industry: string | null
          hours_json: Json | null
          id: string
          industry: Database["public"]["Enums"]["industry_type"]
          name: string
          phone_public: string | null
          timezone: string
        }
        Insert: {
          ai_enabled?: boolean
          context_fields_json?: Json | null
          created_at?: string
          custom_industry?: string | null
          hours_json?: Json | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          name: string
          phone_public?: string | null
          timezone?: string
        }
        Update: {
          ai_enabled?: boolean
          context_fields_json?: Json | null
          created_at?: string
          custom_industry?: string | null
          hours_json?: Json | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          name?: string
          phone_public?: string | null
          timezone?: string
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
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
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
      price_type: "fixed" | "starting_at" | "quote_only"
      user_role: "owner" | "staff" | "super_admin"
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
      price_type: ["fixed", "starting_at", "quote_only"],
      user_role: ["owner", "staff", "super_admin"],
    },
  },
} as const
