import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveCustomer, createOpportunity, createSyncEvent } from "@/hooks/useCustomerResolver";
import { MessageSquare, Send, User, Loader2, Brain, AlertTriangle } from "lucide-react";

interface SimulatedSMS {
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: string;
    sources?: Array<{ type: string; id: string }>;
    knowledgeGap?: boolean;
  };
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
  const [aiLoading, setAiLoading] = useState(false);

  const getAIResponse = async (customerMessage: string, previousMessages: SimulatedSMS[]): Promise<SimulatedSMS> => {
    if (!tenant?.id) {
      return {
        direction: 'outbound',
        content: "Thanks for reaching out! We'll get back to you shortly.",
        timestamp: new Date(),
      };
    }

    // Build conversation history from previous messages
    const conversationHistory = previousMessages.map(msg => ({
      role: msg.direction === 'inbound' ? 'customer' : 'assistant',
      content: msg.content,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-plan-response', {
        body: {
          tenantId: tenant.id,
          userMessage: customerMessage,
          channel: 'sms',
          customerId: resolvedCustomer?.id,
          conversationHistory,
        },
      });

      if (error) throw error;

      const plan = data.plan;
      
      return {
        direction: 'outbound',
        content: plan.draft_reply,
        timestamp: new Date(),
        metadata: {
          intent: plan.intent,
          confidence: plan.confidence,
          sources: plan.sources_used,
          knowledgeGap: plan.knowledge_gap_detected,
        },
      };
    } catch (error) {
      console.error('AI response error:', error);
      return {
        direction: 'outbound',
        content: "Thanks for your message! Someone from our team will get back to you shortly.",
        timestamp: new Date(),
        metadata: { confidence: 'low' },
      };
    }
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

    setAiLoading(true);
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
    } finally {
      setAiLoading(false);
    }
  };

  const sendInboundSMS = async () => {
    if (!newMessage.trim()) return;

    const inboundMsg: SimulatedSMS = {
      direction: 'inbound',
      content: newMessage,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, inboundMsg];
    setMessages(updatedMessages);
    setNewMessage('');
    setAiLoading(true);

    const aiResponse = await getAIResponse(newMessage, updatedMessages);
    setMessages(prev => [...prev, aiResponse]);
    setAiLoading(false);
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
          SMS Simulator
          <Badge variant="secondary" className="gap-1">
            <Brain className="h-3 w-3" />
            AI-Powered
          </Badge>
        </CardTitle>
        <CardDescription>
          Test your AI text responses with real business data and knowledge retrieval
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
            
            <Button onClick={startConversation} className="w-full gap-2" disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              {aiLoading ? "Starting..." : "Start SMS Conversation"}
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
            <div className="border rounded-lg p-3 h-72 overflow-y-auto space-y-3">
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
                      className={`max-w-[85%] p-3 rounded-lg ${
                        msg.direction === 'inbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      {msg.metadata && msg.direction === 'outbound' && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-primary/10">
                          {msg.metadata.intent && (
                            <Badge variant="outline" className="text-[10px]">
                              {msg.metadata.intent}
                            </Badge>
                          )}
                          {msg.metadata.confidence && (
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${
                                msg.metadata.confidence === 'high' ? 'border-green-500 text-green-700' :
                                msg.metadata.confidence === 'medium' ? 'border-yellow-500 text-yellow-700' :
                                'border-red-500 text-red-700'
                              }`}
                            >
                              {msg.metadata.confidence}
                            </Badge>
                          )}
                          {msg.metadata.knowledgeGap && (
                            <Badge variant="destructive" className="text-[10px] gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Gap
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">AI composing...</span>
                  </div>
                </div>
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
                disabled={aiLoading}
              />
              <Button onClick={sendInboundSMS} size="icon" disabled={aiLoading}>
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
