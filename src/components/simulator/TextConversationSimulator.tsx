import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, Loader2, Brain, RefreshCw, Bug, CalendarCheck, Wrench } from "lucide-react";

interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  debug?: Record<string, string>;
  toolCalls?: ToolCall[];
  bookingCreated?: boolean;
  bookingId?: string | null;
}

export default function TextConversationSimulator() {
  const { effectiveTenantId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !effectiveTenantId) return;

    const userMsg: Message = { role: "user", content: input, timestamp: new Date() };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("text-conversation", {
        body: {
          tenantId: effectiveTenantId,
          message: input,
          history,
        },
      });

      if (error) throw error;

      const aiMsg: Message = {
        role: "assistant",
        content: data.reply || "(no response)",
        timestamp: new Date(),
        debug: data.debug,
        toolCalls: data.toolCalls || [],
        bookingCreated: data.bookingCreated || false,
        bookingId: data.bookingId || null,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setMessages([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Text Conversation Test
          <Badge variant="secondary" className="gap-1">
            <Brain className="h-3 w-3" />
            Real Agent Brain
          </Badge>
        </CardTitle>
        <CardDescription>
          Same system prompt + business data as real calls. Tests AI behavior without voice. Used by QA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat log */}
        <div className="border rounded-lg p-3 h-72 overflow-y-auto space-y-3 bg-muted/20">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center pt-8">
              Start typing to test the AI. Say "debug" to see context variables.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] p-3 rounded-lg space-y-1 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"
              }`}>
                <p className="text-sm">{msg.content}</p>
                {msg.bookingCreated && msg.role === "assistant" && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge variant="default" className="text-[10px] gap-1 bg-green-600">
                      <CalendarCheck className="h-2.5 w-2.5" />
                      Booking Created
                    </Badge>
                    {msg.bookingId && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {msg.bookingId.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                )}
                {showDebug && msg.toolCalls && msg.toolCalls.length > 0 && msg.role === "assistant" && (
                  <div className="mt-2 pt-2 border-t space-y-1.5">
                    {msg.toolCalls.map((tc, j) => (
                      <div key={j} className="text-[10px] font-mono text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Wrench className="h-2.5 w-2.5" />
                          <span className="font-semibold">{tc.tool}</span>
                        </div>
                        <div className="ml-3.5 opacity-70">
                          in: {JSON.stringify(tc.input).slice(0, 120)}
                        </div>
                        <div className="ml-3.5 opacity-70">
                          out: {JSON.stringify(tc.result).slice(0, 120)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showDebug && msg.debug && msg.role === "assistant" && (
                  <div className="mt-2 pt-2 border-t text-[10px] font-mono text-muted-foreground space-y-0.5">
                    {Object.entries(msg.debug).map(([k, v]) => (
                      <div key={k}><span className="opacity-60">{k}:</span> {v}</div>
                    ))}
                  </div>
                )}
                <p className="text-xs opacity-50">{msg.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message as a caller... (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            rows={2}
            className="flex-1"
            disabled={loading}
          />
          <Button onClick={sendMessage} size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1">
            <RefreshCw className="h-3 w-3" />
            New conversation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className={`gap-1 ${showDebug ? "bg-muted" : ""}`}
          >
            <Bug className="h-3 w-3" />
            {showDebug ? "Hide debug" : "Show debug"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
