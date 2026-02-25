/**
 * LeadKanbanCard — Compact card for leads in the Kanban pipeline.
 * Shows customer name, phone, service requested, priority, and time.
 */

import { Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "./PriorityBadge";
import { computeCallPriority } from "@/lib/priorityScoring";
import type { PriorityConfig } from "@/config/industryBrainConfig";

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
  followup_status?: string | null;
  customer?: {
    id: string;
    full_name: string;
    phone_e164: string;
  } | null;
}

interface LeadKanbanCardProps {
  call: CallSession;
  customerName: string;
  onClick: () => void;
  priorityConfig: PriorityConfig;
}

function formatPhone(phone: string | null): string {
  if (!phone) return "Unknown";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function extractServiceRequested(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const booking = payload.booking as Record<string, unknown> | undefined;
  if (booking?.service_requested && typeof booking.service_requested === "string") {
    return booking.service_requested;
  }
  const serviceRequested = payload.service_requested;
  if (typeof serviceRequested === "string") return serviceRequested;
  return null;
}

function extractVehicleInfo(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const dispatch = payload.dispatch as Record<string, unknown> | undefined;
  if (dispatch?.vehicle_type && typeof dispatch.vehicle_type === "string") {
    return dispatch.vehicle_type;
  }
  const vehicle = payload.vehicle;
  if (typeof vehicle === "string") return vehicle;
  return null;
}

const PRIORITY_ACCENT: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-border",
};

export function LeadKanbanCard({ call, customerName, onClick, priorityConfig }: LeadKanbanCardProps) {
  const callbackRequested = !!(
    call.extracted_payload &&
    typeof call.extracted_payload === "object" &&
    (call.extracted_payload as Record<string, unknown>).callback &&
    typeof (call.extracted_payload as Record<string, unknown>).callback === "object" &&
    ((call.extracted_payload as Record<string, unknown>).callback as Record<string, unknown>)?.requested
  );

  const priority = computeCallPriority(
    { outcome: call.outcome, started_at: call.started_at, callbackRequested },
    priorityConfig,
  );

  const serviceRequested = extractServiceRequested(call.extracted_payload);
  const vehicleInfo = extractVehicleInfo(call.extracted_payload);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border border-border/40 bg-card p-3 hover:bg-muted/40 transition-all cursor-pointer group border-l-2",
        PRIORITY_ACCENT[priority.level] || "border-l-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{customerName}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {formatPhone(call.caller_phone)}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
      </div>

      {/* Service / Vehicle info */}
      {(serviceRequested || vehicleInfo) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {serviceRequested && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {serviceRequested}
            </Badge>
          )}
          {vehicleInfo && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
              {vehicleInfo}
            </Badge>
          )}
        </div>
      )}

      {/* Summary */}
      {call.summary && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{call.summary}</p>
      )}

      {/* Footer: priority + time */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <PriorityBadge level={priority.level} label={priority.label} className="text-[10px]" />
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
}
