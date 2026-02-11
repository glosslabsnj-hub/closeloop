/**
 * BrainAssistantPanel — Slide-in chat panel for the Brain Assistant.
 *
 * Uses the Sheet component for the slide-in panel, with a chat message list
 * and input at the bottom.
 */

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, Loader2, Bot, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useBrainAssistant, type ChatMessage } from "@/hooks/useBrainAssistant";
import { BrainActionCard } from "./BrainActionCard";

interface BrainAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrainAssistantPanel({ open, onOpenChange }: BrainAssistantPanelProps) {
  const {
    messages,
    isLoading,
    sendMessage,
    applyAction,
    skipAction,
    startGapAnalysis,
    clearConversation,
    usage,
  } = useBrainAssistant();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasStarted = useRef(false);

  // Auto-start gap analysis on first open
  useEffect(() => {
    if (open && messages.length === 0 && !hasStarted.current && !isLoading) {
      hasStarted.current = true;
      startGapAnalysis();
    }
  }, [open, messages.length, isLoading, startGapAnalysis]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearConversation();
    hasStarted.current = false;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">Brain Assistant</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {usage ? `${usage.messages_today}/${usage.limit} messages today` : "AI-powered setup help"}
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={handleClear}
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef as any}>
          <div className="py-4 space-y-4">
            {messages.length === 0 && !isLoading && (
              <EmptyState onStart={startGapAnalysis} />
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onApply={applyAction}
                onSkip={skipAction}
              />
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-lg rounded-tl-none px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t px-4 py-3 shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your setup..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Press Enter to send. Shift+Enter for new line.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-sm">Brain Assistant</h3>
        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
          I'll help you set up your AI phone assistant's knowledge base. I know your industry and can suggest what to configure.
        </p>
      </div>
      <div className="space-y-2">
        <Button onClick={onStart} size="sm" className="w-full max-w-[200px]">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Analyze My Setup
        </Button>
        <div className="text-[10px] text-muted-foreground">
          Or type any question about your configuration
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onApply,
  onSkip,
}: {
  message: ChatMessage;
  onApply: (id: string) => Promise<void>;
  onSkip: (id: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
        isUser ? "bg-foreground/10" : "bg-primary/10"
      )}>
        {isUser ? (
          <User className="h-3.5 w-3.5 text-foreground/70" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
      <div className={cn(
        "max-w-[85%] space-y-2",
        isUser && "items-end"
      )}>
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-muted rounded-tl-none"
        )}>
          {message.content}
        </div>

        {/* Action cards */}
        {message.actions && message.actions.length > 0 && (
          <div className="space-y-2 mt-2">
            {message.actions.map((action) => (
              <BrainActionCard
                key={action.id}
                action={action}
                onApply={onApply}
                onSkip={onSkip}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
