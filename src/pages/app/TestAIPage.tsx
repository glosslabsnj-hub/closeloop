import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  Loader2,
  RotateCcw,
  User,
  Clock,
  Wrench,
  PhoneCall,
  MessageSquare,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface SimulationResult {
  aiResponse: string;
  intent: string;
  confidence: string;
  customerName: string;
  serviceRequested: string;
  preferredTime: string;
  phoneNumber: string;
  nextAction: string;
  knowledgeGap: boolean;
  gapDescription?: string;
  sourcesCount: number;
}

const QUICK_SUGGESTIONS = [
  "I need an emergency repair",
  "How much do you charge?",
  "What are your hours?",
  "I'd like to book an appointment",
];

function confidenceToPercent(confidence: string): number {
  switch (confidence) {
    case "high":
      return 90;
    case "medium":
      return 60;
    case "low":
      return 30;
    default:
      return 50;
  }
}

function nextActionLabel(action: string, intent: string): string {
  switch (action) {
    case "offer_slots":
      return "Would offer available time slots";
    case "book":
      return "Would book appointment";
    case "request_details":
      return "Would ask for more details";
    case "escalate":
      return "Would transfer to human";
    case "callback":
      return "Would schedule a callback";
    case "provide_info":
      return "Would provide information";
    default:
      return "Would take a message";
  }
}

export default function TestAIPage() {
  const { effectiveTenantId } = useAuth();
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const simulate = async (text?: string) => {
    const input = text || message;
    if (!input.trim()) return;

    if (!effectiveTenantId) {
      toast({ variant: "destructive", title: "No business configured" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    if (text) setMessage(text);

    try {
      const { data, error } = await supabase.functions.invoke("ai-plan-response", {
        body: {
          tenantId: effectiveTenantId,
          userMessage: input,
          channel: "call",
        },
      });

      if (error) throw error;

      const plan = data.plan;

      // Extract structured info from the reply & plan
      const nameMatch = input.match(/(?:my name is|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      const phoneMatch = input.match(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
      const timeMatch = input.match(/(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);

      setResult({
        aiResponse: plan.draft_reply,
        intent: plan.intent,
        confidence: plan.confidence,
        customerName: nameMatch?.[1] || "Not provided",
        serviceRequested:
          plan.required_info_to_collect?.find((i: string) => i.toLowerCase().includes("service"))
            ? plan.facts_to_use?.[0]?.content?.slice(0, 50) || "General inquiry"
            : plan.intent === "booking"
            ? "Appointment request"
            : plan.intent === "quote"
            ? "Price inquiry"
            : "General inquiry",
        preferredTime: timeMatch?.[0] || "Not specified",
        phoneNumber: phoneMatch?.[1] || "Not provided",
        nextAction: nextActionLabel(plan.next_action, plan.intent),
        knowledgeGap: plan.knowledge_gap_detected,
        gapDescription: plan.gap_description,
        sourcesCount: plan.sources_used?.length || 0,
      });
    } catch (err: any) {
      console.error("Simulation error:", err);
      toast({
        variant: "destructive",
        title: "Simulation failed",
        description: err.message || "Could not reach AI backend",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setMessage("");
    setResult(null);
  };

  const confidencePct = result ? confidenceToPercent(result.confidence) : 0;

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Test Your AI Receptionist"
        description="See how your AI handles customer calls"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT – Input */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4 text-primary" />
                Customer Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter a sample customer message... (e.g., 'Hi, I need a plumber to fix a leaky faucet. Do you have availability tomorrow morning?')"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    simulate();
                  }
                }}
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => simulate()}
                  disabled={isLoading || !message.trim()}
                  className="flex-1 gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PhoneCall className="h-4 w-4" />
                  )}
                  {isLoading ? "Simulating..." : "Simulate Call"}
                </Button>
                {result && (
                  <Button variant="outline" onClick={reset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Quick suggestion chips */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Quick scenarios:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setMessage(s);
                        simulate(s);
                      }}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT – Results */}
        <div className="space-y-4">
          {isLoading && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Running simulation with your real business data…
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !result && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Enter a message and click "Simulate Call" to see how your AI responds
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* AI Response */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-4 w-4 text-primary" />
                    AI Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{result.aiResponse}</p>
                  {result.knowledgeGap && (
                    <div className="mt-3 flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{result.gapDescription || "Knowledge gap detected — consider adding more info to your Business Brain."}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Extracted Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Extracted Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> Customer Name
                    </div>
                    <div className="font-medium">{result.customerName}</div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wrench className="h-3.5 w-3.5" /> Service Requested
                    </div>
                    <div className="font-medium">{result.serviceRequested}</div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Preferred Time
                    </div>
                    <div className="font-medium">{result.preferredTime}</div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> Phone Number
                    </div>
                    <div className="font-medium">{result.phoneNumber}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Action & Confidence */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Action & Confidence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{result.nextAction}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <Badge
                        variant="outline"
                        className={
                          result.confidence === "high"
                            ? "border-green-500 text-green-700"
                            : result.confidence === "medium"
                            ? "border-yellow-500 text-yellow-700"
                            : "border-red-500 text-red-700"
                        }
                      >
                        {result.confidence}
                      </Badge>
                    </div>
                    <Progress value={confidencePct} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">
                      Intent: {result.intent}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {result.sourcesCount} source{result.sourcesCount !== 1 ? "s" : ""} used
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
