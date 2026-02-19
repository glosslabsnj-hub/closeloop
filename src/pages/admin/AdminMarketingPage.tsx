import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Send, Loader2, Sparkles, TrendingUp, Share2, Target,
  Megaphone, BarChart3, Lightbulb, Rocket, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-marketing-chat`;

const QUICK_PROMPTS = [
  { icon: Share2, label: "Social Media Plan", prompt: "Create a complete 30-day social media content calendar for CloseLoop. Include exact post copy, hashtags, best times to post, and which platforms to prioritize. Focus on attracting small business owners." },
  { icon: Target, label: "Find My First 100 Customers", prompt: "Give me an extremely detailed, step-by-step playbook to acquire the first 100 paying customers for CloseLoop. Include paid, organic, and partnership strategies with specific budgets and timelines." },
  { icon: Megaphone, label: "Paid Ads Strategy", prompt: "Design a complete Google Ads + Meta Ads campaign strategy for CloseLoop. Include targeting, ad copy variations, landing page recommendations, budget allocation, and expected CPA. Target: local service businesses." },
  { icon: TrendingUp, label: "Agency Recruitment", prompt: "Create a comprehensive agency recruitment strategy. How do I find, approach, and onboard marketing agencies who will resell CloseLoop to their clients? Include email templates, pitch decks outline, and commission structures." },
  { icon: Lightbulb, label: "Viral Content Ideas", prompt: "Give me 20 viral content ideas for CloseLoop that could work on TikTok, Instagram Reels, and LinkedIn. Include hooks, scripts, and production notes. Focus on showing the AI receptionist in action vs. missed calls." },
  { icon: Rocket, label: "Launch Playbook", prompt: "Create a complete product launch playbook for CloseLoop entering a new market/city. Include pre-launch, launch day, and post-launch activities with exact timelines and action items." },
  { icon: BarChart3, label: "KPI Dashboard Plan", prompt: "What marketing KPIs should I track for CloseLoop? Design a marketing dashboard with the exact metrics, benchmarks, and tools I need. Include funnel metrics from awareness to paid customer." },
  { icon: MessageSquare, label: "Email Sequences", prompt: "Write complete email sequences for: 1) Cold outreach to business owners, 2) Nurture sequence after free trial signup, 3) Win-back sequence for churned customers. Include subject lines, body copy, and send timing." },
];

async function streamChat({
  messages,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  onDelta: (delta: string) => void;
  onDone: () => void;
}) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) throw new Error("Rate limited. Please try again shortly.");
    if (resp.status === 402) throw new Error("AI credits depleted.");
    throw new Error("Failed to start stream");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Flush remaining
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

export default function AdminMarketingPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
      });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Chat failed");
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    send(prompt);
  };

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Marketing Command Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Your AI-powered CMO. Get specific, actionable marketing strategies for CloseLoop.
        </p>
      </div>

      {messages.length === 0 ? (
        /* Empty State - Quick Prompts */
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">What do you want to work on?</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Ask me anything about marketing, growth, social media, ads, partnerships, or scaling CloseLoop.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl w-full">
            {QUICK_PROMPTS.map((qp) => (
              <Card
                key={qp.label}
                className="cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                onClick={() => handleQuickPrompt(qp.prompt)}
              >
                <CardContent className="p-3 flex items-start gap-2">
                  <qp.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{qp.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Chat Messages */
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Ask about marketing strategy, social media, ads, partnerships..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={() => send(input)} disabled={isLoading || !input.trim()} size="icon">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
