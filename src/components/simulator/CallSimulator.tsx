import { useState, useEffect } from "react";
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
import { Phone, PhoneIncoming, PhoneOff, User, MessageCircle, Loader2, Brain, AlertTriangle, DollarSign } from "lucide-react";
import { computePriceQuote, detectPricingQuestion, type QuoteResult, type PricingRule } from "@/lib/computeQuote";
import { useQuery } from "@tanstack/react-query";

interface SimulatedMessage {
  role: 'customer' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: string;
    sources?: Array<{ type: string; id: string }>;
    knowledgeGap?: boolean;
    priceQuote?: QuoteResult;
  };
}

export default function CallSimulator() {
  const { effectiveTenantId, effectiveTenant } = useAuth();
  const { toast } = useToast();
  
  const [callerPhone, setCallerPhone] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerEmail, setCallerEmail] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callLog, setCallLog] = useState<SimulatedMessage[]>([]);
  const [customerInput, setCustomerInput] = useState('');
  const [resolvedCustomer, setResolvedCustomer] = useState<{
    id: string;
    isNew: boolean;
    hasConflict: boolean;
  } | null>(null);
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch pricing rules from effective tenant (respects admin tenant switching)
  const { data: pricingRulesData } = useQuery({
    queryKey: ['tenant-pricing-rules', effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTenantId) return null;
      const { data } = await supabase
        .from('tenants')
        .select('pricing_rules_jsonb, business_mode')
        .eq('id', effectiveTenantId)
        .single();
      return data;
    },
    enabled: !!effectiveTenantId,
  });

  const pricingRules: PricingRule[] = (pricingRulesData?.pricing_rules_jsonb as any) || [];
  const businessMode = pricingRulesData?.business_mode || effectiveTenant?.business_mode || 'service';

  // Listen for suggested test clicks from SuggestedTestsBanner
  useEffect(() => {
    const handleSuggestedTest = (event: CustomEvent<{ text: string }>) => {
      if (isCallActive && event.detail?.text) {
        setCustomerInput(event.detail.text);
      }
    };

    window.addEventListener('suggested-test-clicked', handleSuggestedTest as EventListener);
    return () => {
      window.removeEventListener('suggested-test-clicked', handleSuggestedTest as EventListener);
    };
  }, [isCallActive]);

  const getAIResponse = async (customerMessage: string): Promise<SimulatedMessage> => {
    if (!effectiveTenantId) {
      return {
        role: 'ai',
        content: "I'm sorry, I'm having trouble accessing the system. Let me have someone call you back.",
        timestamp: new Date(),
      };
    }

    // Detect pricing question and compute quote if applicable
    let priceQuote: QuoteResult | undefined;
    if (detectPricingQuestion(customerMessage)) {
      priceQuote = computePriceQuote({
        rules: pricingRules,
        businessMode: businessMode,
        offering: {
          serviceName: "General Service", // In real scenario, would extract from context
        },
        inputs: {}, // In real scenario, would extract from conversation
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-plan-response', {
        body: {
          tenantId: effectiveTenantId,
          userMessage: customerMessage,
          channel: 'call',
          customerId: resolvedCustomer?.id,
        },
      });

      if (error) throw error;

      const plan = data.plan;

      return {
        role: 'ai',
        content: plan.draft_reply,
        timestamp: new Date(),
        metadata: {
          intent: plan.intent,
          confidence: plan.confidence,
          sources: plan.sources_used,
          knowledgeGap: plan.knowledge_gap_detected,
          priceQuote,
        },
      };
    } catch (error) {
      console.error('AI response error:', error);
      return {
        role: 'ai',
        content: "I'd be happy to help! Let me have someone call you back with more details.",
        timestamp: new Date(),
        metadata: { confidence: 'low', priceQuote },
      };
    }
  };

  const startCall = async () => {
    if (!effectiveTenantId) {
      toast({ variant: "destructive", title: "No business configured" });
      return;
    }

    if (!callerPhone) {
      toast({ variant: "destructive", title: "Please enter a phone number" });
      return;
    }

    setAiLoading(true);
    try {
      // Resolve customer through the unified pipeline
      const result = await resolveCustomer(
        effectiveTenantId,
        callerPhone,
        callerName || undefined,
        callerEmail || undefined,
        'inbound_call'
      );

      setResolvedCustomer({
        id: result.customer_id,
        isNew: result.is_new,
        hasConflict: result.has_conflict,
      });

      // Create opportunity for this call
      const oppId = await createOpportunity(
        effectiveTenantId,
        result.customer_id,
        'inbound_call',
        undefined,
        'Inbound call via simulator'
      );
      setOpportunityId(oppId);

      // Fire sync event
      await createSyncEvent(
        effectiveTenantId,
        result.is_new ? 'customer_created' : 'customer_updated',
        'customer',
        result.customer_id,
        { phone: callerPhone, name: callerName, source: 'simulator_call' }
      );

      // Get AI greeting
      const greetingResponse = await getAIResponse('Hello');
      
      setIsCallActive(true);
      setCallLog([greetingResponse]);

      toast({
        title: result.is_new ? "New customer created" : "Existing customer found",
        description: result.has_conflict 
          ? "Conflict detected - check merge queue" 
          : `Customer resolved successfully`,
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to start call",
        description: error.message,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!customerInput.trim()) return;

    const customerMessage: SimulatedMessage = {
      role: 'customer',
      content: customerInput,
      timestamp: new Date(),
    };

    setCallLog(prev => [...prev, customerMessage]);
    setCustomerInput('');
    setAiLoading(true);

    const aiResponse = await getAIResponse(customerInput);
    setCallLog(prev => [...prev, aiResponse]);
    setAiLoading(false);
  };

  const endCall = async () => {
    if (effectiveTenantId && opportunityId) {
      await createSyncEvent(
        effectiveTenantId,
        'call_completed',
        'opportunity',
        opportunityId,
        { 
          duration_seconds: callLog.length * 10, 
          outcome: 'completed',
          message_count: callLog.length 
        }
      );
    }

    setIsCallActive(false);
    toast({ title: "Call ended", description: "Call session completed and logged" });
  };

  const resetSimulator = () => {
    setCallerPhone('');
    setCallerName('');
    setCallerEmail('');
    setCallLog([]);
    setResolvedCustomer(null);
    setOpportunityId(null);
    setIsCallActive(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call Simulator
          <Badge variant="secondary" className="gap-1">
            <Brain className="h-3 w-3" />
            AI-Powered
          </Badge>
        </CardTitle>
        <CardDescription>
          Test your AI voice assistant with real business data and knowledge retrieval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCallActive ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Caller Phone *</Label>
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={callerPhone}
                  onChange={(e) => setCallerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Caller Name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Caller Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={callerEmail}
                  onChange={(e) => setCallerEmail(e.target.value)}
                />
              </div>
            </div>
            
            <Button onClick={startCall} className="w-full gap-2" disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneIncoming className="h-4 w-4" />}
              {aiLoading ? "Connecting..." : "Simulate Inbound Call"}
            </Button>
          </>
        ) : (
          <>
            {/* Customer Info Banner */}
            {resolvedCustomer && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <User className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{callerName || 'Unknown Caller'}</p>
                  <p className="text-sm text-muted-foreground">{callerPhone}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={resolvedCustomer.isNew ? "default" : "secondary"}>
                    {resolvedCustomer.isNew ? "New Customer" : "Returning"}
                  </Badge>
                  {resolvedCustomer.hasConflict && (
                    <Badge variant="destructive">Conflict</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Call Log */}
            <div className="border rounded-lg p-3 h-72 overflow-y-auto space-y-3">
              {callLog.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      msg.role === 'customer'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    {msg.metadata && msg.role === 'ai' && (
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
                        {msg.metadata.priceQuote && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] gap-0.5 ${
                              msg.metadata.priceQuote.confidence >= 0.8 ? 'border-green-500 text-green-700' :
                              msg.metadata.priceQuote.confidence >= 0.5 ? 'border-yellow-500 text-yellow-700' :
                              'border-orange-500 text-orange-700'
                            }`}
                          >
                            <DollarSign className="h-2.5 w-2.5" />
                            {msg.metadata.priceQuote.type} ({msg.metadata.priceQuote.confidence.toFixed(1)})
                          </Badge>
                        )}
                      </div>
                    )}
                    {msg.metadata?.priceQuote?.missingInputs && msg.metadata.priceQuote.missingInputs.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-primary/10">
                        <p className="text-[10px] text-muted-foreground mb-1">Missing inputs for exact quote:</p>
                        <div className="flex flex-wrap gap-1">
                          {msg.metadata.priceQuote.missingInputs.map((input, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px]">
                              {input.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">AI thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Type customer response..."
                value={customerInput}
                onChange={(e) => setCustomerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={2}
                className="flex-1"
                disabled={aiLoading}
              />
              <Button onClick={sendMessage} size="icon" disabled={aiLoading}>
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>

            {/* Call Controls */}
            <div className="flex gap-2">
              <Button variant="destructive" onClick={endCall} className="flex-1 gap-2">
                <PhoneOff className="h-4 w-4" />
                End Call
              </Button>
              <Button variant="outline" onClick={resetSimulator}>
                Reset
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
