import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Pencil, ExternalLink, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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

interface CallCardProps {
  call: CallSession;
  onEdit: () => void;
  customerName: string;
  serviceRequested: string;
}

type CallStatus = "booked" | "thinking" | "no_book" | "order" | "dispatch";

function getCallStatus(outcome: string | null): CallStatus {
  switch (outcome) {
    case "booked": return "booked";
    case "order": return "order";
    case "dispatch": return "dispatch";
    case "followup":
    case "lead_captured":
    case "info_provided":
    case "message":
      return "thinking";
    default: return "no_book";
  }
}

function getStatusBadge(status: CallStatus, outcome: string | null) {
  switch (status) {
    case "booked":
      return <Badge variant="success">Booked</Badge>;
    case "order":
      return <Badge variant="success">Order</Badge>;
    case "dispatch":
      return <Badge variant="success">Dispatch</Badge>;
    case "thinking":
      return (
        <Badge variant="warning">
          {outcome === "message" ? "Message" : outcome === "lead_captured" ? "Lead" : "Thinking"}
        </Badge>
      );
    case "no_book":
      return <Badge variant="destructive">No Book</Badge>;
  }
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

export function CallCard({ call, onEdit, customerName, serviceRequested }: CallCardProps) {
  const status = getCallStatus(call.outcome);
  const isRecent = new Date(call.started_at).getTime() > Date.now() - 3600000; // Within 1 hour

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-success/15 flex items-center justify-center shrink-0">
              <Phone className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{customerName}</span>
                {call.customer_id && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {formatPhone(call.caller_phone)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {getStatusBadge(status, call.outcome)}
            <span className="text-xs text-muted-foreground">
              {isRecent 
                ? formatDistanceToNow(new Date(call.started_at), { addSuffix: true })
                : format(new Date(call.started_at), "MMM d, h:mm a")}
            </span>
          </div>
        </div>

        {/* Service Requested */}
        {serviceRequested && (
          <p className="text-sm text-muted-foreground mb-2">
            <span className="font-medium text-foreground">Requested:</span> {serviceRequested}
          </p>
        )}

        {/* Summary */}
        <div className="mb-3">
          {call.summary ? (
            <p className="text-sm line-clamp-2">{call.summary}</p>
          ) : call.ended_at ? (
            <p className="text-sm text-muted-foreground italic flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing...
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Awaiting AI summary...
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit Details
          </Button>
          {call.caller_phone && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              onClick={() => window.open(`tel:${call.caller_phone}`, '_self')}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call Back
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
