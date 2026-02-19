import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";

const PLATFORM_PROMPTS: Record<string, string> = {
  linkedin: "Write a professional LinkedIn post for a B2B SaaS company. Focus on thought leadership, business value, and professional insights. Use a conversational but authoritative tone. Include a call-to-action. 150-250 words.",
  twitter: "Write a Twitter/X post for a tech startup. Keep it concise, engaging, and shareable. Use relevant hashtags. Maximum 280 characters. Be punchy and direct.",
  facebook: "Write a Facebook post for a business page. Be conversational, community-focused, and relatable. Ask a question or share a tip. 100-200 words.",
  instagram: "Write an Instagram caption for a business post. Be visual-focused and engaging. Include relevant emojis and hashtags. Great hook in the first line. 100-150 words.",
  tiktok: "Write a TikTok video script/caption for a business. Be trend-aware, hook-driven, and energetic. Include a strong opening hook. Keep it under 100 words.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Use a professional, authoritative tone. Focus on data, results, and business value.",
  casual: "Use a casual, friendly tone. Be approachable and relatable. Use some humor.",
  educational: "Use an educational, helpful tone. Teach something valuable. Position as an expert.",
};

const CONTENT_TOPICS = [
  "How AI phone receptionists save small businesses from missed calls",
  "Why 62% of callers won't leave a voicemail — and what to do about it",
  "The hidden cost of missed phone calls for service businesses",
  "How a plumbing company doubled bookings with AI phone answering",
  "5 signs your business needs an AI receptionist",
  "After-hours calls: revenue you're leaving on the table",
  "AI vs human receptionist: a cost comparison for small businesses",
  "Customer experience starts with the phone — is yours answering?",
  "The 24/7 advantage: why always-on phone answering wins more business",
  "From missed call to booked appointment in 60 seconds",
  "How towing companies capture emergency calls they used to miss",
  "The receptionist problem: why hiring is harder than automating",
  "Real results: AI phone answering ROI for dental practices",
  "Why your competitors are switching to AI receptionists",
  "The future of small business phone management is here",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!apiKey) return errorResponse("AI_GATEWAY_API_KEY not configured", 500);

    const body = await req.json();
    const platforms: string[] = body.platforms || ["linkedin", "twitter"];
    const postsPerWeek: number = body.posts_per_week || 5;
    const tone: string = body.tone || "professional";

    const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
    const now = new Date();
    const posts: any[] = [];

    // Distribute posts across the week
    const postsPerPlatform = Math.max(1, Math.ceil(postsPerWeek / platforms.length));

    for (const platform of platforms) {
      const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.linkedin;

      for (let i = 0; i < postsPerPlatform; i++) {
        const topic = CONTENT_TOPICS[(posts.length + i) % CONTENT_TOPICS.length];

        // Schedule: distribute across the week at good posting times
        const dayOffset = Math.floor((posts.length * 7) / (postsPerWeek * platforms.length));
        const scheduledDate = new Date(now);
        scheduledDate.setDate(scheduledDate.getDate() + dayOffset + 1);
        scheduledDate.setHours(platform === "linkedin" ? 9 : platform === "twitter" ? 12 : 10, 0, 0, 0);

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are a social media content creator for CloseLoop, an AI phone receptionist SaaS for small businesses. CloseLoop answers calls 24/7, books appointments, captures leads, and handles customer inquiries using AI. ${toneInstruction}`,
                },
                {
                  role: "user",
                  content: `${platformPrompt}\n\nTopic: ${topic}\n\nReturn ONLY a JSON object with these fields:\n{"content": "the post text", "hashtags": ["#tag1", "#tag2"]}`,
                },
              ],
              temperature: 0.8,
              max_tokens: 500,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const raw = data.choices?.[0]?.message?.content || "";
            try {
              const jsonMatch = raw.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                posts.push({
                  platform,
                  content: parsed.content || raw,
                  hashtags: parsed.hashtags || [],
                  scheduled_for: scheduledDate.toISOString(),
                  status: "scheduled",
                });
              }
            } catch {
              posts.push({
                platform,
                content: raw.replace(/```json|```/g, "").trim(),
                hashtags: [],
                scheduled_for: scheduledDate.toISOString(),
                status: "scheduled",
              });
            }
          }
        } catch (err) {
          console.error(`[social-batch] Error generating ${platform} post:`, err);
        }
      }
    }

    // Save all posts
    if (posts.length > 0) {
      const { error: insertErr } = await supabase
        .from("admin_social_posts")
        .insert(posts);

      if (insertErr) {
        console.error("[social-batch] Insert error:", insertErr);
        return errorResponse(insertErr.message, 500);
      }
    }

    // Log activity
    await supabase.from("admin_growth_activity_log").insert({
      activity_type: "social_posted",
      title: `Generated ${posts.length} social posts`,
      description: `Platforms: ${platforms.join(", ")}`,
      metadata: { count: posts.length, platforms, tone },
    });

    return jsonResponse({ success: true, count: posts.length });
  } catch (error) {
    console.error("[social-batch] Error:", error);
    return errorResponse(String(error), 500);
  }
});
