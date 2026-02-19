import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, Bookmark, RotateCcw, Bot, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSaveMarketingContent, type ChatMessage } from "@/hooks/useMarketingChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "content", label: "Content Ideas" },
  { value: "ads", label: "Ad Campaigns" },
  { value: "social", label: "Social Calendar" },
  { value: "scaling", label: "Scaling" },
  { value: "outreach", label: "Partner Outreach" },
];

export function MarketingChatPanel() {
  const { user } = useAuth();
  const userId = user?.id;
  const [category, setCategory] = useState("general");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveContent = useSaveMarketingContent(userId);

  // Listen for template events from parent
  useEffect(() => {
    const handler = (e: CustomEvent<{ prompt: string; category: string }>) => {
      setCategory(e.detail.category);
      handleSendDirect(e.detail.prompt, e.detail.category);
    };
    window.addEventListener("marketing-template" as any, handler);
    return () => window.removeEventListener("marketing-template" as any, handler);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendDirect = async (content: string, cat: string) => {
    if (!userId || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content, category: cat };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-marketing-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${resp.status}`);
      }

      // Handle SSE streaming
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "", category: cat }]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                  category: cat,
                };
                return updated;
              });
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      // If no streaming content was captured, show fallback
      if (!assistantContent) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "I apologize, I couldn't generate a response. Please try again.",
            category: cat,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error("Marketing chat error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to get AI response");
      // Remove the empty assistant message if there was an error
      setMessages((prev) => prev.filter((m) => m.content !== ""));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    handleSendDirect(trimmed, category);
  };

  const handleSaveResponse = (msg: ChatMessage) => {
    const title = msg.content.substring(0, 80).replace(/[#*\n]/g, "").trim() + "...";
    saveContent.mutate({
      category: msg.category || category,
      title,
      content: msg.content,
    });
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Category tabs */}
      <div className="flex items-center justify-between mb-3">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="h-8">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="text-xs px-3 h-6">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> New Chat
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Marketing AI Strategist</h3>
            <p className="text-sm max-w-md mx-auto">
              Your AI CMO for CloseLoop. Ask me anything about marketing, content, ads,
              social media, partnerships, or scaling — I'll give you exact, actionable strategies.
            </p>
            <p className="text-xs mt-3 text-muted-foreground/60">
              Try a template from the Templates tab for comprehensive, ready-to-execute strategies.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
              {msg.role === "assistant" && msg.content && (
                <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => handleSaveResponse(msg)}
                    disabled={saveContent.isPending}
                  >
                    <Bookmark className="h-3 w-3 mr-1" /> Save to Library
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      toast.success("Copied to clipboard");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-1">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="mt-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${CATEGORIES.find((c) => c.value === category)?.label.toLowerCase() || "marketing"}...`}
          className="min-h-[48px] max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="shrink-0 h-12 w-12"
        >
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
