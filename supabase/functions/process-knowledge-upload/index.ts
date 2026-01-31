import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractionRequest {
  sourceId: string;
  tenantId: string;
  fileUrl: string;
  sourceType: string;
}

interface MenuItem {
  name: string;
  description?: string;
  price_cents: number;
  category?: string;
}

interface ServiceItem {
  name: string;
  description?: string;
  price_amount: number;
  price_type: "fixed" | "starting_at" | "quote_only";
  duration_minutes?: number;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface PolicyData {
  cancellation?: string;
  refund?: string;
  deposit?: string;
  general?: string;
}

// Simple fuzzy similarity check
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  
  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / longer.length;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    // Support both old format (sourceId, tenantId, fileUrl, sourceType) and new format (upload_id)
    let sourceId: string;
    let tenantId: string;
    let fileUrl: string;
    let sourceType: string;
    let useNewTable = false;

    if (body.upload_id) {
      // New format: knowledge_uploads table
      useNewTable = true;
      const { data: upload, error } = await supabase
        .from("knowledge_uploads")
        .select("*")
        .eq("id", body.upload_id)
        .single();

      if (error || !upload) {
        throw new Error("Upload not found");
      }

      sourceId = upload.id;
      tenantId = upload.tenant_id;
      fileUrl = upload.file_url;
      sourceType = upload.file_type || "general";

      // Mark as processing
      await supabase
        .from("knowledge_uploads")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", sourceId);
    } else {
      // Old format: knowledge_sources table
      sourceId = body.sourceId;
      tenantId = body.tenantId;
      fileUrl = body.fileUrl;
      sourceType = body.sourceType;

      if (!sourceId || !tenantId || !fileUrl || !sourceType) {
        throw new Error("Missing required fields: sourceId, tenantId, fileUrl, sourceType");
      }

      // Update status to processing
      await supabase
        .from("knowledge_sources")
        .update({ status: "processing" })
        .eq("id", sourceId);
    }

    console.log(`Processing upload: ${sourceId}, type: ${sourceType}, new table: ${useNewTable}`);

    // Fetch the file from storage
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const contentType = fileResponse.headers.get("content-type") || "";
    let fileContent: string;
    let isImage = false;

    // Determine file type and extract content
    if (contentType.includes("image") || ["png", "jpg", "jpeg"].includes(sourceType.toLowerCase())) {
      // For images, we'll send as base64 to the AI for OCR
      isImage = true;
      const buffer = await fileResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      fileContent = `data:${contentType || "image/png"};base64,${base64}`;
    } else {
      // For text-based files (PDF text layer, DOCX, etc.)
      fileContent = await fileResponse.text();
    }

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build the extraction prompt based on source type
    const extractionTools = getExtractionTools(sourceType);
    const systemPrompt = getSystemPrompt(sourceType);

