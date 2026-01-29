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
    const { tenantId, customerMessage, customerName, customerPhone, conversationType, locationId } = await req.json();
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get business context with intelligence layers
    const contextResponse = await fetch(`${supabaseUrl}/functions/v1/get-business-context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ 
        tenantId, 
        locationId,
        includeIntelligence: true 
      }),
    });

    if (!contextResponse.ok) {
      throw new Error("Failed to fetch business context");
    }

    const { context, systemPrompt } = await contextResponse.json();

    // Build SMS-specific prompt with intelligence layers
    let smsPrompt = systemPrompt + `

SMS CONVERSATION GUIDELINES:
1. Keep responses concise - SMS messages should be short and actionable
2. Use casual, friendly language appropriate for text messaging
3. Include a clear call-to-action when appropriate
4. If booking is relevant, ask for their preferred date/time
5. Always be helpful and responsive

PRICING BEHAVIOR FOR SMS:
1. If customer asks about pricing and a service has an exact price → Quote it: "Drain cleaning is $149"
2. If it's a "starts at" price → Say "starting at $X, final price depends on the job"
3. If no price exists → Offer to have someone call with a quote or schedule an on-site estimate
4. NEVER say "I don't have access to pricing" when pricing exists in the services context
5. Match requests by common terms (e.g., "clogged drain" = "drain cleaning")

`;

    // Add intent rules context for SMS
    if (context.intent_rules && context.intent_rules.length > 0) {
      smsPrompt += `ACTIVE RULES TO FOLLOW:\n`;
      for (const rule of context.intent_rules) {
        const guidance = rule.action?.guidance || rule.action?.suggest_alternative || "";
        if (guidance) {
          smsPrompt += `- ${rule.name}: ${guidance}\n`;
        }
      }
      smsPrompt += `\n`;
    }

    // Add memory hints for personalization (NOT upsells)
    if (context.memory_hints && context.memory_hints.length > 0) {
      smsPrompt += `PERSONALIZATION HINTS (use subtly, never push sales):\n`;
      for (const hint of context.memory_hints) {
        smsPrompt += `- ${hint.summary}\n`;
      }
      smsPrompt += `\n`;
    }

    // Determine the type of response needed
    let userPrompt = "";
    
    if (conversationType === "missed_call") {
      userPrompt = `A customer just tried to call but the call was missed. Generate a friendly SMS to send them immediately. ${customerName ? `The customer's name is ${customerName}.` : ""}

The message should:
- Acknowledge that we saw their call
- Apologize for missing it
- Offer to help via text or schedule a callback
- Be warm and professional

Generate ONLY the SMS message text, nothing else.`;
    } else if (customerMessage) {
      userPrompt = `A customer sent this text message: "${customerMessage}"

${customerName ? `The customer's name is ${customerName}.` : ""}

Generate an appropriate SMS response that:
- Addresses their question or concern
- Is helpful and actionable
- Stays under 320 characters if possible
- Maintains the business's tone and personality
- Applies any relevant behavior rules from the business owner

Generate ONLY the SMS message text, nothing else.`;
    } else {
      userPrompt = `Generate a friendly follow-up SMS for a lead. ${customerName ? `The customer's name is ${customerName}.` : ""}

The message should:
- Be warm and inviting
- Mention the business's services briefly
- Ask how we can help them
- Be under 160 characters

Generate ONLY the SMS message text, nothing else.`;
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: smsPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const generatedMessage = aiData.choices?.[0]?.message?.content?.trim();

    if (!generatedMessage) {
      throw new Error("No message generated");
    }

    // Record observation for inbound SMS
    if (customerMessage && customerPhone) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            tenantId,
            locationId: locationId || null,
            observationType: "customer_preference",
            subjectKey: `sms_${customerPhone?.replace(/\D/g, "").slice(-10)}`,
            observation: `Customer texted: ${customerMessage.substring(0, 100)}`,
          }),
        });
      } catch (obsError) {
        console.error("Failed to record SMS observation:", obsError);
        // Non-blocking - continue with response
      }
    }

    // Record audit event
    try {
      await fetch(`${supabaseUrl}/functions/v1/record-audit-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          location_id: locationId || null,
          event_type: "sms.received",
          entity_type: "sms",
          actor_type: "ai",
          payload: {
            conversation_type: conversationType,
            has_customer_message: !!customerMessage,
          },
        }),
      });
    } catch (auditError) {
      console.error("Failed to record audit event:", auditError);
      // Non-blocking
    }

    return new Response(
      JSON.stringify({ 
        message: generatedMessage,
        businessName: context.business.name,
        intentRulesApplied: context.intent_rules?.length || 0,
        memoryHintsUsed: context.memory_hints?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-text-reply:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
