import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Calendar,
  MessageSquare,
  UserCheck,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Flame,
  Thermometer,
  Snowflake,
  Mail,
  MapPin,
  Clock,
  FileText,
  User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { ExtractedPayloadDisplay } from "@/components/calls/ExtractedPayloadDisplay";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import type { LeadTemperature } from "@/hooks/useLeadIntelligence";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface LeadDetailPanelProps {
  lead: Lead | null;
  onClose: () => void;
  onBookAppointment?: (lead: Lead) => void;
  onConvertToCustomer?: (lead: Lead) => void;
  onMarkAsLost?: (lead: Lead) => void;
  temperature?: LeadTemperature;
  temperatureReason?: string;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  contacted: { label: "Contacted", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  qualified: { label: "Qualified", cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  booked: { label: "Booked", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  won: { label: "Won", cls: "bg-success/10 text-success border-success/20" },
  lost: { label: "Lost", cls: "bg-muted text-muted-foreground border-border" },
};

const sourceLabels: Record<string, string> = {
  missed_call: "Missed Call",
  website_form: "Website Form",
  manual: "Manual Entry",
  referral: "Referral",
  ai_call: "AI Phone Call",
  walk_in: "Walk-in",
};

const tempConfig: Record<LeadTemperature, { icon: typeof Flame; label: string; cls: string; bgCls: string }> = {
  hot: { icon: Flame, label: "Hot Lead", cls: "text-red-600 dark:text-red-400", bgCls: "bg-red-500/10 border-red-500/20" },
  warm: { icon: Thermometer, label: "Warm Lead", cls: "text-amber-600 dark:text-amber-400", bgCls: "bg-amber-500/10 border-amber-500/20" },
  cold: { icon: Snowflake, label: "Cold Lead", cls: "text-sky-600 dark:text-sky-400", bgCls: "bg-sky-500/10 border-sky-500/20" },
};

function getModeLabels(mode: string) {
  const map: Record<string, { contextLabel: string; bookingLabel: string; customerLabel: string }> = {
    service: { contextLabel: "Service Needed", bookingLabel: "Book Appointment", customerLabel: "Customer" },
    dispatch: { contextLabel: "Job Request", bookingLabel: "Schedule Pickup", customerLabel: "Customer" },
    food: { contextLabel: "Order Interest", bookingLabel: "Create Order", customerLabel: "Guest" },
    medical: { contextLabel: "Visit Reason", bookingLabel: "Schedule Visit", customerLabel: "Patient" },
    sales: { contextLabel: "Interest", bookingLabel: "Schedule Meeting", customerLabel: "Prospect" },
    general: { contextLabel: "Request", bookingLabel: "Book Appointment", customerLabel: "Customer" },
  };
  return map[mode] || map.service;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export function LeadDetailPanel({
  lead,
  onClose,
  onBookAppointment,
  onConvertToCustomer,
  onMarkAsLost,
  temperature,
  temperatureReason,
}: LeadDetailPanelProps) {
  const { tenant } = useAuth();
  const { config, mode } = useIndustryContext();
  const modeLabels = getModeLabels(mode);

  const canConvert = lead ? lead.status !== "won" && lead.status !== "lost" : false;

  // Fetch related call sessions
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

  const status = statusConfig[lead.status] || statusConfig.new;
  const temp = temperature ? tempConfig[temperature] : null;
  const TempIcon = temp?.icon;
  const mostRecentPayload = callHistory?.[0]?.extracted_payload as Record<string, unknown> | null;

  return (
    <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header with temperature accent */}
        <div className={cn("px-6 pt-6 pb-4", temp?.bgCls ? temp.bgCls.split(" ")[0] : "bg-card")}>
          <SheetHeader className="text-left space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                  temp ? `${temp.bgCls}` : "bg-primary/10 text-primary"
                )}>
                  {lead.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <SheetTitle className="text-lg">{lead.full_name}</SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              {temp && TempIcon && (
                <Badge variant="outline" className={cn("gap-1 font-medium", temp.bgCls, temp.cls)}>
                  <TempIcon className="h-3 w-3" />
                  {temp.label}
                </Badge>
              )}
              <Badge variant="outline" className={cn("font-medium", status.cls)}>
                {status.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {sourceLabels[lead.source] || lead.source}
              </Badge>
            </div>

            {/* Temperature reason */}
            {temperatureReason && (
              <p className="text-xs text-muted-foreground italic">
                {temperatureReason}
              </p>
            )}
          </SheetHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Quick Actions */}
          {canConvert && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onConvertToCustomer?.(lead)}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Convert to {modeLabels.customerLabel}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onMarkAsLost?.(lead)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Lost
              </Button>
            </div>
          )}

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Contact Information
            </h3>
            <div className="divide-y divide-border/30">
              <InfoRow icon={User} label="Full Name" value={lead.full_name} />
              <InfoRow icon={Phone} label="Phone" value={lead.phone} />
              <InfoRow icon={Mail} label="Email" value={lead.email} />
            </div>
          </div>

          {/* Service Context */}
          {lead.vehicle_or_context && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {modeLabels.contextLabel}
                </h3>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                  <p className="text-sm">{lead.vehicle_or_context}</p>
                </div>
              </div>
            </>
          )}

          {/* Extracted AI Data */}
          {mostRecentPayload && Object.keys(mostRecentPayload).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  AI-Extracted Details
                </h3>
                <div className="rounded-lg border border-border/30 overflow-hidden">
                  <ExtractedPayloadDisplay
                    payload={mostRecentPayload}
                    inboxConfig={config.inbox}
                  />
                </div>
              </div>
            </>
          )}

          {/* Call History */}
          {callHistory && callHistory.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Call History ({callHistory.length})
                </h3>
                <div className="space-y-2">
                  {callHistory.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-card hover:bg-muted/30 transition-colors"
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
            </>
          )}

          {/* Bottom Actions */}
          <Separator />
          <div className="flex gap-2">
            {lead.phone && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(`tel:${lead.phone}`, "_self")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onBookAppointment?.(lead)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {modeLabels.bookingLabel}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
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
