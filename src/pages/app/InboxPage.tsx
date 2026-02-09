import { useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Phone, Loader2, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { ConversationList, MessageThread } from "@/components/inbox";

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
