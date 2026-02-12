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
  fileUrl?: string;
  rawText?: string;
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

interface HoursItem {
  day: string;
  open: string;
  close: string;
  closed?: boolean;
}

interface ClassificationResult {
  document_type: string;
  confidence: number;
  reasoning?: string;
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
    let autoDetect = body.autoDetect ?? true; // Default to auto-detect

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
      fileUrl = body.fileUrl || "";
      sourceType = body.sourceType || "auto"; // Default to auto

      // Allow rawText as alternative to fileUrl
      const rawText = body.rawText;

      if (!sourceId || !tenantId) {
        throw new Error("Missing required fields: sourceId, tenantId");
      }

      if (!fileUrl && !rawText) {
        throw new Error("Missing required field: fileUrl or rawText");
      }

      // Update status to processing
      await supabase
        .from("knowledge_sources")
        .update({ status: "processing" })
        .eq("id", sourceId);
    }

    console.log(`Processing upload: ${sourceId}, type: ${sourceType}, autoDetect: ${autoDetect}, new table: ${useNewTable}`);

    let fileContent: string;
    let isImage = false;

    // Check if we have rawText (pasted content) or need to fetch file
    const rawText = body.rawText;
    
    if (rawText) {
      // Direct text input - no file fetch needed
      fileContent = rawText;
      console.log(`Processing pasted text: ${rawText.length} characters`);
    } else if (fileUrl) {
      // Fetch the file from storage
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
      }

      const contentType = fileResponse.headers.get("content-type") || "";

      // Determine file type and extract content
      if (contentType.includes("image") || ["png", "jpg", "jpeg"].some(ext => fileUrl.toLowerCase().includes(`.${ext}`))) {
        // For images, we'll send as base64 to the AI for OCR
        isImage = true;
        const buffer = await fileResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        fileContent = `data:${contentType || "image/png"};base64,${base64}`;
      } else {
        // For text-based files (PDF text layer, DOCX, etc.)
        fileContent = await fileResponse.text();
      }
    } else {
      throw new Error("No content provided - need either rawText or fileUrl");
    }

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Step 1: Auto-classify the document if sourceType is "auto" or "general"
    let detectedType = sourceType;
    let classificationConfidence = 1.0;
    let classificationReasoning = "";

    if (autoDetect && (sourceType === "auto" || sourceType === "general")) {
      console.log("Auto-detecting document type...");
      const classification = await classifyDocument(lovableApiKey, fileContent, isImage);
      detectedType = mapClassificationToSourceType(classification.document_type);
      classificationConfidence = classification.confidence;
      classificationReasoning = classification.reasoning || "";
      console.log(`Detected type: ${detectedType} (confidence: ${classificationConfidence})`);

      // Update the source record with detected type
      if (useNewTable) {
        await supabase
          .from("knowledge_uploads")
          .update({ 
            file_type: detectedType,
            updated_at: new Date().toISOString()
          })
          .eq("id", sourceId);
      } else {
        await supabase
          .from("knowledge_sources")
          .update({ source_type: detectedType })
          .eq("id", sourceId);
      }
    }

    // Step 2: Extract based on detected/provided type
    const extractionTools = getExtractionTools(detectedType);
    const systemPrompt = getSystemPrompt(detectedType);

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
    let matchedItems = 0;

    switch (detectedType) {
      case "menu_pdf":
        const menuResult = await processMenuItems(supabase, tenantId, sourceId, extractedData.items || []);
        suggestionsCreated = menuResult.suggestions;
        conflictsCreated = menuResult.conflicts;
        matchedItems = menuResult.matched;
        break;

      case "services_doc":
        const servicesResult = await processServices(supabase, tenantId, sourceId, extractedData.services || []);
        suggestionsCreated = servicesResult.suggestions;
        conflictsCreated = servicesResult.conflicts;
        matchedItems = servicesResult.matched;
        break;

      case "faq_doc":
        const faqResult = await processFAQs(supabase, tenantId, sourceId, extractedData.faqs || []);
        suggestionsCreated = faqResult.suggestions;
        conflictsCreated = faqResult.conflicts;
        matchedItems = faqResult.matched;
        break;

      case "hours":
        const hoursResult = await processHours(supabase, tenantId, sourceId, extractedData.hours || []);
        suggestionsCreated = hoursResult.suggestions;
        conflictsCreated = hoursResult.conflicts;
        break;

      case "pricing":
        // Pricing can contain both services and menu items
        if (extractedData.services?.length > 0) {
          const sr = await processServices(supabase, tenantId, sourceId, extractedData.services);
          suggestionsCreated += sr.suggestions;
          conflictsCreated += sr.conflicts;
          matchedItems += sr.matched;
        }
        if (extractedData.items?.length > 0) {
          const mr = await processMenuItems(supabase, tenantId, sourceId, extractedData.items);
          suggestionsCreated += mr.suggestions;
          conflictsCreated += mr.conflicts;
          matchedItems += mr.matched;
        }
        break;

      case "policies":
        if (extractedData.policies) {
          await processPolicies(supabase, tenantId, sourceId, extractedData.policies);
          suggestionsCreated += 1;
        }
        break;

      case "general":
      default:
        // For general documents, extract any FAQs or policies found
        if (extractedData.faqs?.length > 0) {
          const fr = await processFAQs(supabase, tenantId, sourceId, extractedData.faqs);
          suggestionsCreated += fr.suggestions;
          conflictsCreated += fr.conflicts;
          matchedItems += fr.matched;
        }
        if (extractedData.policies) {
          await processPolicies(supabase, tenantId, sourceId, extractedData.policies);
          suggestionsCreated += 1;
        }
        if (extractedData.hours?.length > 0) {
          const hr = await processHours(supabase, tenantId, sourceId, extractedData.hours);
          suggestionsCreated += hr.suggestions;
          conflictsCreated += hr.conflicts;
        }
        break;
    }

    // Build extraction summary
    const extractionSummary = {
      detected_type: detectedType,
      confidence: classificationConfidence,
      reasoning: classificationReasoning,
      total_items: (extractedData.items?.length || 0) + 
                   (extractedData.services?.length || 0) + 
                   (extractedData.faqs?.length || 0) +
                   (extractedData.hours?.length || 0),
      new_items: suggestionsCreated,
      conflicts: conflictsCreated,
      matched: matchedItems,
    };

    // Update status based on which table we're using
    if (useNewTable) {
      // Also insert into knowledge_merge_queue for new table workflow
      for (const item of extractedData.items || []) {
        await supabase.from("knowledge_merge_queue").insert({
          tenant_id: tenantId,
          upload_id: sourceId,
          entity_type: "menu_item",
          entity_key: item.name,
          existing_value: null,
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

      const hasItems = extractionSummary.total_items > 0;

      await supabase
        .from("knowledge_uploads")
        .update({ 
          status: hasItems ? "needs_review" : "parsed",
          parsed_json: extractedData,
          conflict_summary: extractionSummary,
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

    console.log(`Processing complete: ${suggestionsCreated} suggestions, ${conflictsCreated} conflicts, ${matchedItems} matched`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...extractionSummary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Processing error:", error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Auto-classify document type
async function classifyDocument(apiKey: string, content: string, isImage: boolean): Promise<ClassificationResult> {
  const classifyTool = {
    type: "function",
    function: {
      name: "classify_document",
      description: "Classify what type of business document this is",
      parameters: {
        type: "object",
        properties: {
          document_type: {
            type: "string",
            enum: ["menu", "services", "pricing", "hours", "policies", "faq", "general"],
            description: "The type of business document"
          },
          confidence: { 
            type: "number", 
            description: "Confidence score from 0 to 1" 
          },
          reasoning: { 
            type: "string", 
            description: "Brief explanation for the classification" 
          }
        },
        required: ["document_type", "confidence"]
      }
    }
  };

  const systemPrompt = `You are a business document classifier. Analyze the content and determine what type of business document it is.

Categories:
- "menu" - Restaurant/food menus with dishes and prices
- "services" - Service catalogs for salons, contractors, etc. with duration times
- "pricing" - General price lists (could be services or products)
- "hours" - Operating hours signs or schedules showing days and times
- "policies" - Cancellation, refund, deposit policies
- "faq" - FAQ documents or info sheets with Q&A format
- "general" - Other business documents that don't fit above categories

Look for visual cues:
- Menu: Food items, categories like Appetizers/Entrees, $X.XX prices
- Services: Duration times, service names like "Haircut", "Plumbing Repair"  
- Hours: Days of week (Mon-Sun), open/close times
- Policies: Words like "cancellation", "refund", "deposit", terms & conditions

Be confident in your classification.`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
  ];

  if (isImage) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: "What type of business document is this?" },
        { type: "image_url", image_url: { url: content } }
      ]
    });
  } else {
    messages.push({
      role: "user",
      content: `What type of business document is this?\n\n${content.substring(0, 10000)}`
    });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools: [classifyTool],
      tool_choice: { type: "function", function: { name: "classify_document" } },
    }),
  });

  if (!response.ok) {
    console.error("Classification API error:", response.status);
    // Default to general on classification failure
    return { document_type: "general", confidence: 0.5 };
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall) {
    return { document_type: "general", confidence: 0.5 };
  }

  return JSON.parse(toolCall.function.arguments);
}

