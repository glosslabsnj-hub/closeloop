import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIContextSnapshot {
  id: string;
  tenant_id: string;
  channel: string;
  session_id: string;
  customer_id: string | null;
  location_id: string | null;
  call_sid: string | null;
  context_json: Record<string, unknown>;
  missing_sections: string[];
  created_at: string;
}

export function useAIContextSnapshots(tenantId: string | null) {
  const [snapshots, setSnapshots] = useState<AIContextSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    if (!tenantId) {
      setSnapshots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("ai_context_snapshots")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (queryError) throw new Error(queryError.message);

      setSnapshots((data || []) as AIContextSnapshot[]);
    } catch (err: unknown) {
      console.error("Failed to fetch AI context snapshots:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return { snapshots, loading, error, refetch: fetchSnapshots };
}

// Golden Path validation types and runner
export interface GoldenPathTestResult {
  mode: string;
  testName: string;
  passed: boolean;
  missingKeys: string[];
  details: string;
}

export function runGoldenPathTests(context: Record<string, unknown> | null): GoldenPathTestResult[] {
  if (!context) {
    return [{
      mode: "unknown",
      testName: "Context exists",
      passed: false,
      missingKeys: ["context"],
      details: "No context available",
    }];
  }

  const results: GoldenPathTestResult[] = [];
  const tenant = context.tenant as Record<string, unknown> | undefined;
  const offerings = context.offerings as Record<string, unknown> | undefined;
  const policies = context.policies as Record<string, unknown> | undefined;
  const knowledge = context.knowledge as Record<string, unknown> | undefined;
  const operations = context.operations as Record<string, unknown> | undefined;
  const intelligence = context.intelligence as Record<string, unknown> | undefined;
  const safety = context.safety as Record<string, unknown> | undefined;

  const businessMode = (tenant?.business_mode as string) || "general";

  // Core tenant tests (all modes)
  const tenantMissing: string[] = [];
  if (!tenant?.business_name) tenantMissing.push("business_name");
  if (!tenant?.timezone) tenantMissing.push("timezone");
  if (!tenant?.hours || Object.keys(tenant.hours as object || {}).length === 0) tenantMissing.push("hours");
  if (!tenant?.hours_today) tenantMissing.push("hours_today");

  results.push({
    mode: businessMode,
    testName: "Tenant identity",
    passed: tenantMissing.length === 0,
    missingKeys: tenantMissing,
    details: tenantMissing.length === 0 ? "All tenant fields present" : `Missing: ${tenantMissing.join(", ")}`,
  });

  // Hours test - specific for "What time do you close?" scenario
  results.push({
    mode: businessMode,
    testName: "Hours answerable",
    passed: !!tenant?.hours_today && String(tenant.hours_today).length > 0,
    missingKeys: !!tenant?.hours_today ? [] : ["hours_today"],
    details: tenant?.hours_today ? `Today: ${tenant.hours_today}` : "Hours not available - AI cannot answer hours questions",
  });

  // Service mode tests
  if (["service", "dispatch", "general"].includes(businessMode)) {
    const services = offerings?.services as unknown[] | undefined;
    const servicesMissing: string[] = [];
    
    if (!services || services.length === 0) {
      servicesMissing.push("services");
    } else {
      // Check if at least one service has pricing
      const hasAnyPricing = services.some((s: unknown) => {
        const svc = s as Record<string, unknown>;
        return svc.price_amount !== null && svc.price_amount !== undefined;
      });
      if (!hasAnyPricing) servicesMissing.push("services_with_pricing");
    }

    results.push({
      mode: businessMode,
      testName: "Services & pricing",
      passed: servicesMissing.length === 0,
      missingKeys: servicesMissing,
      details: servicesMissing.length === 0 ? "Services with pricing present" : `Missing: ${servicesMissing.join(", ")}`,
    });
  }

  // Food mode tests
  if (businessMode === "food") {
    const menu = offerings?.menu as unknown[] | undefined;
    const menuMissing: string[] = [];
    
    if (!menu || menu.length === 0) {
      menuMissing.push("menu_items");
    }

    results.push({
      mode: businessMode,
      testName: "Menu items",
      passed: menuMissing.length === 0,
      missingKeys: menuMissing,
      details: menuMissing.length === 0 ? `${menu?.length || 0} menu items available` : `Missing: ${menuMissing.join(", ")}`,
    });

    // Menu summary test - AI needs this to take orders
    const menuSummary = offerings?.menu_summary as string | undefined;
    results.push({
      mode: businessMode,
      testName: "Menu summary (for ordering)",
      passed: !!menuSummary && menuSummary.length > 0,
      missingKeys: menuSummary ? [] : ["menu_summary"],
      details: menuSummary ? `${menuSummary.slice(0, 80)}...` : "No menu summary - AI cannot take orders",
    });

    // Food ordering module test
    const modules = operations?.modules as Record<string, boolean> | undefined;
    results.push({
      mode: businessMode,
      testName: "Food orders enabled",
      passed: modules?.orders_enabled === true,
      missingKeys: modules?.orders_enabled ? [] : ["food_orders_module"],
      details: modules?.orders_enabled ? "Food orders module enabled" : "Food orders module disabled",
    });
  }

  // Dispatch mode tests
  if (businessMode === "dispatch") {
    const modules = operations?.modules as Record<string, boolean> | undefined;
    const dispatchMissing: string[] = [];
    
    if (!modules?.dispatch_enabled) {
      dispatchMissing.push("dispatch_module");
    }

    results.push({
      mode: businessMode,
      testName: "Dispatch configuration",
      passed: dispatchMissing.length === 0,
      missingKeys: dispatchMissing,
      details: dispatchMissing.length === 0 ? "Dispatch module enabled" : `Missing: ${dispatchMissing.join(", ")}`,
    });
  }

  // Medical mode tests
  if (businessMode === "medical") {
    const medicalMissing: string[] = [];
    
    if (safety?.hipaa_mode !== true) {
      medicalMissing.push("hipaa_mode");
    }
    if (safety?.phi_minimization !== true) {
      medicalMissing.push("phi_minimization");
    }
    // Memory should be disabled or excluded
    const memoryHints = intelligence?.memory_hints as unknown[] | undefined;
    if (memoryHints && memoryHints.length > 0) {
      // Check if any are customer_preference type (should be excluded)
      const hasCustomerPrefs = memoryHints.some((h: unknown) => {
        const hint = h as Record<string, unknown>;
        return hint.type === "customer_preference";
      });
      if (hasCustomerPrefs) medicalMissing.push("customer_memory_excluded");
    }

    results.push({
      mode: businessMode,
      testName: "HIPAA compliance",
      passed: medicalMissing.length === 0,
      missingKeys: medicalMissing,
      details: medicalMissing.length === 0 ? "HIPAA settings correct" : `Missing: ${medicalMissing.join(", ")}`,
    });
  }

  // Policies tests (all modes)
  const policiesMissing: string[] = [];
  if (!policies?.cancellation && !policies?.deposit) policiesMissing.push("policies");
  
  results.push({
    mode: businessMode,
    testName: "Policies",
    passed: policiesMissing.length === 0,
    missingKeys: policiesMissing,
    details: policiesMissing.length === 0 ? "Policies present" : `Missing: ${policiesMissing.join(", ")}`,
  });

  // FAQs test (all modes)
  const faqs = knowledge?.faqs as unknown[] | undefined;
  results.push({
    mode: businessMode,
    testName: "FAQs",
    passed: (faqs?.length || 0) >= 1,
    missingKeys: (faqs?.length || 0) >= 1 ? [] : ["faqs"],
    details: (faqs?.length || 0) >= 1 ? `${faqs?.length} FAQs present` : "No FAQs configured",
  });

  // Intake fields test (all modes except food)
  if (businessMode !== "food") {
    const intake = context.intake as Record<string, unknown> | undefined;
    const requiredFields = intake?.required_fields as unknown[] | undefined;
    results.push({
      mode: businessMode,
      testName: "Intake fields",
      passed: (requiredFields?.length || 0) >= 1,
      missingKeys: (requiredFields?.length || 0) >= 1 ? [] : ["intake_fields"],
      details: (requiredFields?.length || 0) >= 1 ? `${requiredFields?.length} intake fields` : "No intake fields configured",
    });
  }

  return results;
}
