import { useState } from "react";
import { useConversations, useMessages } from "@/hooks/useConversations";
import { SectionCard } from "@/components/layout/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, ArrowRight, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConversationsTab() {
  const { conversations, isLoading } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const leadName = c.lead?.full_name?.toLowerCase() || "";
    const leadPhone = c.lead?.phone || "";
    return leadName.includes(q) || leadPhone.includes(q);
  });

  const selected = conversations.find((c) => c.id === selectedId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return (
      <SectionCard>
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No conversations yet.</p>
          <p className="text-xs mt-1">Conversations appear here when customers call or message your business.</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Conversation list */}
      <div className="w-80 flex-shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="space-y-1 max-h-[500px] overflow-auto">
          {filtered.map((convo) => {
            const isActive = selectedId === convo.id;
            const name = convo.lead?.full_name || "Unknown";
            const phone = convo.lead?.phone || "";
            const lastMsg = convo.lastMessage;
            const time = lastMsg?.sent_at
              ? new Date(lastMsg.sent_at).toLocaleDateString()
              : convo.created_at
              ? new Date(convo.created_at).toLocaleDateString()
              : "";

            return (
              <button
                key={convo.id}
                onClick={() => setSelectedId(convo.id)}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg border transition-colors",
                  isActive
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card/60 border-border/30 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{name}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{time}</span>
                </div>
                {phone && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-2.5 w-2.5" />
                    {phone}
                  </span>
                )}
                {lastMsg && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {lastMsg.direction === "outbound" ? "You: " : ""}
                    {lastMsg.body}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <ConversationThread conversationId={selected.id} />
        ) : (
          <SectionCard>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <ArrowRight className="h-6 w-6 mx-auto mb-2 opacity-40 rotate-180" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function ConversationThread({ conversationId }: { conversationId: string }) {
  const { messages, isLoading, sendMessage } = useMessages(conversationId);
  const [draft, setDraft] = useState("");

  function handleSend() {
    if (!draft.trim()) return;
    sendMessage.mutate({ body: draft.trim() });
    setDraft("");
  }

  return (
    <SectionCard noPadding>
      <div className="flex flex-col h-[450px]">
        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No messages in this conversation.</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2",
                  msg.direction === "outbound"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                <div className={cn(
                  "flex items-center gap-1.5 mt-1 text-[10px]",
                  msg.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  <span>{msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString() : ""}</span>
                  {msg.status && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                      {msg.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Compose */}
        <div className="border-t border-border/30 p-3 flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="text-sm"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!draft.trim() || sendMessage.isPending}
          >
            Send
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
