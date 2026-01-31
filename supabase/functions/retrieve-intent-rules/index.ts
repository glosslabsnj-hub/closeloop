import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type IntentRuleType = 
  | "time_preference"
  | "upsell_rule"
  | "discount_guardrail"
  | "urgency_handling"
  | "capacity_protection";

interface RuleContext {
  intent?: string;
  service_id?: string;
  service_name?: string;
  requested_time?: string;
  requested_hour?: number;
  day_of_week?: number;
  is_emergency?: boolean;
  capacity_percent?: number;
  is_same_day?: boolean;
}

interface MatchedRule {
  id: string;
  type: IntentRuleType;
  name: string;
  action: Record<string, any>;
  reason: string;
  priority: number;
}

interface RetrieveRulesRequest {
  tenantId: string;
  context?: RuleContext;
}

interface RetrieveRulesResponse {
  rules: MatchedRule[];
  total_enabled_rules: number;
}

// Evaluate if a rule's condition matches the current context
function evaluateCondition(condition: Record<string, any>, context: RuleContext): { matches: boolean; reason: string } {
  // Empty condition always matches
  if (!condition || Object.keys(condition).length === 0) {
    return { matches: true, reason: "Default rule" };
  }

  // Time-based conditions
  if (condition.time_range) {
    const { start_hour, end_hour } = condition.time_range;
    if (context.requested_hour !== undefined) {
      if (context.requested_hour >= start_hour && context.requested_hour <= end_hour) {
        return { matches: true, reason: `Requested time is between ${start_hour}:00-${end_hour}:00` };
      }
    }
    return { matches: false, reason: "" };
  }

  // Day-based conditions
  if (condition.days && Array.isArray(condition.days)) {
    if (context.day_of_week !== undefined) {
      if (condition.days.includes(context.day_of_week)) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return { matches: true, reason: `Applies on ${dayNames[context.day_of_week]}` };
      }
    }
    return { matches: false, reason: "" };
  }

  // Service-based conditions
  if (condition.service_id || condition.service_name) {
    if (context.service_id && condition.service_id === context.service_id) {
      return { matches: true, reason: `Applies to this service` };
    }
    if (context.service_name && condition.service_name?.toLowerCase() === context.service_name.toLowerCase()) {
      return { matches: true, reason: `Applies to ${context.service_name}` };
    }
    return { matches: false, reason: "" };
  }

  // Emergency/urgency conditions
  if (condition.is_emergency !== undefined) {
    if (context.is_emergency === condition.is_emergency) {
      return { matches: true, reason: condition.is_emergency ? "Emergency call detected" : "Non-emergency call" };
    }
    return { matches: false, reason: "" };
  }

  // Capacity conditions
  if (condition.capacity_threshold !== undefined) {
    if (context.capacity_percent !== undefined && context.capacity_percent >= condition.capacity_threshold) {
      return { matches: true, reason: `Capacity at ${context.capacity_percent}% (threshold: ${condition.capacity_threshold}%)` };
    }
    return { matches: false, reason: "" };
  }

  // Same-day conditions
  if (condition.is_same_day !== undefined) {
    if (context.is_same_day === condition.is_same_day) {
      return { matches: true, reason: condition.is_same_day ? "Same-day booking request" : "Future booking" };
    }
    return { matches: false, reason: "" };
  }

  // Slow day conditions (opposite of busy)
  if (condition.slow_days && Array.isArray(condition.slow_days)) {
    if (context.day_of_week !== undefined) {
      const isSlowDay = condition.slow_days.includes(context.day_of_week);
      if (condition.only_on_slow_days && isSlowDay) {
        return { matches: true, reason: "Slow day detected" };
      }
      if (condition.not_on_slow_days && !isSlowDay) {
        return { matches: true, reason: "Not a slow day" };
      }
    }
    return { matches: false, reason: "" };
  }

  // If we can't evaluate, assume it matches (permissive by default)
  return { matches: true, reason: "Condition evaluated" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, context }: RetrieveRulesRequest = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all enabled, non-suggested rules
    const { data: rules, error: rulesError } = await supabase
      .from("business_intent_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_enabled", true)
      .eq("is_suggested", false)
      .order("priority", { ascending: false });

    if (rulesError) {
      throw rulesError;
    }

    const allRules = rules || [];
    const matchedRules: MatchedRule[] = [];

    // Evaluate each rule against context
    for (const rule of allRules) {
      const { matches, reason } = evaluateCondition(rule.condition_json || {}, context || {});
      
      if (matches) {
        matchedRules.push({
          id: rule.id,
          type: rule.rule_type,
          name: rule.name,
          action: rule.action_json || {},
          reason,
          priority: rule.priority,
        });
      }
    }

    // Sort by priority (higher first)
    matchedRules.sort((a, b) => b.priority - a.priority);

    const response: RetrieveRulesResponse = {
      rules: matchedRules,
      total_enabled_rules: allRules.length,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in retrieve-intent-rules:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
