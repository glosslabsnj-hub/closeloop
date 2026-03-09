import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthedTenant } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface KnowledgeSnippet {
  source_type: 'faq' | 'objection' | 'policy' | 'service' | 'upsell' | 'intake';
  id: string;
  title: string;
  content: string;
  relevance_score: number;
  metadata?: Record<string, unknown>;
}

// Simple keyword-based relevance scoring
function calculateRelevance(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const textLower = text.toLowerCase();
  
  let score = 0;
  let exactMatches = 0;
  
  for (const word of queryWords) {
    if (textLower.includes(word)) {
      score += 1;
      // Bonus for exact word match (not just substring)
      if (new RegExp(`\\b${word}\\b`).test(textLower)) {
        exactMatches += 1;
      }
    }
  }
  
  // Normalize by query length and add bonus for exact matches
  const baseScore = queryWords.length > 0 ? score / queryWords.length : 0;
  const exactBonus = exactMatches * 0.1;
  
  return Math.min(baseScore + exactBonus, 1);
}

// Intent-based boosting
function getIntentBoost(intent: string, sourceType: string): number {
  const boosts: Record<string, Record<string, number>> = {
    booking: { service: 0.3, intake: 0.2 },
    quote: { service: 0.4, policy: 0.1 },
    service_info: { service: 0.4, faq: 0.2 },
    pricing: { service: 0.5 },
    cancel: { policy: 0.5 },
    reschedule: { policy: 0.3, service: 0.2 },
    hours: { faq: 0.3 },
    location: { faq: 0.3 },
    objection: { objection: 0.5 },
    urgent: { policy: 0.3 },
    // general/faq: services always show up so users can discover what's available
    general: { service: 0.15, faq: 0.1 },
    faq: { service: 0.15, faq: 0.2 },
  };

  return boosts[intent]?.[sourceType] || 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { queryText, intent, topK = 8 } = body;
    const requestedTenantId = body.tenant_id ?? body.tenantId ?? null;

    if (!queryText) {
      return new Response(
        JSON.stringify({ error: "Query text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate user has access to the requested tenant
    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all knowledge sources in parallel
    const [
      faqsResult,
      objectionsResult,
      servicesResult,
      knowledgeBaseResult,
      tenantResult,
    ] = await Promise.all([
      supabase.from("business_faqs").select("*").eq("tenant_id", tenantId),
      supabase.from("objection_responses").select("*").eq("tenant_id", tenantId),
      supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("ai_knowledge_base").select("*").eq("tenant_id", tenantId),
      supabase.from("tenants").select("context_fields_json, cancellation_policy, deposit_policy, refund_policy, hours_json").eq("id", tenantId).single(),
    ]);

    const snippets: KnowledgeSnippet[] = [];
    const detectedIntent = intent || 'general';

    // Process FAQs
    for (const faq of faqsResult.data || []) {
      const searchText = `${faq.question} ${faq.answer}`;
      const baseScore = calculateRelevance(queryText, searchText);
      const intentBoost = getIntentBoost(detectedIntent, 'faq');
      const priorityBoost = (faq.priority_weight || 0) * 0.05;
      
      snippets.push({
        source_type: 'faq',
        id: faq.id,
        title: faq.question,
        content: faq.answer,
        relevance_score: baseScore + intentBoost + priorityBoost,
      });
    }

    // Process objection responses
    for (const obj of objectionsResult.data || []) {
      const searchText = `${obj.objection} ${obj.response}`;
      const baseScore = calculateRelevance(queryText, searchText);
      const intentBoost = getIntentBoost(detectedIntent, 'objection');
      const priorityBoost = (obj.priority_weight || 0) * 0.05;
      
      snippets.push({
        source_type: 'objection',
        id: obj.id,
        title: obj.objection,
        content: obj.response,
        relevance_score: baseScore + intentBoost + priorityBoost,
      });
    }

    // Process services
    for (const svc of servicesResult.data || []) {
      // Include "service" keyword so generic queries ("what services do you offer?") always match
      const searchText = `${svc.name} service ${svc.description || ''} ${svc.preparation_instructions || ''}`;
      const baseScore = calculateRelevance(queryText, searchText);
      const intentBoost = getIntentBoost(detectedIntent, 'service');
      
      let content = `${svc.description || 'No description available'}`;
      if (svc.price_type === 'fixed' && svc.price_amount) {
        content += ` Price: $${svc.price_amount}.`;
      } else if (svc.price_type === 'starting_at' && svc.price_amount) {
        content += ` Starting at $${svc.price_amount}.`;
      } else {
        content += ` Price: Quote required.`;
      }
      content += ` Duration: ${svc.duration_minutes} minutes.`;
      if (svc.deposit_required && svc.deposit_amount) {
        content += ` Deposit: $${svc.deposit_amount} required.`;
      }
      
      snippets.push({
        source_type: 'service',
        id: svc.id,
        title: svc.name,
        content,
        relevance_score: baseScore + intentBoost,
        metadata: {
          price_type: svc.price_type,
          price_amount: svc.price_amount,
          duration_minutes: svc.duration_minutes,
          deposit_required: svc.deposit_required,
          deposit_amount: svc.deposit_amount,
          upsells: svc.upsell_suggestions,
        },
      });

      // Add preparation instructions as separate snippet if exists
      if (svc.preparation_instructions) {
        const prepScore = calculateRelevance(queryText, svc.preparation_instructions);
        snippets.push({
          source_type: 'service',
          id: `${svc.id}-prep`,
          title: `${svc.name} - Preparation`,
          content: svc.preparation_instructions,
          relevance_score: prepScore + 0.1,
        });
      }
    }

    // Process knowledge base items
    for (const kb of knowledgeBaseResult.data || []) {
      const searchText = `${kb.title} ${kb.content}`;
      const baseScore = calculateRelevance(queryText, searchText);
      const intentBoost = getIntentBoost(detectedIntent, kb.type);
      const priorityBoost = (kb.priority_weight || 0) * 0.05;
      
      snippets.push({
        source_type: kb.type as any,
        id: kb.id,
        title: kb.title,
        content: kb.content,
        relevance_score: baseScore + intentBoost + priorityBoost,
      });
    }

    // Add tenant hours as auto-generated snippet
    const tenant = tenantResult.data;
    if (tenant?.hours_json && typeof tenant.hours_json === 'object') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const hoursLines: string[] = [];
      for (const dayName of dayNames) {
        const dayLower = dayName.toLowerCase();
        const dayIndex = dayNames.indexOf(dayName).toString();
        const dayData = tenant.hours_json[dayLower] || tenant.hours_json[dayName] || tenant.hours_json[dayIndex];
        if (!dayData) continue;
        if (dayData.closed) {
          hoursLines.push(`${dayName}: Closed`);
        } else if (dayData.windows && Array.isArray(dayData.windows) && dayData.windows.length > 0) {
          const windowStr = dayData.windows.map((w: any) => `${w.open} - ${w.close}`).join(', ');
          hoursLines.push(`${dayName}: ${windowStr}`);
        } else if (dayData.open && dayData.close) {
          hoursLines.push(`${dayName}: ${dayData.open} - ${dayData.close}`);
        }
      }
      if (hoursLines.length > 0) {
        const hoursContent = hoursLines.join('\n');
        const score = calculateRelevance(queryText, `business hours open close schedule when available ${hoursContent}`);
        snippets.push({
          source_type: 'faq' as const,
          id: 'business_hours',
          title: 'Business Hours',
          content: hoursContent,
          relevance_score: score + getIntentBoost(detectedIntent, 'faq') + 0.2, // Always boost hours snippet
        });
      }
    }

    // Add tenant policies as snippets
    if (tenant) {
      if (tenant.cancellation_policy) {
        const score = calculateRelevance(queryText, `cancel cancellation policy ${tenant.cancellation_policy}`);
        snippets.push({
          source_type: 'policy',
          id: 'cancellation_policy',
          title: 'Cancellation Policy',
          content: tenant.cancellation_policy,
          relevance_score: score + getIntentBoost(detectedIntent, 'policy'),
        });
      }
      if (tenant.deposit_policy) {
        const score = calculateRelevance(queryText, `deposit payment policy ${tenant.deposit_policy}`);
        snippets.push({
          source_type: 'policy',
          id: 'deposit_policy',
          title: 'Deposit Policy',
          content: tenant.deposit_policy,
          relevance_score: score + getIntentBoost(detectedIntent, 'policy'),
        });
      }
      if (tenant.refund_policy) {
        const score = calculateRelevance(queryText, `refund money back policy ${tenant.refund_policy}`);
        snippets.push({
          source_type: 'policy',
          id: 'refund_policy',
          title: 'Refund Policy',
          content: tenant.refund_policy,
          relevance_score: score + getIntentBoost(detectedIntent, 'policy'),
        });
      }

      // Add intake fields
      const intakeFields = tenant.context_fields_json;
      if (Array.isArray(intakeFields) && intakeFields.length > 0) {
        const intakeContent = intakeFields.map((f: any) => 
          `${f.label}${f.required ? ' (required)' : ''}: ${f.type}${f.options ? ` - Options: ${f.options.join(', ')}` : ''}`
        ).join('\n');
        
        snippets.push({
          source_type: 'intake',
          id: 'intake_fields',
          title: 'Customer Intake Requirements',
          content: intakeContent,
          relevance_score: calculateRelevance(queryText, 'information needed details customer') + getIntentBoost(detectedIntent, 'intake'),
          metadata: { fields: intakeFields },
        });
      }
    }

    // Sort by relevance and take top K
    const rankedSnippets = snippets
      .filter(s => s.relevance_score > 0.1) // Filter low relevance
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, topK);

    // Determine confidence based on top result score
    const topScore = rankedSnippets[0]?.relevance_score || 0;
    const confidence = topScore > 0.6 ? 'high' : topScore > 0.3 ? 'medium' : 'low';

    return new Response(
      JSON.stringify({ 
        snippets: rankedSnippets,
        confidence,
        query: queryText,
        intent: detectedIntent,
        total_sources_searched: snippets.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error in retrieve-knowledge:", errMsg);
    const isAuthError = /unauthorized|invalid.*jwt|jwt.*expired|not.*member|no.*authorization/i.test(errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: isAuthError ? 401 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
