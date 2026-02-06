import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, Calendar, Clock, ArrowUpRight, ArrowDownLeft, 
  Copy, ExternalLink, MessageSquare, Mail, Headphones,
  CheckCircle2, DollarSign, Smile, User, BrainCircuit,
  ChevronDown, ChevronUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

interface CallSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone: string | null;
  call_direction: "inbound" | "outbound";
  outcome: string | null;
  summary: string | null;
  transcript?: string | null;
  context_json: Record<string, unknown> | null;
  extracted_payload: Record<string, unknown> | null;
  customer_id: string | null;
  customer?: {
    id: string;
    full_name: string;
    phone_e164: string;
  } | null;
}

interface CallDetailPanelProps {
  call: CallSession | null;
  onClose: () => void;
  customerName?: string;
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "In progress";
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const seconds = Math.floor((end - start) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatPhone(phone: string | null): string {
  if (!phone) return "Unknown";
  if (phone.includes("(") || (phone.startsWith("+") && phone.length > 12)) return phone;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function getOutcomeInfo(outcome: string | null): { label: string; color: string; bg: string } {
  switch (outcome) {
    case "booked":
      return { label: "Booked", color: "text-success", bg: "bg-success/10" };
    case "order":
      return { label: "Order", color: "text-success", bg: "bg-success/10" };
    case "dispatch":
      return { label: "Dispatch", color: "text-success", bg: "bg-success/10" };
    case "followup":
      return { label: "Follow-up", color: "text-warning", bg: "bg-warning/10" };
    case "lead_captured":
      return { label: "Lead", color: "text-warning", bg: "bg-warning/10" };
    case "message":
      return { label: "Message", color: "text-info", bg: "bg-info/10" };
    case "lost":
      return { label: "No Booking", color: "text-destructive", bg: "bg-destructive/10" };
    case "escalated":
      return { label: "Escalated", color: "text-info", bg: "bg-info/10" };
    default:
      return { label: outcome || "Pending", color: "text-muted-foreground", bg: "bg-muted" };
  }
}

// Parse transcript into speaker turns
function parseTranscript(transcript: string | null | undefined): { speaker: "ai" | "caller"; text: string }[] {
  if (!transcript) return [];
  
  const turns: { speaker: "ai" | "caller"; text: string }[] = [];
  const lines = transcript.split("\n").filter(Boolean);
  
  lines.forEach(line => {
    // Try to detect speaker patterns
    const aiMatch = line.match(/^(AI|Assistant|Agent|Bot)[:>]\s*(.+)/i);
    const callerMatch = line.match(/^(Caller|Customer|User|Human)[:>]\s*(.+)/i);
    
    if (aiMatch) {
      turns.push({ speaker: "ai", text: aiMatch[2] });
    } else if (callerMatch) {
      turns.push({ speaker: "caller", text: callerMatch[2] });
    } else if (turns.length > 0) {
      // Append to last turn if no speaker prefix
      turns[turns.length - 1].text += " " + line;
    } else {
      // Default to caller for first unattributed line
      turns.push({ speaker: "caller", text: line });
    }
  });
  
  return turns;
}

// Extract booking details from payload
function getBookingDetails(payload: Record<string, unknown> | null): {
  service?: string;
  dateTime?: string;
  staff?: string;
  price?: number;
} | null {
  if (!payload) return null;
  
  const service = payload.service_name as string || payload.service as string;
  const dateTime = payload.appointment_time as string || payload.booking_time as string || payload.date as string;
  const staff = payload.staff_name as string || payload.provider as string;
  const price = payload.price as number || payload.total as number;
  
  if (!service && !dateTime && !staff && !price) return null;
  return { service, dateTime, staff, price };
}

// Extract AI analysis from payload
function getAIAnalysis(payload: Record<string, unknown> | null): {
  intent?: string;
  services?: string[];
  objections?: string[];
  questions?: number;
  confidence?: number;
} | null {
  if (!payload) return null;
  
  return {
    intent: payload.intent as string || payload.detected_intent as string,
    services: payload.services_mentioned as string[] || [],
    objections: payload.objections as string[] || [],
    questions: payload.questions_asked as number,
    confidence: payload.confidence as number || payload.ai_confidence as number,
  };
}

export function CallDetailPanel({ call, onClose, customerName }: CallDetailPanelProps) {
  const navigate = useNavigate();
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  
  if (!call) return null;

  const outcomeInfo = getOutcomeInfo(call.outcome);
  const displayName = customerName || call.customer?.full_name || "Unknown Caller";
  const bookingDetails = getBookingDetails(call.extracted_payload);
  const aiAnalysis = getAIAnalysis(call.extracted_payload);
  const transcriptTurns = parseTranscript(call.transcript);
  
  // Extract price from payload
  const revenue = call.extracted_payload?.price as number || call.extracted_payload?.total as number;

  const copyTranscript = () => {
    if (call.transcript) {
      navigator.clipboard.writeText(call.transcript);
      toast.success("Transcript copied to clipboard");
    }
  };

  return (
    <Sheet open={!!call} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              call.call_direction === "inbound" ? "bg-success/10" : "bg-primary/10"
            )}>
              {call.call_direction === "inbound" ? (
                <ArrowDownLeft className="w-5 h-5 text-success" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <SheetTitle className="text-lg">
                Call with {displayName}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {formatPhone(call.caller_phone)} • {format(new Date(call.started_at), "MMM d 'at' h:mm a")} • {formatDuration(call.started_at, call.ended_at)}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Outcome metrics */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <CheckCircle2 className={cn("w-5 h-5 mx-auto mb-1", outcomeInfo.color)} />
                  <p className="text-xs text-muted-foreground">Outcome</p>
                  <p className={cn("text-sm font-semibold", outcomeInfo.color)}>{outcomeInfo.label}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <DollarSign className="w-5 h-5 mx-auto mb-1 text-success" />
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-sm font-semibold">{revenue ? `$${revenue}` : "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Smile className="w-5 h-5 mx-auto mb-1 text-info" />
                  <p className="text-xs text-muted-foreground">Sentiment</p>
                  <p className="text-sm font-semibold">Positive</p>
                </CardContent>
              </Card>
            </div>

            {/* Booking created */}
            {bookingDetails && call.outcome === "booked" && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Booking Created
                </h3>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {bookingDetails.service && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Service</span>
                        <span className="text-sm font-medium">{bookingDetails.service}</span>
                      </div>
                    )}
                    {bookingDetails.dateTime && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Date</span>
                        <span className="text-sm font-medium">{bookingDetails.dateTime}</span>
                      </div>
                    )}
                    {bookingDetails.staff && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Staff</span>
                        <span className="text-sm font-medium">{bookingDetails.staff}</span>
                      </div>
                    )}
                    {bookingDetails.price && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="text-sm font-semibold">${bookingDetails.price}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        View Booking
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Summary */}
            {call.summary && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground">{call.summary}</p>
              </div>
            )}

            {/* Transcript */}
            {transcriptTurns.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Transcript</h3>
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={copyTranscript}>
                    <Copy className="w-3 h-3" />
                    Copy All
                  </Button>
                </div>
                <Card>
                  <CardContent className={cn(
                    "p-4 space-y-3 overflow-hidden transition-all",
                    !transcriptExpanded && "max-h-64"
                  )}>
                    {transcriptTurns.slice(0, transcriptExpanded ? undefined : 6).map((turn, i) => (
                      <div key={i} className="flex gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs",
                          turn.speaker === "ai" 
                            ? "bg-primary/10 text-primary" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {turn.speaker === "ai" ? "🤖" : "👤"}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">
                            {turn.speaker === "ai" ? "AI" : "Caller"}
                          </p>
                          <p className="text-sm">{turn.text}</p>
                        </div>
                      </div>
                    ))}
                    {transcriptTurns.length > 6 && !transcriptExpanded && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
                    )}
                  </CardContent>
                </Card>
                {transcriptTurns.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 gap-1"
                    onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                  >
                    {transcriptExpanded ? (
                      <>Show Less <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>Show More ({transcriptTurns.length - 6} more) <ChevronDown className="w-4 h-4" /></>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* AI Analysis */}
            {aiAnalysis && (aiAnalysis.intent || aiAnalysis.confidence) && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" />
                  AI Analysis
                </h3>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {aiAnalysis.intent && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Intent Detected</span>
                        <span className="text-sm font-medium capitalize">{aiAnalysis.intent}</span>
                      </div>
                    )}
                    {aiAnalysis.services && aiAnalysis.services.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Services Mentioned</span>
                        <span className="text-sm font-medium">{aiAnalysis.services.join(", ")}</span>
                      </div>
                    )}
                    {aiAnalysis.objections && aiAnalysis.objections.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Objections</span>
                        <span className="text-sm font-medium">{aiAnalysis.objections.join(", ")}</span>
                      </div>
                    )}
                    {aiAnalysis.confidence && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">AI Confidence</span>
                        <span className="text-sm font-medium">{Math.round(aiAnalysis.confidence * 100)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Customer */}
            {call.customer_id && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer
                </h3>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {formatPhone(call.caller_phone)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/customers/${call.customer_id}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Extracted data (debug) */}
            {call.extracted_payload && Object.keys(call.extracted_payload).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Extracted Data</h3>
                <Card>
                  <CardContent className="p-3">
                    <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                      {JSON.stringify(call.extracted_payload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions footer */}
        <div className="p-4 border-t shrink-0">
          <div className="flex gap-2">
            {call.caller_phone && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`tel:${call.caller_phone}`, "_self")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Back
              </Button>
            )}
            <Button variant="outline" className="flex-1">
              <MessageSquare className="w-4 h-4 mr-2" />
              Send SMS
            </Button>
            <Button variant="outline" className="flex-1">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button variant="ghost" size="icon">
              <Headphones className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
