import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConversations, useMessages, ConversationWithDetails } from "@/hooks/useConversations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
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
  Mic,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-purple-100 text-purple-800",
  booked: "bg-green-100 text-green-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-gray-100 text-gray-800",
};

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
  const filtered = conversations.filter((c) =>
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
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filtered.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "w-full p-4 text-left hover:bg-secondary/50 transition-colors",
                selectedId === conversation.id && "bg-secondary"
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {conversation.lead?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {conversation.lead?.full_name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {conversation.lastMessage?.sent_at
                        ? formatDistanceToNow(new Date(conversation.lastMessage.sent_at), {
                            addSuffix: true,
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {conversation.lastMessage?.body || "No messages yet"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {conversation.lead?.status && (
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", statusColors[conversation.lead.status])}
                      >
                        {conversation.lead.status}
                      </Badge>
                    )}
                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(conversation.id);
                        }}
                        title="Reply"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      {conversation.lead?.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${conversation.lead?.phone}`, '_self');
                          }}
                          title="Call"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

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

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center hidden md:flex">
        <div className="text-center text-muted-foreground">
          <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a conversation to view messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col bg-secondary/30")}>
      {/* Header */}
      <div className="p-4 border-b bg-background flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversation.lead?.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("") || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{conversation.lead?.full_name || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">
              {conversation.lead?.phone || "No phone"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
            <Calendar className="h-4 w-4" />
            Book
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
            <DollarSign className="h-4 w-4" />
            Request Deposit
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.direction === "outbound" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    msg.direction === "outbound"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-background border rounded-bl-md"
                  )}
                >
                  <p className="text-sm">{msg.body}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      msg.direction === "outbound"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(new Date(msg.sent_at), "h:mm a")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon" disabled={sendMessage.isPending}>
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

export default function InboxPage() {
  const { conversations, isLoading } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const selectedConvo = conversations.find((c) => c.id === selectedConversation) || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <EmptyState
          icon={Phone}
          title="No calls yet"
          description="Once your AI starts taking calls, they'll appear here. Make a test call to try it out!"
          emojiStyle
          action={{
            label: "Make Test Call",
            icon: Mic,
            onClick: () => navigate("/app/simulator"),
          }}
          secondaryAction={{
            label: "How It Works",
            icon: BookOpen,
            onClick: () => navigate("/app/help"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation}
        onSelect={setSelectedConversation}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <MessageThread conversation={selectedConvo} onBack={() => setSelectedConversation(null)} />
    </div>
  );
}
