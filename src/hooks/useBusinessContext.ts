import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessContext } from "@/types/database";

/**
 * Hook to fetch and manage business context for AI injection
 */
export function useBusinessContext(tenantId: string | null) {
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!tenantId) {
      setContext(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('fn_build_business_context', {
        _tenant_id: tenantId,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setContext(data as unknown as BusinessContext);
    } catch (err: any) {
      console.error('Failed to fetch business context:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return { context, loading, error, refetch: fetchContext };
}

/**
 * Calculate AI readiness score from context
 */
export function calculateReadinessFromContext(context: BusinessContext | null): number {
  if (!context) return 0;

  let score = 0;

  // Business identity (20 points)
  if (context.business.name) score += 5;
  if (context.business.phone) score += 5;
  if (context.business.address) score += 5;
  if (context.business.tagline) score += 5;

  // Services (20 points)
  const serviceCount = context.services?.length || 0;
  if (serviceCount >= 1) score += 10;
  if (serviceCount >= 3) score += 10;

  // Hours (10 points)
  if (context.hours && Object.keys(context.hours).length > 0) score += 10;

  // Policies (15 points)
  if (context.policies.cancellation) score += 5;
  if (context.policies.deposit) score += 5;
  if (context.policies.payment_methods && context.policies.payment_methods.length > 0) score += 5;

  // FAQs (20 points)
  const faqCount = context.faqs?.length || 0;
  if (faqCount >= 3) score += 10;
  if (faqCount >= 6) score += 10;

  // Objections (15 points)
  const objectionCount = context.objection_responses?.length || 0;
  if (objectionCount >= 2) score += 8;
  if (objectionCount >= 4) score += 7;

  return Math.min(score, 100);
}

/**
 * Get missing items for AI knowledge gaps
 */
export function getMissingKnowledge(context: BusinessContext | null): string[] {
  if (!context) return ['No business data configured'];

  const missing: string[] = [];

  if (!context.business.name) missing.push('Business name');
  if (!context.business.phone) missing.push('Public phone number');
  if (!context.business.address) missing.push('Business address');
  
  if (!context.services || context.services.length === 0) {
    missing.push('Services and pricing');
  }

  if (!context.hours || Object.keys(context.hours).length === 0) {
    missing.push('Business hours');
  }

  if (!context.policies.cancellation) missing.push('Cancellation policy');
  if (!context.policies.deposit) missing.push('Deposit policy');
  if (!context.policies.payment_methods || context.policies.payment_methods.length === 0) {
    missing.push('Payment methods');
  }

  if (!context.faqs || context.faqs.length < 3) {
    missing.push('FAQs (minimum 3 recommended)');
  }

  if (!context.objection_responses || context.objection_responses.length < 2) {
    missing.push('Objection responses (minimum 2 recommended)');
  }

  return missing;
}
