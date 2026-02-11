/**
 * BrainBuilderChat - Main chat interface for the AI Brain Builder.
 */

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useBrainBuilder } from "./useBrainBuilder";
import { TOPIC_LABELS, type BrainBuilderTopic } from "./types";

export function BrainBuilderChat() {
  const {
    messages,
    currentTopic,
    completedTopics,
    isLoading,
    isAllComplete,
    sendMessage,
    startConversation,
    topicOrder,
  } = useBrainBuilder();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Start conversation on mount
  useEffect(() => {
    startConversation();
  }, [startConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Topic progress bar */}
      <div className="flex items-center gap-1 px-4 py-3 border-b bg-muted/30">
        {topicOrder.map((topic) => {
          const isCompleted = completedTopics.includes(topic);
          const isCurrent = topic === currentTopic && !isAllComplete;
          return (
            <TopicPill
              key={topic}
              topic={topic}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
            />
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2.5 max-w-[85%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "assistant" ? "bg-primary/10" : "bg-muted"
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-3.5 w-3.5 text-primary" />
              ) : (
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "assistant"
                  ? "bg-muted/50 text-foreground"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full flex items-center justify-center bg-primary/10 shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="rounded-2xl px-3.5 py-2.5 bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {isAllComplete && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Setup complete! Your AI receptionist is ready.</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isAllComplete && (
        <div className="border-t p-3">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl text-sm"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="h-[44px] w-[44px] rounded-xl shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopicPill({
  topic,
  isCompleted,
  isCurrent,
}: {
  topic: BrainBuilderTopic;
  isCompleted: boolean;
  isCurrent: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors",
        isCompleted && "bg-primary/15 text-primary",
        isCurrent && !isCompleted && "bg-accent text-accent-foreground ring-1 ring-primary/30",
        !isCompleted && !isCurrent && "bg-muted/50 text-muted-foreground/60"
      )}
    >
      {isCompleted && <CheckCircle2 className="h-2.5 w-2.5" />}
      <span className="hidden sm:inline">{TOPIC_LABELS[topic]}</span>
    </div>
  );
}