    // Call Lovable AI for extraction
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (isImage) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Please extract the information from this image:" },
          { type: "image_url", image_url: { url: fileContent } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: `Please extract the information from this document:\n\n${fileContent.substring(0, 50000)}`
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: extractionTools,
        tool_choice: { type: "function", function: { name: extractionTools[0].function.name } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a few minutes.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add funds to continue processing.");
      }
      throw new Error(`AI extraction failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI did not return extracted data");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", JSON.stringify(extractedData).substring(0, 500));

    // Process extracted data based on type
    let suggestionsCreated = 0;
    let conflictsCreated = 0;

    switch (sourceType) {
      case "menu_pdf":
        const menuResult = await processMenuItems(supabase, tenantId, sourceId, extractedData.items || []);
        suggestionsCreated = menuResult.suggestions;
        conflictsCreated = menuResult.conflicts;
        break;

      case "services_doc":
        const servicesResult = await processServices(supabase, tenantId, sourceId, extractedData.services || []);
        suggestionsCreated = servicesResult.suggestions;
        conflictsCreated = servicesResult.conflicts;
        break;

      case "faq_doc":
        const faqResult = await processFAQs(supabase, tenantId, sourceId, extractedData.faqs || []);
        suggestionsCreated = faqResult.suggestions;
        conflictsCreated = faqResult.conflicts;
        break;

      case "pricing":
        // Pricing can contain both services and menu items
        if (extractedData.services?.length > 0) {
          const sr = await processServices(supabase, tenantId, sourceId, extractedData.services);
          suggestionsCreated += sr.suggestions;
          conflictsCreated += sr.conflicts;
        }
        if (extractedData.items?.length > 0) {
          const mr = await processMenuItems(supabase, tenantId, sourceId, extractedData.items);
          suggestionsCreated += mr.suggestions;
          conflictsCreated += mr.conflicts;
        }
        break;

      case "general":
      default:
        // For general documents, extract any FAQs or policies found
        if (extractedData.faqs?.length > 0) {
          const fr = await processFAQs(supabase, tenantId, sourceId, extractedData.faqs);
          suggestionsCreated += fr.suggestions;
          conflictsCreated += fr.conflicts;
        }
        if (extractedData.policies) {
          await processPolicies(supabase, tenantId, sourceId, extractedData.policies);
          suggestionsCreated += 1;
        }
        break;
    }

    // Update status based on which table we're using
    if (useNewTable) {
      // Also insert into knowledge_merge_queue for new table workflow
      // (The old workflow uses extracted_knowledge_suggestions and knowledge_conflicts)
      for (const item of extractedData.items || []) {
        await supabase.from("knowledge_merge_queue").insert({
          tenant_id: tenantId,
          upload_id: sourceId,
          entity_type: "menu_item",
          entity_key: item.name,
          existing_value: null, // Will be filled by comparison logic
          proposed_value: item,
          conflict_type: "new_item",
          status: "pending",
        });
      }
      for (const service of extractedData.services || []) {
        await supabase.from("knowledge_merge_queue").insert({
          tenant_id: tenantId,
          upload_id: sourceId,
          entity_type: "service",
          entity_key: service.name,
          existing_value: null,
          proposed_value: service,
          conflict_type: "new_item",
          status: "pending",
        });
      }
      for (const faq of extractedData.faqs || []) {
        await supabase.from("knowledge_merge_queue").insert({
          tenant_id: tenantId,
          upload_id: sourceId,
          entity_type: "faq",
          entity_key: faq.question,
          existing_value: null,
          proposed_value: faq,
          conflict_type: "new_item",
          status: "pending",
        });
      }

      const hasItems = (extractedData.items?.length || 0) + 
                       (extractedData.services?.length || 0) + 
                       (extractedData.faqs?.length || 0) > 0;

      await supabase
        .from("knowledge_uploads")
        .update({ 
          status: hasItems ? "needs_review" : "parsed",
          parsed_json: extractedData,
          conflict_summary: {
            total_items: (extractedData.items?.length || 0) + (extractedData.services?.length || 0) + (extractedData.faqs?.length || 0),
            conflicts: conflictsCreated,
            suggestions: suggestionsCreated,
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", sourceId);
    } else {
      // Update old table format
      await supabase
        .from("knowledge_sources")
        .update({ 
          status: "ready",
          processed_at: new Date().toISOString()
        })
        .eq("id", sourceId);
    }

    console.log(`Processing complete: ${suggestionsCreated} suggestions, ${conflictsCreated} conflicts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestionsCreated, 
        conflictsCreated 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Processing error:", error);

    // Try to update the status - this is a best-effort attempt
    // We don't have access to the original request body easily in catch
    // so just log the error

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getExtractionTools(sourceType: string) {
  switch (sourceType) {
    case "menu_pdf":
      return [{
        type: "function",
        function: {
          name: "extract_menu_items",
          description: "Extract menu items from the document",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Item name" },
                    description: { type: "string", description: "Item description" },
                    price_cents: { type: "number", description: "Price in cents (e.g., 1299 for $12.99)" },
                    category: { type: "string", description: "Menu category (e.g., Appetizers, Entrees)" }
                  },
                  required: ["name", "price_cents"]
                }
              }
            },
            required: ["items"]
          }
        }
      }];

    case "services_doc":
      return [{
        type: "function",
        function: {
          name: "extract_services",
          description: "Extract services from the document",
          parameters: {
            type: "object",
            properties: {
              services: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Service name" },
                    description: { type: "string", description: "Service description" },
                    price_amount: { type: "number", description: "Price amount" },
                    price_type: { type: "string", enum: ["fixed", "starting_at", "quote_only"] },
                    duration_minutes: { type: "number", description: "Duration in minutes" }
                  },
                  required: ["name"]
                }
              }
            },
            required: ["services"]
          }
        }
      }];

    case "faq_doc":
      return [{
        type: "function",
        function: {
          name: "extract_faqs",
          description: "Extract FAQ items from the document",
          parameters: {
            type: "object",
            properties: {
              faqs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    answer: { type: "string" }
                  },
                  required: ["question", "answer"]
                }
              }
            },
            required: ["faqs"]
          }
        }
      }];

    case "pricing":
      return [{
        type: "function",
        function: {
          name: "extract_pricing",
          description: "Extract pricing information (services or menu items)",
          parameters: {
            type: "object",
            properties: {
              services: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    price_amount: { type: "number" },
                    price_type: { type: "string", enum: ["fixed", "starting_at", "quote_only"] },
                    duration_minutes: { type: "number" }
                  },
                  required: ["name"]
                }
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    price_cents: { type: "number" },
                    category: { type: "string" }
                  },
                  required: ["name", "price_cents"]
                }
              }
            }
          }
        }
      }];

    default:
      return [{
        type: "function",
        function: {
          name: "extract_general_knowledge",
          description: "Extract FAQs, policies, or other business information",
          parameters: {
            type: "object",
            properties: {
              faqs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    answer: { type: "string" }
                  },
                  required: ["question", "answer"]
                }
              },
              policies: {
                type: "object",
                properties: {
                  cancellation: { type: "string" },
                  refund: { type: "string" },
                  deposit: { type: "string" },
                  general: { type: "string" }
                }
              }
            }
          }
        }
      }];
  }
}

