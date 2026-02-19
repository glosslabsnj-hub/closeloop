import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, Bookmark, RotateCcw, Bot, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketingChat, useSaveMarketingContent, type ChatMessage } from "@/hooks/useMarketingChat";
import { toast } from "sonner";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isStreaming, sendMessage, clearChat } = useMarketingChat(userId);
  const saveContent = useSaveMarketingContent(userId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed, category);
  };

  const handleSaveResponse = (msg: ChatMessage) => {
    const title = msg.content.substring(0, 80).replace(/[#*\n]/g, "").trim() + "...";
    saveContent.mutate({
      category: msg.category || category,
      title,
      content: msg.content,
    });
  };

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
            <h3 className="text-lg font-medium mb-2">Marketing AI Assistant</h3>
            <p className="text-sm max-w-md mx-auto">
              Ask me anything about marketing CloseLoop — content ideas, ad campaigns,
              social media strategies, partner outreach, and more.
            </p>
            <p className="text-xs mt-3 text-muted-foreground/60">
              Select a category above to get specialized help, or use "General" for anything.
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
              className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === "assistant" && (
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

        {isStreaming && (
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
