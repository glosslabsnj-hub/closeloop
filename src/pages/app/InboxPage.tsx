import { useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Phone, Loader2, MessageSquare, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { ConversationList, MessageThread } from "@/components/inbox";
import ErrorBoundary from "@/components/ErrorBoundary";

function InboxPageContent() {
  const { conversations, isLoading, error: conversationsError, refetch } = useConversations();
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

  if (conversationsError) {
    return (
      <div className="container max-w-6xl py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-lg py-16">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Couldn't load your messages</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                This is usually a temporary connection issue. Try again, or come back in a minute.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
              <div className="flex items-center justify-center gap-3 text-sm">
                <Link to="/app" className="text-primary hover:underline">Back to Dashboard</Link>
                <span className="text-border">·</span>
                <a href="mailto:support@getfluxdata.com" className="text-muted-foreground hover:underline">Contact Support</a>
              </div>
            </CardContent>
          </Card>
        </div>
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

export default function InboxPage() {
  return (
    <ErrorBoundary context="loading your messages">
      <InboxPageContent />
    </ErrorBoundary>
  );
}
