/**
 * useInterviewToFields - Maps interview answers to Business Brain database fields
 * 
 * Handles the transformation and persistence of interview answers
 * to the appropriate database tables.
 */

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { InterviewAnswers } from "./useInterviewState";
import type { Json } from "@/integrations/supabase/types";

interface SaveResult {
  success: boolean;
  errors?: string[];
}

export function useInterviewToFields() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (answers: InterviewAnswers): Promise<SaveResult> => {
      if (!tenant?.id) {
        throw new Error("No tenant found");
      }

      const errors: string[] = [];

      // 1. Update tenants table
      const tenantUpdates: Record<string, unknown> = {};
      
      if (answers.business_name) {
        tenantUpdates.name = answers.business_name;
      }
      if (answers.business_tagline || answers.service_description) {
        tenantUpdates.tagline = answers.business_tagline || answers.service_description;
      }
      if (answers.business_address) {
        tenantUpdates.address = answers.business_address;
      }
      if (answers.timezone) {
        tenantUpdates.timezone = answers.timezone;
      }
      if (answers.buffer_time) {
        tenantUpdates.appointment_buffer_minutes = parseInt(answers.buffer_time as string, 10);
      }
      if (answers.service_radius) {
        tenantUpdates.service_radius_miles = parseInt(answers.service_radius as string, 10);
      }

      // Handle context_fields_json updates
      const contextUpdates: Record<string, unknown> = {};
      
      if (answers.dispatch_services) {
        const services = answers.dispatch_services as string[];
        contextUpdates.offers_towing = services.includes("towing");
        contextUpdates.offers_roadside = services.includes("roadside");
        contextUpdates.offers_impound = services.includes("impound");
        contextUpdates.offers_recovery = services.includes("recovery");
      }
      if (answers.quote_style) {
        contextUpdates.quote_style = answers.quote_style;
      }
      if (answers.service_location) {
        contextUpdates.service_location = answers.service_location;
        contextUpdates.offers_mobile = answers.service_location === "mobile" || answers.service_location === "both";
      }
      if (answers.operates_impound !== undefined) {
        contextUpdates.offers_impound = answers.operates_impound;
      }
      if (answers.ai_never_promise) {
        contextUpdates.ai_never_promise = answers.ai_never_promise;
      }
      if (answers.always_mention) {
        contextUpdates.ai_always_mention = answers.always_mention;
      }
      if (answers.travel_fee) {
        contextUpdates.travel_fee_type = answers.travel_fee;
      }
      if (answers.typical_eta) {
        contextUpdates.typical_eta = answers.typical_eta;
      }
      if (answers.primary_action) {
        contextUpdates.primary_action = answers.primary_action;
      }

      // Fetch existing context_fields_json to merge
      if (Object.keys(contextUpdates).length > 0) {
        const { data: existingTenant } = await supabase
          .from("tenants")
          .select("context_fields_json")
          .eq("id", tenant.id)
          .single();

        const existingContext = (existingTenant?.context_fields_json as Record<string, unknown>) || {};
        tenantUpdates.context_fields_json = {
          ...existingContext,
          ...contextUpdates,
        } as Json;
      }

      if (Object.keys(tenantUpdates).length > 0) {
        const { error } = await supabase
          .from("tenants")
          .update(tenantUpdates)
          .eq("id", tenant.id);

        if (error) {
          errors.push(`Tenant update failed: ${error.message}`);
        }
      }

      // 2. Update assistant_settings
      const assistantUpdates: Record<string, unknown> = {};
      
      if (answers.after_hours_behavior) {
        assistantUpdates.off_behavior = answers.after_hours_behavior;
      }
      if (answers.requires_deposits !== undefined) {
        assistantUpdates.deposit_required = answers.requires_deposits !== "no";
      }
      if (answers.deposit_amount) {
        assistantUpdates.deposit_amount = answers.deposit_amount;
      }
      if (answers.cancellation_notice) {
        assistantUpdates.cancellation_notice_hours = parseInt(answers.cancellation_notice as string, 10);
      }

      if (Object.keys(assistantUpdates).length > 0) {
        const { error } = await supabase
          .from("assistant_settings")
          .update(assistantUpdates)
          .eq("tenant_id", tenant.id);

        if (error) {
          errors.push(`Assistant settings update failed: ${error.message}`);
        }
      }

      // 3. Update ai_assistants (greeting, tone)
      const aiUpdates: Record<string, unknown> = {};

      if (answers.ai_tone) {
        aiUpdates.tone = answers.ai_tone;
      }
      if (answers.custom_greeting) {
        aiUpdates.greeting_script = answers.custom_greeting;
      } else if (answers.greeting_style && answers.greeting_style !== "custom") {
        // Generate greeting based on style
        const businessName = answers.business_name || tenant.name || "our business";
        if (answers.greeting_style === "simple") {
          aiUpdates.greeting_script = `Thank you for calling ${businessName}. How can I help you?`;
        } else if (answers.greeting_style === "warm") {
          aiUpdates.greeting_script = `Hi there! Thanks for calling ${businessName}. What can I do for you today?`;
        }
      }

      if (Object.keys(aiUpdates).length > 0) {
        const { error } = await supabase
          .from("ai_assistants")
          .update(aiUpdates)
          .eq("tenant_id", tenant.id);

        if (error) {
          errors.push(`AI assistant update failed: ${error.message}`);
        }
      }

      // 4. Handle dispatch-specific updates
      if (answers.after_hours_surcharge && answers.after_hours_surcharge !== "no") {
        const multiplier = parseFloat(answers.after_hours_surcharge as string);
        if (!isNaN(multiplier)) {
          const { error } = await supabase
            .from("dispatch_policies")
            .upsert({
              tenant_id: tenant.id,
              after_hours_multiplier: multiplier,
            }, {
              onConflict: "tenant_id",
            });

          if (error) {
            errors.push(`Dispatch policies update failed: ${error.message}`);
          }
        }
      }

      // 5. Handle food-specific updates
      if (answers.food_service_types || answers.prep_time_normal || answers.delivery_radius) {
        const foodUpdates: Record<string, unknown> = {};

        if (answers.food_service_types) {
          const types = answers.food_service_types as string[];
          foodUpdates.pickup_enabled = types.includes("pickup");
          foodUpdates.delivery_enabled = types.includes("delivery");
          foodUpdates.dine_in_enabled = types.includes("dine_in");
          foodUpdates.catering_enabled = types.includes("catering");
        }
        if (answers.prep_time_normal) {
          foodUpdates.prep_time_minutes = parseInt(answers.prep_time_normal as string, 10);
        }
        if (answers.delivery_radius) {
          foodUpdates.delivery_radius_miles = parseInt(answers.delivery_radius as string, 10);
        }
        if (answers.reservation_advance_days) {
          foodUpdates.reservation_advance_days = parseInt(answers.reservation_advance_days as string, 10);
        }

        const { error } = await supabase
          .from("food_order_settings")
          .upsert({
            tenant_id: tenant.id,
            ...foodUpdates,
          }, {
            onConflict: "tenant_id",
          });

        if (error) {
          errors.push(`Food settings update failed: ${error.message}`);
        }
      }

      // 6. Handle medical-specific updates
      if (answers.appointment_types || answers.accepts_insurance !== undefined || answers.hipaa_covered !== undefined) {
        const medicalUpdates: Record<string, unknown> = {};

        if (answers.appointment_types) {
          medicalUpdates.appointment_types = answers.appointment_types;
        }
        if (answers.accepts_insurance !== undefined) {
          medicalUpdates.accepts_insurance = answers.accepts_insurance;
        }
        if (answers.triage_needed !== undefined) {
          medicalUpdates.triage_enabled = answers.triage_needed;
        }

        const { error } = await supabase
          .from("medical_practice_settings")
          .upsert({
            tenant_id: tenant.id,
            ...medicalUpdates,
          }, {
            onConflict: "tenant_id",
          });

        if (error) {
          errors.push(`Medical settings update failed: ${error.message}`);
        }

        // Also update hipaa_mode on tenant
        if (answers.hipaa_covered !== undefined) {
          const { error: hipaaError } = await supabase
            .from("tenants")
            .update({ hipaa_mode: Boolean(answers.hipaa_covered) })
            .eq("id", tenant.id);

          if (hipaaError) {
            errors.push(`HIPAA mode update failed: ${hipaaError.message}`);
          }
        }
      }

      // 7. Handle impound settings
      if (answers.impound_daily_rate) {
        const { error } = await supabase
          .from("impound_settings")
          .upsert({
            tenant_id: tenant.id,
            daily_storage_rate: parseFloat(answers.impound_daily_rate as string),
          }, {
            onConflict: "tenant_id",
          });

        if (error) {
          errors.push(`Impound settings update failed: ${error.message}`);
        }
      }

      // 8. Handle service policies
      if (answers.cancellation_fee) {
        const { error } = await supabase
          .from("service_policies")
          .upsert({
            tenant_id: tenant.id,
            cancellation_fee_type: answers.cancellation_fee,
          }, {
            onConflict: "tenant_id",
          });

        if (error) {
          errors.push(`Service policies update failed: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["tenant-profile"] });
      queryClient.invalidateQueries({ queryKey: ["assistant-settings"] });
      queryClient.invalidateQueries({ queryKey: ["ai-assistant"] });
      queryClient.invalidateQueries({ queryKey: ["services-count"] });
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });

      if (result.success) {
        toast.success("Your settings have been saved!");
      } else {
        toast.warning("Some settings couldn't be saved. You can update them in Business Brain.");
      }
    },
    onError: (error) => {
      console.error("Interview save error:", error);
      toast.error("Failed to save settings. Please try again.");
    },
  });

  const saveAnswers = useCallback(async (answers: InterviewAnswers) => {
    return saveMutation.mutateAsync(answers);
  }, [saveMutation]);

  return {
    saveAnswers,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}
