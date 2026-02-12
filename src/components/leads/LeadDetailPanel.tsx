import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, MessageSquare, Clock, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { ExtractedPayloadDisplay } from "@/components/calls/ExtractedPayloadDisplay";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface LeadDetailPanelProps {
  lead: Lead | null;
  onClose: () => void;
  onBookAppointment?: (lead: Lead) => void;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  new: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400" },
  contacted: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
  qualified: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400" },
  booked: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
  won: { bg: "bg-success/10", text: "text-success" },
  lost: { bg: "bg-muted", text: "text-muted-foreground" },
};

const sourceLabels: Record<string, string> = {
  missed_call: "Missed Call",
  website_form: "Website",
  manual: "Manual",
  referral: "Referral",
  ai_call: "AI Call",
};

export function LeadDetailPanel({ lead, onClose, onBookAppointment }: LeadDetailPanelProps) {
  const { tenant } = useAuth();
  const { config } = useIndustryContext();

  // Fetch related call sessions by phone match
  const { data: callHistory } = useQuery({
    queryKey: ["lead_call_history", lead?.id, lead?.phone],
    queryFn: async () => {
      if (!tenant?.id || !lead?.phone) return [];
      const { data, error } = await supabase
        .from("ai_call_sessions")
        .select("id, started_at, ended_at, call_direction, outcome, summary, extracted_payload")
        .eq("tenant_id", tenant.id)
        .eq("caller_phone", lead.phone)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead && !!lead.phone && !!tenant?.id,
  });

  if (!lead) return null;

  const styles = statusStyles[lead.status] || statusStyles.new;
  const mostRecentPayload = callHistory?.[0]?.extracted_payload as Record<string, unknown> | null;

  return (
    <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{lead.full_name}</SheetTitle>
          <SheetDescription className="font-mono">
            {lead.phone || lead.email || "No contact info"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & source */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("border-0", styles.bg, styles.text)}>
              {lead.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sourceLabels[lead.source] || lead.source}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Context / notes */}
          {lead.vehicle_or_context && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Context</h3>
              <p className="text-sm">{lead.vehicle_or_context}</p>
            </div>
          )}

          {/* Extracted data from most recent call */}
          {mostRecentPayload && Object.keys(mostRecentPayload).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Latest Call Data</h3>
              <ExtractedPayloadDisplay
                payload={mostRecentPayload}
                inboxConfig={config.inbox}
              />
            </div>
          )}

          {/* Call history timeline */}
          {callHistory && callHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Call History ({callHistory.length})
              </h3>
              <div className="space-y-3">
                {callHistory.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="mt-0.5">
                      {call.call_direction === "inbound" ? (
                        <ArrowDownLeft className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">
                          {call.call_direction}
                        </span>
                        {call.outcome && (
                          <Badge variant="outline" className="text-xs">
                            {call.outcome}
                          </Badge>
                        )}
                      </div>
                      {call.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {call.summary}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(call.started_at), "MMM d")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(call.started_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            {lead.phone && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`tel:${lead.phone}`, "_self")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Back
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onBookAppointment?.(lead)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toast.info("SMS messaging coming soon")}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
