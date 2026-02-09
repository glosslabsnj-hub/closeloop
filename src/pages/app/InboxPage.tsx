import { useState } from "react";
import { useConversations, useMessages, ConversationWithDetails } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Phone,
  Send,
  Calendar,
  DollarSign,
  MoreVertical,
  Search,
  Bot,
  ArrowLeft,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

/** Derive initials from a full name */
function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Treat a conversation as "unread" if the last message is inbound */
function isUnread(convo: ConversationWithDetails): boolean {
  return convo.lastMessage?.direction === "inbound";
}

// ---------- Conversation List ----------

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
}: {
  conversations: ConversationWithDetails[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const filtered = conversations.filter(
    (c) =>
      c.lead?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lead?.phone?.includes(searchQuery)
  );

  return (
    <div
      className={cn(
        "w-full md:w-80 lg:w-96 border-r flex flex-col bg-background",
        selectedId && "hidden md:flex"
      )}
    >
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/30">
          {filtered.map((conversation) => {
            const unread = isUnread(conversation);

            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors hover:bg-muted/40",
                  selectedId === conversation.id && "bg-muted/60"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar 36px */}
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(conversation.lead?.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name + preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>
                        {conversation.lead?.full_name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground/70 shrink-0">
                        {conversation.lastMessage?.sent_at
                          ? formatDistanceToNow(new Date(conversation.lastMessage.sent_at), {
                              addSuffix: false,
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground line-clamp-1 flex-1 min-w-0">
                        {conversation.lastMessage?.body || "No messages yet"}
                      </p>
                      {/* Unread dot */}
                      {unread && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No conversations found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------- Message Thread ----------

function MessageThread({
  conversation,
  onBack,
}: {
  conversation: ConversationWithDetails | null;
  onBack: () => void;
}) {
  const { messages, isLoading, sendMessage } = useMessages(conversation?.id || null);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage.mutateAsync({ body: newMessage });
    setNewMessage("");
  };

  // Empty state: no conversation selected (desktop)
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center hidden md:flex">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a conversation to view messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-muted/20">
      {/* Thread header */}
      <div className="px-4 py-3 border-b bg-background flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon-sm" className="md:hidden shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(conversation.lead?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {conversation.lead?.full_name || "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {conversation.lead?.phone || "No phone"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Book
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Request Deposit
          </Button>
          <Button variant="ghost" size="icon-sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-2xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isOutbound = msg.direction === "outbound";

              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col", isOutbound ? "items-end" : "items-start")}
                >
                  {/* AI indicator for outbound messages */}
                  {isOutbound && (
                    <div className="flex items-center gap-1 mb-1 px-1">
                      <Bot className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground/60">AI</span>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={cn(
                      "max-w-[80%] px-4 py-2.5",
                      isOutbound
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                        : "bg-muted rounded-2xl rounded-bl-md"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {format(new Date(msg.sent_at), "h:mm a")}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Compose */}
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={sendMessage.isPending || !newMessage.trim()}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function InboxPage() {
  const { conversations, isLoading } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedConvo = conversations.find((c) => c.id === selectedConversation) || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div>
        <PageHeader
          icon={MessageSquare}
          title="Inbox"
          description="All your customer conversations"
        />
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center max-w-sm">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold mb-1">No messages yet</h2>
            <p className="text-sm text-muted-foreground mb-5">
              When customers text or call, their conversations will appear here.
            </p>
            <Button variant="outline" asChild>
              <Link to="/app/simulator">
                <Phone className="h-4 w-4" />
                Make a test call
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <PageHeader
        icon={MessageSquare}
        title="Inbox"
        description="All your customer conversations"
      />
      <div className="flex flex-1 min-h-0">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation}
          onSelect={setSelectedConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <MessageThread
          conversation={selectedConvo}
          onBack={() => setSelectedConversation(null)}
        />
      </div>
    </div>
  );
}
