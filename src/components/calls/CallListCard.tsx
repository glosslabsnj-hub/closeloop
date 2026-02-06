import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Loader2, ArrowDownLeft, ArrowUpRight, CheckCircle2, HelpCircle, AlertTriangle, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CallSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone: string | null;
  call_direction: "inbound" | "outbound";
  outcome: string | null;
  summary: string | null;
  context_json: Record<string, unknown> | null;
  extracted_payload: Record<string, unknown> | null;
  customer_id: string | null;
  customer?: {
    id: string;
    full_name: string;
    phone_e164: string;
  } | null;
}

interface CallListCardProps {
  call: CallSession;
  onClick: () => void;
  customerName: string;
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

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "";
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const seconds = Math.floor((end - start) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function getOutcomeInfo(outcome: string | null): { icon: React.ElementType; iconClass: string; badgeClass: string; label: string; description?: string } {
  switch (outcome) {
    case "booked":
      return { icon: CheckCircle2, iconClass: "text-success", badgeClass: "bg-success/10 text-success border-success/20", label: "Booked" };
    case "order":
      return { icon: CheckCircle2, iconClass: "text-success", badgeClass: "bg-success/10 text-success border-success/20", label: "Order" };
    case "dispatch":
      return { icon: CheckCircle2, iconClass: "text-success", badgeClass: "bg-success/10 text-success border-success/20", label: "Dispatched" };
    case "followup":
      return { icon: Clock, iconClass: "text-warning", badgeClass: "bg-warning/10 text-warning border-warning/20", label: "Follow-up" };
    case "lead_captured":
      return { icon: Clock, iconClass: "text-warning", badgeClass: "bg-warning/10 text-warning border-warning/20", label: "Lead" };
    case "message":
      return { icon: MessageSquare, iconClass: "text-info", badgeClass: "bg-info/10 text-info border-info/20", label: "Message" };
    case "lost":
      return { icon: AlertTriangle, iconClass: "text-destructive", badgeClass: "bg-destructive/10 text-destructive border-destructive/20", label: "No Booking" };
    case "escalated":
      return { icon: Phone, iconClass: "text-info", badgeClass: "bg-info/10 text-info border-info/20", label: "Escalated" };
    case "answered":
      return { icon: HelpCircle, iconClass: "text-info", badgeClass: "bg-info/10 text-info border-info/20", label: "Question Answered" };
    default:
      return { icon: Phone, iconClass: "text-muted-foreground", badgeClass: "bg-muted text-muted-foreground border-border", label: outcome || "Pending" };
  }
}

// Extract booking info from extracted_payload
function getBookingInfo(payload: Record<string, unknown> | null): { service?: string; dateTime?: string; price?: number } | null {
  if (!payload) return null;
  
  const service = payload.service_name as string || payload.service as string;
  const dateTime = payload.appointment_time as string || payload.booking_time as string;
  const price = payload.price as number || payload.total as number;
  
  if (!service && !dateTime && !price) return null;
  return { service, dateTime, price };
}

export function CallListCard({ call, onClick, customerName }: CallListCardProps) {
  const outcomeInfo = getOutcomeInfo(call.outcome);
  const duration = formatDuration(call.started_at, call.ended_at);
  const bookingInfo = getBookingInfo(call.extracted_payload);
  const isReturning = call.customer?.id && call.customer.full_name !== "Unknown";
  const OutcomeIcon = outcomeInfo.icon;

  return (
    <Card
      interactive
      className="cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Phone icon with direction indicator */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-background border",
              call.call_direction === "inbound" ? "text-success" : "text-primary"
            )}>
              {call.call_direction === "inbound" ? (
                <ArrowDownLeft className="w-2.5 h-2.5" />
              ) : (
                <ArrowUpRight className="w-2.5 h-2.5" />
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-sm text-muted-foreground">
                  {formatPhone(call.caller_phone)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(call.started_at), "h:mm a")}
                </span>
                {duration && (
                  <span className="text-xs text-muted-foreground">
                    {duration}
                  </span>
                )}
              </div>
            </div>

            {/* Customer name row */}
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{customerName}</p>
              {isReturning && (
                <Badge variant="secondary" size="sm" className="shrink-0">
                  Returning
                </Badge>
              )}
            </div>

            {/* Outcome summary box */}
            <div className={cn(
              "mt-2 p-2.5 rounded-lg border",
              outcomeInfo.badgeClass
            )}>
              <div className="flex items-start gap-2">
                <OutcomeIcon className={cn("w-4 h-4 mt-0.5 shrink-0", outcomeInfo.iconClass)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{outcomeInfo.label}</span>
                    {bookingInfo?.price && (
                      <span className="text-sm font-semibold">${bookingInfo.price}</span>
                    )}
                  </div>
                  {call.summary ? (
                    <p className="text-xs opacity-80 line-clamp-1 mt-0.5">
                      {call.summary}
                    </p>
                  ) : !call.ended_at ? (
                    <p className="text-xs opacity-80 mt-0.5 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Call in progress...
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
