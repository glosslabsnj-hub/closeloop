import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, Settings, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadRecoveryCampaigns, type CampaignStatus, type CampaignWithDetails } from "@/hooks/useLeadRecoveryCampaigns";
import { RecoveryCampaignCard } from "@/components/recovery/RecoveryCampaignCard";
import { RecoveryEmptyState } from "@/components/recovery/RecoveryEmptyState";
import { SendSmsModal } from "@/components/recovery/SendSmsModal";
import { MarkConvertedModal } from "@/components/recovery/MarkConvertedModal";
import { cn } from "@/lib/utils";

export default function LeadRecoveryPage() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const tenantId = tenant?.id || "";

  const [statusFilter, setStatusFilter] = useState<CampaignStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithDetails | null>(null);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  const { data, isLoading, refetch } = useLeadRecoveryCampaigns({
    status: statusFilter,
    search: search || undefined,
  });

  const campaigns = data?.campaigns || [];
  const counts = data?.counts || { all: 0, active: 0, paused: 0, converted: 0, stopped: 0, declined: 0 };

  // Check if recovery is enabled (has any campaigns or settings indicate enabled)
  const isEnabled = counts.all > 0;

  const tabs = [
    { value: "all" as CampaignStatus, label: "All", count: counts.all },
    { value: "active" as CampaignStatus, label: "Active", count: counts.active },
    { value: "paused" as CampaignStatus, label: "Needs Response", count: counts.paused, highlight: counts.paused > 0 },
    { value: "converted" as CampaignStatus, label: "Converted", count: counts.converted },
    { value: "stopped" as CampaignStatus, label: "Stopped", count: counts.stopped + counts.declined },
  ];

  // Actions
  const handleCall = (campaign: CampaignWithDetails) => {
    if (campaign.customer?.phone_e164) {
      window.location.href = `tel:${campaign.customer.phone_e164}`;
    }
  };

  const handleSMS = (campaign: CampaignWithDetails) => {
    setSelectedCampaign(campaign);
    setSmsModalOpen(true);
  };

  const handleMarkConverted = (campaign: CampaignWithDetails) => {
    setSelectedCampaign(campaign);
    setConvertModalOpen(true);
  };

  const handleResume = async (campaign: CampaignWithDetails) => {
    try {
      const nextActionAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          status: "active",
          next_action_at: nextActionAt,
        })
        .eq("id", campaign.id);

      toast.success("Recovery resumed");
      refetch();
    } catch (error) {
      console.error("Error resuming campaign:", error);
      toast.error("Failed to resume campaign");
    }
  };

  const handleStop = async (campaign: CampaignWithDetails) => {
    try {
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          status: "stopped",
          stopped_at: new Date().toISOString(),
          stopped_reason: "Manually stopped by user",
        })
        .eq("id", campaign.id);

      toast.success("Recovery stopped");
      refetch();
    } catch (error) {
      console.error("Error stopping campaign:", error);
      toast.error("Failed to stop campaign");
    }
  };

  const handleViewDetails = (campaign: CampaignWithDetails) => {
    // For now, just show a toast. Can expand to a detail modal/page later
    toast.info(`Campaign details for ${campaign.customer?.full_name || "Unknown"}`);
  };

  const handleViewBooking = (bookingId: string) => {
    navigate(`/app/bookings?id=${bookingId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lead Recovery</h1>
          <p className="text-muted-foreground mt-1">
            Automatically follow up with leads who didn't book
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/app/settings")}>
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Status tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as CampaignStatus)}>
          <TabsList className="h-auto p-1 flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "gap-2 data-[state=active]:bg-background",
                  tab.highlight && "relative"
                )}
              >
                {tab.label}
                <Badge 
                  variant={tab.highlight ? "destructive" : "secondary"} 
                  className={cn(
                    "h-5 min-w-5 px-1.5 text-xs",
                    tab.highlight && "animate-pulse"
                  )}
                >
                  {tab.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <RecoveryEmptyState status={statusFilter} isEnabled={isEnabled} />
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <RecoveryCampaignCard
              key={campaign.id}
              campaign={campaign}
              onCall={handleCall}
              onSMS={handleSMS}
              onMarkConverted={handleMarkConverted}
              onResume={handleResume}
              onStop={handleStop}
              onViewDetails={handleViewDetails}
              onViewBooking={handleViewBooking}
            />
          ))}

          {/* Load more placeholder */}
          {campaigns.length >= 20 && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => toast.info("Pagination coming soon")}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SendSmsModal
        open={smsModalOpen}
        onOpenChange={setSmsModalOpen}
        campaign={selectedCampaign}
        tenantId={tenantId}
        onSuccess={() => refetch()}
      />

      <MarkConvertedModal
        open={convertModalOpen}
        onOpenChange={setConvertModalOpen}
        campaign={selectedCampaign}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
