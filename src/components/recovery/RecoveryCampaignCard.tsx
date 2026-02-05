import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Phone, 
  MessageSquare, 
  Play, 
  StopCircle,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CampaignWithDetails } from "@/hooks/useLeadRecoveryCampaigns";

interface RecoveryCampaignCardProps {
  campaign: CampaignWithDetails;
  onCall: (campaign: CampaignWithDetails) => void;
  onSMS: (campaign: CampaignWithDetails) => void;
  onMarkConverted: (campaign: CampaignWithDetails) => void;
  onResume: (campaign: CampaignWithDetails) => void;
  onStop: (campaign: CampaignWithDetails) => void;
  onViewDetails: (campaign: CampaignWithDetails) => void;
  onViewBooking?: (bookingId: string) => void;
}

const statusConfig = {
  active: { 
    icon: RefreshCw, 
    color: "text-primary", 
    bgColor: "bg-primary/10",
    label: "ACTIVE" 
  },
  paused: { 
    icon: Clock, 
    color: "text-warning", 
    bgColor: "bg-warning/10",
    label: "NEEDS RESPONSE" 
  },
  converted: { 
    icon: CheckCircle, 
    color: "text-success", 
    bgColor: "bg-success/10",
    label: "CONVERTED" 
  },
  stopped: { 
    icon: XCircle, 
    color: "text-muted-foreground", 
    bgColor: "bg-muted",
    label: "STOPPED" 
  },
  expired: { 
    icon: XCircle, 
    color: "text-muted-foreground", 
    bgColor: "bg-muted",
    label: "EXPIRED" 
  },
  declined: { 
    icon: XCircle, 
    color: "text-destructive", 
    bgColor: "bg-destructive/10",
    label: "DECLINED" 
  },
};

function formatPhone(phone: string): string {
  if (!phone) return "";
  // Simple US phone formatting
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatCurrency(cents: number | null): string {
  if (cents === null || cents === undefined) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function RecoveryCampaignCard({
  campaign,
  onCall,
  onSMS,
  onMarkConverted,
  onResume,
  onStop,
  onViewDetails,
  onViewBooking,
}: RecoveryCampaignCardProps) {
  const config = statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.stopped;
  const StatusIcon = config.icon;

  const customerName = campaign.customer?.full_name || "Unknown Customer";
  const customerPhone = campaign.customer?.phone_e164 || "";

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            <StatusIcon className={cn("w-4 h-4", config.color)} />
          </div>
          <div>
            <h3 className="font-medium">{customerName}</h3>
            <p className="text-sm text-muted-foreground">{formatPhone(customerPhone)}</p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant="outline" className={cn(config.color, "border-current")}>
            {config.label}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mb-3 text-sm space-y-1">
        {(campaign.original_service_interest || campaign.original_intent) && (
          <p>
            <span className="text-muted-foreground">Interested in:</span>{" "}
            {campaign.original_service_interest || campaign.original_intent}
          </p>
        )}
        {campaign.original_objection && (
          <p className="text-muted-foreground italic">"{campaign.original_objection}"</p>
        )}
      </div>

      {/* Status-specific content */}
      {campaign.status === "active" && (
        <div className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Step {campaign.current_step} · 
          {campaign.next_action_at ? (
            <span>Next action {formatDistanceToNow(new Date(campaign.next_action_at), { addSuffix: true })}</span>
          ) : (
            <span>Scheduled</span>
          )}
        </div>
      )}

      {campaign.status === "paused" && campaign.last_action?.response_content && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm mb-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-warning">Customer Response:</p>
              <p className="text-foreground">"{campaign.last_action.response_content}"</p>
            </div>
          </div>
        </div>
      )}

      {campaign.status === "converted" && (
        <div className="text-sm text-success mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>
            Recovered: {formatCurrency(campaign.recovered_value_cents)} · 
            After {campaign.total_attempts} follow-up{campaign.total_attempts !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {(campaign.status === "declined" || campaign.status === "stopped") && campaign.stopped_reason && (
        <div className="text-sm text-muted-foreground mb-3 italic">
          {campaign.stopped_reason}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t flex-wrap">
        {campaign.status !== "converted" && campaign.status !== "declined" && (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onCall(campaign)}
              className="gap-1"
            >
              <Phone className="w-4 h-4" /> Call
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onSMS(campaign)}
              className="gap-1"
            >
              <MessageSquare className="w-4 h-4" /> SMS
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onMarkConverted(campaign)}
              className="gap-1"
            >
              <CheckCircle className="w-4 h-4" /> Converted
            </Button>
          </>
        )}

        {campaign.status === "paused" && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onResume(campaign)}
            className="gap-1"
          >
            <Play className="w-4 h-4" /> Resume
          </Button>
        )}

        {campaign.status === "active" && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onStop(campaign)}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <StopCircle className="w-4 h-4" /> Stop
          </Button>
        )}

        {campaign.status === "converted" && campaign.converted_booking_id && onViewBooking && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onViewBooking(campaign.converted_booking_id!)}
            className="gap-1"
          >
            View Booking
          </Button>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onViewDetails(campaign)}
          className="ml-auto gap-1"
        >
          Details <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
