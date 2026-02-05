import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  Play,
  FileText,
  CheckCircle,
  PauseCircle,
  StopCircle,
  RefreshCw,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useCampaignDetail, type SequenceStep } from "@/hooks/useCampaignDetail";
import { RecoveryTimeline } from "./RecoveryTimeline";
import { NotesSection } from "./NotesSection";
import { MarkConvertedModal } from "./MarkConvertedModal";
import { SendSmsModal } from "./SendSmsModal";
import type { CampaignWithDetails } from "@/hooks/useLeadRecoveryCampaigns";

interface LeadRecoveryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  tenantId: string;
  onCampaignUpdated?: () => void;
}

const statusConfig = {
  active: { icon: RefreshCw, color: "text-primary", label: "ACTIVE" },
  paused: { icon: Clock, color: "text-warning", label: "PAUSED" },
  converted: { icon: CheckCircle, color: "text-success", label: "CONVERTED" },
  stopped: { icon: XCircle, color: "text-muted-foreground", label: "STOPPED" },
  declined: { icon: XCircle, color: "text-destructive", label: "DECLINED" },
  expired: { icon: Clock, color: "text-muted-foreground", label: "EXPIRED" },
};

function formatPhone(phone: string): string {
  if (!phone) return "";
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

export function LeadRecoveryDetailSheet({
  open,
  onOpenChange,
  campaignId,
  tenantId,
  onCampaignUpdated,
}: LeadRecoveryDetailSheetProps) {
  const { data: campaign, isLoading, refetch } = useCampaignDetail(campaignId);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);

  const handleCall = () => {
    if (campaign?.customer?.phone_e164) {
      window.location.href = `tel:${campaign.customer.phone_e164}`;
    }
  };

  const handleEmail = () => {
    if (campaign?.customer?.email) {
      window.location.href = `mailto:${campaign.customer.email}`;
    }
  };

  const handlePause = async () => {
    if (!campaign) return;
    try {
      await supabase
        .from("lead_recovery_campaigns")
        .update({ status: "paused" })
        .eq("id", campaign.id);
      toast.success("Recovery paused");
      refetch();
      onCampaignUpdated?.();
    } catch (error) {
      toast.error("Failed to pause recovery");
    }
  };

  const handleResume = async () => {
    if (!campaign) return;
    try {
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          status: "active",
          next_action_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq("id", campaign.id);
      toast.success("Recovery resumed");
      refetch();
      onCampaignUpdated?.();
    } catch (error) {
      toast.error("Failed to resume recovery");
    }
  };

  const handleStop = async () => {
    if (!campaign) return;
    try {
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          status: "stopped",
          stopped_at: new Date().toISOString(),
          stopped_reason: "Manually stopped",
        })
        .eq("id", campaign.id);
      toast.success("Recovery stopped");
      refetch();
      onCampaignUpdated?.();
    } catch (error) {
      toast.error("Failed to stop recovery");
    }
  };

  const handleSendNow = async (step: SequenceStep) => {
    toast.info(`Sending ${step.action_type} now...`);
    // TODO: Implement immediate send via edge function
  };

  const handleSkipStep = async (step: SequenceStep) => {
    if (!campaign) return;
    try {
      // Advance to next step
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          current_step: campaign.current_step + 1,
        })
        .eq("id", campaign.id);
      toast.success("Step skipped");
      refetch();
    } catch (error) {
      toast.error("Failed to skip step");
    }
  };

  const config = campaign ? statusConfig[campaign.status as keyof typeof statusConfig] || statusConfig.stopped : statusConfig.active;
  const StatusIcon = config.icon;

  // Map campaign detail to CampaignWithDetails for modals
  const campaignForModal: CampaignWithDetails | null = campaign ? {
    ...campaign,
    last_action: campaign.actions[campaign.actions.length - 1] || null,
  } : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="p-4 pb-0 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <SheetTitle className="flex-1">
                {isLoading ? (
                  <Skeleton className="h-6 w-40" />
                ) : (
                  campaign?.customer?.full_name || "Campaign Details"
                )}
              </SheetTitle>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : campaign ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Contact info */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{formatPhone(campaign.customer?.phone_e164 || "")}</p>
                      {campaign.customer?.email && (
                        <p className="text-sm text-muted-foreground">{campaign.customer.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCall}>
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSmsModalOpen(true)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      {campaign.customer?.email && (
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleEmail}>
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status summary */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn("w-4 h-4", config.color)} />
                    <Badge variant="outline" className={cn(config.color, "border-current")}>
                      {config.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      · Step {campaign.current_step} of {campaign.allSteps.length}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      · Started {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {campaign.sequence && (
                    <p className="text-sm text-muted-foreground">
                      Sequence: {campaign.sequence.name}
                    </p>
                  )}
                </div>

                {/* Original call info */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Original Call
                  </h3>
                  <div className="space-y-3">
                    {campaign.original_call ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(campaign.original_call.started_at), "MMMM d, yyyy 'at' h:mm a")}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(campaign.created_at), "MMMM d, yyyy 'at' h:mm a")}
                      </div>
                    )}

                    {campaign.original_service_interest && (
                      <div>
                        <span className="text-sm text-muted-foreground">Interest: </span>
                        <span className="text-sm font-medium">{campaign.original_service_interest}</span>
                      </div>
                    )}

                    {campaign.original_objection && (
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm italic">"{campaign.original_objection}"</p>
                      </div>
                    )}

                    {campaign.original_call && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1" disabled>
                          <Play className="w-3 h-3" /> Listen to Recording
                        </Button>
                        {campaign.original_call.transcript && (
                          <Button variant="outline" size="sm" className="gap-1" disabled>
                            <FileText className="w-3 h-3" /> View Transcript
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Recovery Timeline */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Recovery Timeline
                  </h3>
                  <RecoveryTimeline
                    campaign={campaign}
                    onSendNow={handleSendNow}
                    onSkipStep={handleSkipStep}
                  />
                </div>

                <Separator />

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Notes
                  </h3>
                  <NotesSection
                    campaignId={campaign.id}
                    existingNotes={campaign.notes}
                    onNotesUpdated={() => refetch()}
                  />
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              Campaign not found
            </div>
          )}

          {/* Footer actions */}
          {campaign && (
            <div className="p-4 border-t bg-background flex-shrink-0">
              {campaign.status === "converted" ? (
                <div className="flex items-center gap-3 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Converted!</p>
                    <p className="text-sm text-muted-foreground">
                      Recovered {formatCurrency(campaign.recovered_value_cents)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button 
                    className="flex-1 gap-1" 
                    onClick={() => setConvertModalOpen(true)}
                  >
                    <CheckCircle className="w-4 h-4" /> Mark Converted
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {campaign.status === "active" && (
                      <Button variant="outline" size="icon" onClick={handlePause}>
                        <PauseCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button variant="outline" size="icon" onClick={handleResume}>
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    {(campaign.status === "active" || campaign.status === "paused") && (
                      <Button variant="outline" size="icon" className="text-destructive" onClick={handleStop}>
                        <StopCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Modals */}
      <MarkConvertedModal
        open={convertModalOpen}
        onOpenChange={setConvertModalOpen}
        campaign={campaignForModal}
        onSuccess={() => {
          refetch();
          onCampaignUpdated?.();
          onOpenChange(false);
        }}
      />

      <SendSmsModal
        open={smsModalOpen}
        onOpenChange={setSmsModalOpen}
        campaign={campaignForModal}
        tenantId={tenantId}
        onSuccess={() => refetch()}
      />
    </>
  );
}
