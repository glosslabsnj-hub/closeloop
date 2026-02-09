import { cn } from "@/lib/utils";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ConversationWithDetails } from "@/hooks/useConversations";

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

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
}: ConversationListProps) {
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
        <AnimatedList className="divide-y divide-border/30">
          {filtered.map((conversation) => {
            const unread = isUnread(conversation);

            return (
              <AnimatedListItem key={conversation.id}>
                <button
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
              </AnimatedListItem>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No conversations found</p>
            </div>
          )}
        </AnimatedList>
      </ScrollArea>
    </div>
  );
}
