import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Bot,
  Calendar,
  DollarSign,
  Loader2,
  MessageSquare,
  MoreVertical,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { useMessages, type ConversationWithDetails } from "@/hooks/useConversations";

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

interface MessageThreadProps {
  conversation: ConversationWithDetails | null;
  onBack: () => void;
}

export function MessageThread({ conversation, onBack }: MessageThreadProps) {
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