function mapClassificationToSourceType(docType: string): string {
  const mapping: Record<string, string> = {
    "menu": "menu_pdf",
    "services": "services_doc",
    "pricing": "pricing",
    "hours": "hours",
    "policies": "policies",
    "faq": "faq_doc",
    "general": "general"
  };
  return mapping[docType] || "general";
}

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

    case "hours":
      return [{
        type: "function",
        function: {
          name: "extract_hours",
          description: "Extract business operating hours from the document",
          parameters: {
            type: "object",
            properties: {
              hours: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    day: { 
                      type: "string", 
                      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                      description: "Day of the week" 
                    },
                    open: { type: "string", description: "Opening time in HH:MM format (24-hour)" },
                    close: { type: "string", description: "Closing time in HH:MM format (24-hour)" },
                    closed: { type: "boolean", description: "True if closed on this day" }
                  },
                  required: ["day"]
                }
              }
            },
            required: ["hours"]
          }
        }
      }];

    case "policies":
      return [{
        type: "function",
        function: {
          name: "extract_policies",
          description: "Extract business policies from the document",
          parameters: {
            type: "object",
            properties: {
              policies: {
                type: "object",
                properties: {
                  cancellation: { type: "string", description: "Cancellation policy text" },
                  refund: { type: "string", description: "Refund policy text" },
                  deposit: { type: "string", description: "Deposit requirements" },
                  general: { type: "string", description: "Other general policies" }
                }
              }
            },
            required: ["policies"]
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
          description: "Extract FAQs, policies, hours, or other business information",
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
              },
              hours: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    day: { type: "string" },
                    open: { type: "string" },
                    close: { type: "string" },
                    closed: { type: "boolean" }
                  }
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
      return `${base} You are extracting service offerings from a business document. Extract service names, descriptions, prices, pricing type (fixed, starting_at, or quote_only), and duration in minutes if available.

IMPORTANT: Pay close attention to price qualifiers. If a price is described with words like "starting at", "from", "starts at", "and up", "+", "varies", "prices may vary", or similar language indicating the price is not fixed, set price_type to "starting_at". Only use "fixed" when the price is clearly exact and final. If no price is listed or it says "call for quote" / "varies by project", use "quote_only".`;
    case "faq_doc":
      return `${base} You are extracting frequently asked questions from a business document. Extract the question and answer pairs.`;
    case "hours":
      return `${base} You are extracting business operating hours. Extract the day of week, opening time, and closing time. Use 24-hour format (e.g., 09:00, 17:00). Mark days as closed if applicable.`;
    case "policies":
      return `${base} You are extracting business policies. Look for cancellation policies, refund policies, deposit requirements, and other terms.`;
    case "pricing":
      return `${base} You are extracting pricing information. This could be services (with duration) or menu items (with categories). Extract all pricing data found. Pay close attention to price qualifiers like "starting at", "from", "and up", "+", or "varies" — these indicate price_type should be "starting_at", not "fixed".`;
    default:
      return `${base} You are extracting general business information. Look for FAQs, policies (cancellation, refund, deposit), operating hours, and any other structured knowledge.`;
  }
}

