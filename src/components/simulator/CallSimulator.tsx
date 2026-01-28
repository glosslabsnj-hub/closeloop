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
import { Phone, PhoneIncoming, PhoneOff, User, MessageCircle, CheckCircle2 } from "lucide-react";

interface SimulatedMessage {
  role: 'customer' | 'ai';
  content: string;
  timestamp: Date;
}

export default function CallSimulator() {
  const { tenant } = useAuth();
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

  const simulateAIResponse = (customerMessage: string): string => {
    // Simple mock AI responses based on keywords
    const lowerMessage = customerMessage.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
      return "I'd be happy to help with pricing! Let me look up our current rates for you. What service are you interested in?";
    }
    if (lowerMessage.includes('appointment') || lowerMessage.includes('book') || lowerMessage.includes('schedule')) {
      return "I can help you schedule an appointment! What day and time works best for you?";
    }
    if (lowerMessage.includes('hours') || lowerMessage.includes('open')) {
      return "We're typically open Monday through Friday from 9am to 5pm, and Saturday from 10am to 2pm.";
    }
    if (lowerMessage.includes('cancel')) {
      return "I understand. Our cancellation policy requires 24 hours notice. Would you like me to help you reschedule instead?";
    }
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hi there! Thank you for calling ${tenant?.name || 'our business'}. How can I help you today?`;
    }
    
    return "I understand. Let me see how I can help you with that. Could you tell me more about what you're looking for?";
  };

  const startCall = async () => {
    if (!tenant?.id) {
      toast({ variant: "destructive", title: "No business configured" });
      return;
    }

    if (!callerPhone) {
      toast({ variant: "destructive", title: "Please enter a phone number" });
      return;
    }

    try {
      // Resolve customer through the unified pipeline
      const result = await resolveCustomer(
        tenant.id,
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
        tenant.id,
        result.customer_id,
        'inbound_call',
        undefined,
        'Inbound call via simulator'
      );
      setOpportunityId(oppId);

      // Fire sync event
      await createSyncEvent(
        tenant.id,
        result.is_new ? 'customer_created' : 'customer_updated',
        'customer',
        result.customer_id,
        { phone: callerPhone, name: callerName, source: 'simulator_call' }
      );

      setIsCallActive(true);
      setCallLog([{
        role: 'ai',
        content: `Hi, thank you for calling ${tenant.name}! How can I help you today?`,
        timestamp: new Date(),
      }]);

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
    }
  };

  const sendMessage = () => {
    if (!customerInput.trim()) return;

    const customerMessage: SimulatedMessage = {
      role: 'customer',
      content: customerInput,
      timestamp: new Date(),
    };

    const aiResponse: SimulatedMessage = {
      role: 'ai',
      content: simulateAIResponse(customerInput),
      timestamp: new Date(),
    };

    setCallLog(prev => [...prev, customerMessage, aiResponse]);
    setCustomerInput('');
  };

  const endCall = async () => {
    if (tenant?.id && opportunityId) {
      await createSyncEvent(
        tenant.id,
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
          Call Simulator (Mock Mode)
        </CardTitle>
        <CardDescription>
          Test the customer resolution pipeline with simulated inbound calls
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
            
            <Button onClick={startCall} className="w-full gap-2">
              <PhoneIncoming className="h-4 w-4" />
              Simulate Inbound Call
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
            <div className="border rounded-lg p-3 h-64 overflow-y-auto space-y-3">
              {callLog.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-2 rounded-lg ${
                      msg.role === 'customer'
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
              ))}
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
              />
              <Button onClick={sendMessage} size="icon">
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