function getSystemPrompt(sourceType: string): string {
  const base = "You are a knowledge extraction assistant. Extract structured information from business documents accurately.";
  
  switch (sourceType) {
    case "menu_pdf":
      return `${base} You are extracting menu items from a restaurant/food business document. Extract item names, descriptions, prices (convert to cents - $12.99 becomes 1299), and categories.`;
    case "services_doc":
      return `${base} You are extracting service offerings from a business document. Extract service names, descriptions, prices, pricing type (fixed, starting_at, or quote_only), and duration in minutes if available.`;
    case "faq_doc":
      return `${base} You are extracting frequently asked questions from a business document. Extract the question and answer pairs.`;
    case "pricing":
      return `${base} You are extracting pricing information. This could be services (with duration) or menu items (with categories). Extract all pricing data found.`;
    default:
      return `${base} You are extracting general business information. Look for FAQs, policies (cancellation, refund, deposit), and any other structured knowledge.`;
  }
}

async function processMenuItems(
  supabase: any,
  tenantId: string,
  sourceId: string,
  items: MenuItem[]
): Promise<{ suggestions: number; conflicts: number }> {
  let suggestions = 0;
  let conflicts = 0;

  // Get existing menu items
  const { data: existingItems } = await supabase
    .from("menu_items")
    .select("id, name, description, price_cents, category")
    .eq("tenant_id", tenantId);

  for (const item of items) {
    const normalizedName = item.name.toLowerCase().trim();
    const existing = existingItems?.find((e: any) => 
      e.name.toLowerCase().trim() === normalizedName
    );

    if (existing) {
      // Check for conflicts
      const differingFields: string[] = [];
      if (item.price_cents && existing.price_cents !== item.price_cents) {
        differingFields.push("price_cents");
      }
      if (item.description && existing.description !== item.description) {
        differingFields.push("description");
      }
      if (item.category && existing.category !== item.category) {
        differingFields.push("category");
      }

      if (differingFields.length > 0) {
        await supabase.from("knowledge_conflicts").insert({
          tenant_id: tenantId,
          source_id: sourceId,
          entity_type: "menu_item",
          existing_entity_id: existing.id,
          existing_data: existing,
          proposed_data: item,
          differing_fields: differingFields,
          conflict_type: "field_mismatch"
        });
        conflicts++;
      }
    } else {
      // Create suggestion for new item
      await supabase.from("extracted_knowledge_suggestions").insert({
        tenant_id: tenantId,
        source_id: sourceId,
        suggestion_type: "menu_item",
        extracted_data: item,
        status: "pending_review"
      });
      suggestions++;
    }
  }

  return { suggestions, conflicts };
}