async function processMenuItems(
  supabase: any,
  tenantId: string,
  sourceId: string,
  items: MenuItem[]
): Promise<{ suggestions: number; conflicts: number; matched: number }> {
  let suggestions = 0;
  let conflicts = 0;
  let matched = 0;

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
      } else {
        matched++;
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

  return { suggestions, conflicts, matched };
}

async function processServices(
  supabase: any,
  tenantId: string,
  sourceId: string,
  services: ServiceItem[]
): Promise<{ suggestions: number; conflicts: number; matched: number }> {
  let suggestions = 0;
  let conflicts = 0;
  let matched = 0;

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
      } else {
        matched++;
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

  return { suggestions, conflicts, matched };
}

async function processFAQs(
  supabase: any,
  tenantId: string,
  sourceId: string,
  faqs: FAQItem[]
): Promise<{ suggestions: number; conflicts: number; matched: number }> {
  let suggestions = 0;
  let conflicts = 0;
  let matched = 0;

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
      } else {
        matched++;
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

  return { suggestions, conflicts, matched };
}

async function processHours(
  supabase: any,
  tenantId: string,
  sourceId: string,
  hours: HoursItem[]
): Promise<{ suggestions: number; conflicts: number }> {
  let suggestions = 0;
  let conflicts = 0;

  // Get existing availability slots
  const { data: existingSlots } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("tenant_id", tenantId);

  const dayToNumber: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  for (const hour of hours) {
    const dayNum = dayToNumber[hour.day.toLowerCase()];
    if (dayNum === undefined) continue;

    const existing = existingSlots?.find((e: any) => e.day_of_week === dayNum);

    if (existing) {
      // Check for conflicts
      const differingFields: string[] = [];
      const proposedOpen = hour.open || (hour.closed ? null : undefined);
      const proposedClose = hour.close || (hour.closed ? null : undefined);
      
      if (proposedOpen && existing.start_time !== proposedOpen) {
        differingFields.push("start_time");
      }
      if (proposedClose && existing.end_time !== proposedClose) {
        differingFields.push("end_time");
      }
      if (hour.closed !== undefined && existing.is_available === hour.closed) {
        differingFields.push("is_available");
      }

      if (differingFields.length > 0) {
        await supabase.from("knowledge_conflicts").insert({
          tenant_id: tenantId,
          source_id: sourceId,
          entity_type: "hours",
          existing_entity_id: existing.id,
          existing_data: {
            day: hour.day,
            start_time: existing.start_time,
            end_time: existing.end_time,
            is_available: existing.is_available
          },
          proposed_data: {
            day: hour.day,
            start_time: hour.open,
            end_time: hour.close,
            is_available: !hour.closed
          },
          differing_fields: differingFields,
          conflict_type: "field_mismatch"
        });
        conflicts++;
      }
    } else {
      // Create suggestion for new hours
      await supabase.from("extracted_knowledge_suggestions").insert({
        tenant_id: tenantId,
        source_id: sourceId,
        suggestion_type: "hours" as any,
        extracted_data: {
          day_of_week: dayNum,
          day_name: hour.day,
          start_time: hour.open,
          end_time: hour.close,
          is_available: !hour.closed
        },
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
