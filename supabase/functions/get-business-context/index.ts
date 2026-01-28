import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId } = await req.json();
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all business context in parallel
    const [
      tenantResult,
      servicesResult,
      faqsResult,
      objectionsResult,
      assistantResult
    ] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).single(),
      supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("business_faqs").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("objection_responses").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("ai_assistants").select("*").eq("tenant_id", tenantId).single()
    ]);

    if (tenantResult.error) {
      console.error("Error fetching tenant:", tenantResult.error);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenant = tenantResult.data;
    const services = servicesResult.data || [];
    const faqs = faqsResult.data || [];
    const objections = objectionsResult.data || [];
    const assistant = assistantResult.data;

    // Build comprehensive context for AI
    const context = {
      business: {
        name: tenant.name,
        tagline: tenant.tagline,
        industry: tenant.industry,
        address: tenant.address,
        phone: tenant.phone_public,
        website: tenant.website_url,
        yearsInBusiness: tenant.years_in_business,
        timezone: tenant.timezone,
      },
      hours: tenant.hours_json,
      policies: {
        cancellation: tenant.cancellation_policy,
        deposit: tenant.deposit_policy,
        refund: tenant.refund_policy,
        paymentMethods: tenant.payment_methods,
      },
      scheduling: {
        minLeadHours: tenant.min_lead_hours,
        maxAdvanceDays: tenant.max_advance_days,
        bufferMinutes: tenant.appointment_buffer_minutes,
      },
      services: services.map(s => ({
        name: s.name,
        description: s.description,
        duration: s.duration_minutes,
        priceType: s.price_type,
        priceAmount: s.price_amount,
        depositRequired: s.deposit_required,
        depositAmount: s.deposit_amount,
        preparation: s.preparation_instructions,
        upsells: s.upsell_suggestions,
      })),
      faqs: faqs.map(f => ({
        question: f.question,
        answer: f.answer,
      })),
      objectionHandling: objections.map(o => ({
        objection: o.objection,
        response: o.response,
      })),
      aiSettings: assistant ? {
        tone: assistant.tone,
        greeting: assistant.greeting_script,
        fallback: assistant.fallback_script,
      } : null,
      neverPromise: tenant.ai_never_promise || [],
    };

    // Generate system prompt for AI agent
    const systemPrompt = buildSystemPrompt(context);

    return new Response(
      JSON.stringify({ context, systemPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-business-context:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(context: any): string {
  const { business, services, faqs, objectionHandling, aiSettings, neverPromise, policies, hours } = context;
  
  let prompt = `You are an AI voice assistant for ${business.name}`;
  if (business.tagline) prompt += ` - ${business.tagline}`;
  prompt += `.

BUSINESS INFORMATION:
- Industry: ${business.industry}
${business.address ? `- Location: ${business.address}` : ""}
${business.phone ? `- Phone: ${business.phone}` : ""}
${business.website ? `- Website: ${business.website}` : ""}
${business.yearsInBusiness ? `- In business for ${business.yearsInBusiness} years` : ""}

`;

  if (aiSettings?.tone) {
    prompt += `COMMUNICATION STYLE: Be ${aiSettings.tone} in your interactions.\n\n`;
  }

  if (services.length > 0) {
    prompt += `SERVICES OFFERED:\n`;
    services.forEach((s: any) => {
      prompt += `- ${s.name}`;
      if (s.duration) prompt += ` (${s.duration} minutes)`;
      if (s.priceType === "fixed" && s.priceAmount) prompt += ` - $${s.priceAmount}`;
      else if (s.priceType === "starting_at" && s.priceAmount) prompt += ` - Starting at $${s.priceAmount}`;
      else if (s.priceType === "quote_only") prompt += ` - Quote required`;
      prompt += `\n`;
      if (s.description) prompt += `  ${s.description}\n`;
    });
    prompt += `\n`;
  }

  if (hours) {
    prompt += `BUSINESS HOURS:\n`;
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    dayNames.forEach(day => {
      const dayHours = hours[day];
      if (dayHours?.isOpen) {
        prompt += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours.open} - ${dayHours.close}\n`;
      } else {
        prompt += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: Closed\n`;
      }
    });
    prompt += `\n`;
  }

  if (policies.cancellation || policies.deposit || policies.refund) {
    prompt += `POLICIES:\n`;
    if (policies.cancellation) prompt += `- Cancellation: ${policies.cancellation}\n`;
    if (policies.deposit) prompt += `- Deposit: ${policies.deposit}\n`;
    if (policies.refund) prompt += `- Refund: ${policies.refund}\n`;
    if (policies.paymentMethods?.length) prompt += `- Payment methods: ${policies.paymentMethods.join(", ")}\n`;
    prompt += `\n`;
  }

  if (faqs.length > 0) {
    prompt += `FREQUENTLY ASKED QUESTIONS:\n`;
    faqs.slice(0, 10).forEach((f: any) => {
      prompt += `Q: ${f.question}\nA: ${f.answer}\n\n`;
    });
  }

  if (objectionHandling.length > 0) {
    prompt += `OBJECTION HANDLING:\n`;
    objectionHandling.slice(0, 5).forEach((o: any) => {
      prompt += `If customer says: "${o.objection}"\nRespond with: "${o.response}"\n\n`;
    });
  }

  if (neverPromise.length > 0) {
    prompt += `NEVER PROMISE OR GUARANTEE:\n`;
    neverPromise.forEach((item: string) => {
      prompt += `- ${item}\n`;
    });
    prompt += `\n`;
  }

  prompt += `IMPORTANT GUIDELINES:
1. Be helpful, friendly, and professional
2. If you don't know something specific, offer to have someone call them back
3. Try to book appointments when appropriate
4. Collect caller's name and phone number if they want a callback
5. Never make up information about services, prices, or availability
6. If a question is outside your knowledge, use the fallback script

`;

  if (aiSettings?.greeting) {
    prompt += `GREETING: "${aiSettings.greeting}"\n\n`;
  }

  if (aiSettings?.fallback) {
    prompt += `FALLBACK (use when you can't help): "${aiSettings.fallback}"\n`;
  }

  return prompt;
}