async function processServices(
  supabase: any,
  tenantId: string,
  sourceId: string,
  services: ServiceItem[]
): Promise<{ suggestions: number; conflicts: number }> {
  let suggestions = 0;
  let conflicts = 0;

  const { data: existingServices } = await supabase
    .from("services")
    .select("id, name, description, price_amount, price_type, duration_minutes")
    .eq("tenant_id", tenantId);

  for (const service of services) {
    const normalizedName = service.name.toLowerCase().trim();
    const existing = existingServices?.find((e: any) => 
      e.name.toLowerCase().trim() === normalizedName
    );

    if (existing) {
      const differingFields: string[] = [];
      if (service.price_amount && existing.price_amount !== service.price_amount) {
        differingFields.push("price_amount");
      }
      if (service.duration_minutes && existing.duration_minutes !== service.duration_minutes) {
        differingFields.push("duration_minutes");
      }
      if (service.description && existing.description !== service.description) {
        differingFields.push("description");
      }

      if (differingFields.length > 0) {
        await supabase.from("knowledge_conflicts").insert({
          tenant_id: tenantId,
          source_id: sourceId,
          entity_type: "service",
          existing_entity_id: existing.id,
          existing_data: existing,
          proposed_data: service,
          differing_fields: differingFields,
          conflict_type: "field_mismatch"
        });
        conflicts++;
      }
    } else {
      await supabase.from("extracted_knowledge_suggestions").insert({
        tenant_id: tenantId,
        source_id: sourceId,
        suggestion_type: "service",
        extracted_data: service,
        status: "pending_review"
      });
      suggestions++;
    }
  }

  return { suggestions, conflicts };
}

async function processFAQs(
  supabase: any,
  tenantId: string,
  sourceId: string,
  faqs: FAQItem[]
): Promise<{ suggestions: number; conflicts: number }> {
  let suggestions = 0;
  let conflicts = 0;

  const { data: existingFAQs } = await supabase
    .from("business_faqs")
    .select("id, question, answer")
    .eq("tenant_id", tenantId);

  for (const faq of faqs) {
    const normalizedQuestion = faq.question.toLowerCase().trim();
    
    // Find similar questions
    const existing = existingFAQs?.find((e: any) => {
      const existingNormalized = e.question.toLowerCase().trim();
      return similarity(existingNormalized, normalizedQuestion) > 0.8;
    });

    if (existing) {
      // Check if answer differs significantly
      if (similarity(existing.answer.toLowerCase(), faq.answer.toLowerCase()) < 0.8) {
        await supabase.from("knowledge_conflicts").insert({
          tenant_id: tenantId,
          source_id: sourceId,
          entity_type: "faq",
          existing_entity_id: existing.id,
          existing_data: existing,
          proposed_data: faq,
          differing_fields: ["answer"],
          conflict_type: "field_mismatch"
        });
        conflicts++;
      }
    } else {
      await supabase.from("extracted_knowledge_suggestions").insert({
        tenant_id: tenantId,
        source_id: sourceId,
        suggestion_type: "faq",
        extracted_data: faq,
        status: "pending_review"
      });
      suggestions++;
    }
  }

  return { suggestions, conflicts };
}

async function processPolicies(
  supabase: any,
  tenantId: string,
  sourceId: string,
  policies: PolicyData
): Promise<void> {
  // Get current tenant policies
  const { data: tenant } = await supabase
    .from("tenants")
    .select("cancellation_policy, refund_policy, deposit_policy")
    .eq("id", tenantId)
    .single();

  // Check for conflicts with existing policies
  const differingFields: string[] = [];
  const existingData: any = {};
  const proposedData: any = {};

  if (policies.cancellation && tenant?.cancellation_policy && 
      tenant.cancellation_policy !== policies.cancellation) {
    differingFields.push("cancellation_policy");
    existingData.cancellation_policy = tenant.cancellation_policy;
    proposedData.cancellation_policy = policies.cancellation;
  }

  if (policies.refund && tenant?.refund_policy && 
      tenant.refund_policy !== policies.refund) {
    differingFields.push("refund_policy");
    existingData.refund_policy = tenant.refund_policy;
    proposedData.refund_policy = policies.refund;
  }

  if (policies.deposit && tenant?.deposit_policy && 
      tenant.deposit_policy !== policies.deposit) {
    differingFields.push("deposit_policy");
    existingData.deposit_policy = tenant.deposit_policy;
    proposedData.deposit_policy = policies.deposit;
  }

  if (differingFields.length > 0) {
    await supabase.from("knowledge_conflicts").insert({
      tenant_id: tenantId,
      source_id: sourceId,
      entity_type: "policy",
      existing_data: existingData,
      proposed_data: proposedData,
      differing_fields: differingFields,
      conflict_type: "field_mismatch"
    });
  } else if (Object.keys(policies).some(k => policies[k as keyof PolicyData])) {
    // No conflicts, create suggestion for new policies
    await supabase.from("extracted_knowledge_suggestions").insert({
      tenant_id: tenantId,
      source_id: sourceId,
      suggestion_type: "policy",
      extracted_data: policies,
      status: "pending_review"
    });
  }
}
