import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { resolveCustomer, createOpportunity, createSyncEvent } from "@/hooks/useCustomerResolver";
import { MessageSquare, Send, User } from "lucide-react";

interface SimulatedSMS {
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: Date;
}

export default function SMSSimulator() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  
  const [senderPhone, setSenderPhone] = useState('');
  const [senderName, setSenderName] = useState('');
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [messages, setMessages] = useState<SimulatedSMS[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [resolvedCustomer, setResolvedCustomer] = useState<{
    id: string;
    isNew: boolean;
    hasConflict: boolean;
  } | null>(null);
  const [opportunityId, setOpportunityId] = useState<string | null>(null);

  const simulateAIResponse = (customerMessage: string): string => {
    const lowerMessage = customerMessage.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('quote')) {
      return "Thanks for reaching out! I can help with pricing. What service are you interested in? 🚗";
    }
    if (lowerMessage.includes('book') || lowerMessage.includes('appointment')) {
      return "I'd be happy to help you book! What day works best for you?";
    }
    if (lowerMessage.includes('cancel')) {
      return "I understand. Please call us at least 24hrs in advance to avoid any fees. Would you like to reschedule instead?";
    }
    if (lowerMessage.includes('thank')) {
      return "You're welcome! Let us know if you need anything else. Have a great day! 😊";
    }
    
    return `Thanks for your message! Someone from ${tenant?.name || 'our team'} will get back to you shortly. Is there anything specific I can help you with in the meantime?`;
  };

  const startConversation = async () => {
    if (!tenant?.id) {
      toast({ variant: "destructive", title: "No business configured" });
      return;
    }

    if (!senderPhone) {
      toast({ variant: "destructive", title: "Please enter a phone number" });
      return;
    }

    try {
      // Resolve customer through the unified pipeline
      const result = await resolveCustomer(
        tenant.id,
        senderPhone,
        senderName || undefined,
        undefined,
        'sms'
      );

      setResolvedCustomer({
        id: result.customer_id,
        isNew: result.is_new,
        hasConflict: result.has_conflict,
      });

      // Create opportunity
      const oppId = await createOpportunity(
        tenant.id,
        result.customer_id,
        'sms',
        undefined,
        'Inbound SMS via simulator'
      );
      setOpportunityId(oppId);

      // Fire sync event
      await createSyncEvent(
        tenant.id,
        result.is_new ? 'customer_created' : 'customer_updated',
        'customer',
        result.customer_id,
        { phone: senderPhone, name: senderName, source: 'simulator_sms' }
      );

      setIsConversationActive(true);

      toast({
        title: result.is_new ? "New customer created" : "Existing customer found",
        description: result.has_conflict 
          ? "Conflict detected - check merge queue" 
          : "Customer resolved successfully",
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to start conversation",
        description: error.message,
      });
    }
  };

  const sendInboundSMS = () => {
    if (!newMessage.trim()) return;

    const inboundMsg: SimulatedSMS = {
      direction: 'inbound',
      content: newMessage,
      timestamp: new Date(),
    };

    const aiResponse: SimulatedSMS = {
      direction: 'outbound',
      content: simulateAIResponse(newMessage),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, inboundMsg, aiResponse]);
    setNewMessage('');
  };

  const resetSimulator = () => {
    setSenderPhone('');
    setSenderName('');
    setMessages([]);
    setResolvedCustomer(null);
    setOpportunityId(null);
    setIsConversationActive(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Simulator (Mock Mode)
        </CardTitle>
        <CardDescription>
          Test the customer resolution pipeline with simulated text messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConversationActive ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sms-phone">Sender Phone *</Label>
                <Input
                  id="sms-phone"
                  placeholder="(555) 123-4567"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-name">Sender Name (optional)</Label>
                <Input
                  id="sms-name"
                  placeholder="Jane Doe"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
            </div>
            
            <Button onClick={startConversation} className="w-full gap-2">
              <MessageSquare className="h-4 w-4" />
              Start SMS Conversation
            </Button>
          </>
        ) : (
          <>
            {/* Customer Info */}
            {resolvedCustomer && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <User className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{senderName || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{senderPhone}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={resolvedCustomer.isNew ? "default" : "secondary"}>
                    {resolvedCustomer.isNew ? "New" : "Returning"}
                  </Badge>
                  {resolvedCustomer.hasConflict && (
                    <Badge variant="destructive">Conflict</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Message Thread */}
            <div className="border rounded-lg p-3 h-64 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Type a message to simulate an inbound SMS
                </p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-2 rounded-lg ${
                        msg.direction === 'inbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Simulate inbound SMS..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendInboundSMS();
                  }
                }}
                rows={2}
                className="flex-1"
              />
              <Button onClick={sendInboundSMS} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" onClick={resetSimulator} className="w-full">
              End Conversation & Reset
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
