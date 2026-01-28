import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone,
  Send,
  Calendar,
  DollarSign,
  MoreVertical,
  Search,
  Bot,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Demo conversations
const demoConversations = [
  {
    id: "1",
    name: "John Davis",
    phone: "+1 555-0101",
    lastMessage: "Great, I'll see you tomorrow at 2pm!",
    time: "5m ago",
    unread: true,
    status: "booked",
    source: "ai_call",
  },
  {
    id: "2",
    name: "Sarah Miller",
    phone: "+1 555-0102",
    lastMessage: "What's your availability this weekend?",
    time: "23m ago",
    unread: true,
    status: "qualified",
    source: "missed_call",
  },
  {
    id: "3",
    name: "Mike Thompson",
    phone: "+1 555-0103",
    lastMessage: "Payment received. Thank you!",
    time: "1h ago",
    unread: false,
    status: "won",
    source: "sms",
  },
  {
    id: "4",
    name: "Lisa Kim",
    phone: "+1 555-0104",
    lastMessage: "Can you do ceramic coating?",
    time: "2h ago",
    unread: false,
    status: "contacted",
    source: "ai_call",
  },
];

const demoMessages = [
  { id: "1", direction: "inbound", body: "Hi, I'm interested in getting my car detailed.", time: "2:30 PM", isAI: false },
  { id: "2", direction: "outbound", body: "Hi! Thank you for reaching out. I'd be happy to help you. What type of service are you looking for - a basic wash, full detail, or ceramic coating?", time: "2:30 PM", isAI: true },
  { id: "3", direction: "inbound", body: "I'm thinking a full detail. How much is that?", time: "2:31 PM", isAI: false },
  { id: "4", direction: "outbound", body: "Our full detail is $200 and takes about 3 hours. It includes interior deep clean, exterior wash and wax, and engine bay cleaning. We have availability tomorrow at 2pm or Saturday at 10am. Would either of those work for you?", time: "2:31 PM", isAI: true },
  { id: "5", direction: "inbound", body: "Tomorrow at 2pm works!", time: "2:32 PM", isAI: false },
  { id: "6", direction: "outbound", body: "Great, I'll see you tomorrow at 2pm! I'll send you a confirmation with our address. We require a $50 deposit to hold your spot. I'm sending the payment link now.", time: "2:32 PM", isAI: true },
];

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-purple-100 text-purple-800",
  booked: "bg-green-100 text-green-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-gray-100 text-gray-800",
};

export default function InboxPage() {
  const { tenant } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>("1");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedConvo = demoConversations.find((c) => c.id === selectedConversation);

  const handleSend = () => {
    if (!message.trim()) return;
    // In production, this would send via edge function
    setMessage("");
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] flex">
      {/* Conversation List */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r flex flex-col bg-background",
          selectedConversation && "hidden md:flex"
        )}
      >
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {demoConversations
              .filter((c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-secondary/50 transition-colors",
                    selectedConversation === conversation.id && "bg-secondary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conversation.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{conversation.name}</span>
                        <span className="text-xs text-muted-foreground">{conversation.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {conversation.lastMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={cn("text-xs", statusColors[conversation.status])}>
                          {conversation.status}
                        </Badge>
                        {conversation.source === "ai_call" && (
                          <Bot className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </div>
                    {conversation.unread && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              ))}
          </div>
        </ScrollArea>
      </div>

      {/* Message Thread */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-secondary/30",
          !selectedConversation && "hidden md:flex"
        )}
      >
        {selectedConvo ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedConvo.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedConvo.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedConvo.phone}</p>
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
                {demoMessages.map((msg) => (
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
                      {msg.isAI && msg.direction === "outbound" && (
                        <div className="flex items-center gap-1 text-xs opacity-75 mb-1">
                          <Bot className="h-3 w-3" />
                          AI Response
                        </div>
                      )}
                      <p className="text-sm">{msg.body}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          msg.direction === "outbound"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2 max-w-2xl mx-auto">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
