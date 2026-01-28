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
    const { tenantId, customerMessage, customerName, conversationType } = await req.json();
    
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

    // Get business context
    const contextResponse = await fetch(`${supabaseUrl}/functions/v1/get-business-context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ tenantId }),
    });

    if (!contextResponse.ok) {
      throw new Error("Failed to fetch business context");
    }

    const { context, systemPrompt } = await contextResponse.json();

    // Build SMS-specific prompt
    let smsPrompt = systemPrompt + `

SMS CONVERSATION GUIDELINES:
1. Keep responses concise - SMS messages should be short and actionable
2. Use casual, friendly language appropriate for text messaging
3. Include a clear call-to-action when appropriate
4. If booking is relevant, ask for their preferred date/time
5. Always be helpful and responsive

`;

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

    return new Response(
      JSON.stringify({ 
        message: generatedMessage,
        businessName: context.business.name,
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
