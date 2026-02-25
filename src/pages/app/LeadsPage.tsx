import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLeadIntelligence, type EnrichedLead, type LeadTemperature } from "@/hooks/useLeadIntelligence";
import { useLeads } from "@/hooks/useLeads";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SkeletonTable, SkeletonStatCard } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { StatCard } from "@/components/layout/StatCard";
import { Toolbar } from "@/components/layout/Toolbar";
import {
  Plus, MoreHorizontal, Phone, Mail, Calendar, MessageSquare,
  Users, Flame, Thermometer, Snowflake, TrendingUp, UserCheck, UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { CreateLeadDialog } from "@/components/leads/CreateLeadDialog";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";
import { PipelineSummaryBar, type PipelineStage } from "@/components/leads/PipelineSummaryBar";
import { CreateBookingDialog } from "@/components/calendar/CreateBookingDialog";
import { SendSmsDialog } from "@/components/messaging/SendSmsDialog";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  contacted: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  qualified: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  booked: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  won: "bg-success/10 text-success",
  lost: "bg-muted text-muted-foreground",
};

const sourceLabels: Record<string, string> = {
  missed_call: "Missed Call",
  website_form: "Website",
  manual: "Manual",
  referral: "Referral",
  ai_call: "AI Call",
  walk_in: "Walk-in",
};

const temperatureConfig: Record<LeadTemperature, { icon: typeof Flame; label: string; color: string; badgeCls: string }> = {
  hot: {
    icon: Flame,
    label: "Hot",
    color: "text-red-500",
    badgeCls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  warm: {
    icon: Thermometer,
    label: "Warm",
    color: "text-amber-500",
    badgeCls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  cold: {
    icon: Snowflake,
    label: "Cold",
    color: "text-sky-500",
    badgeCls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
};

function TemperatureBadge({ temp, reason }: { temp: LeadTemperature; reason?: string }) {
  const cfg = temperatureConfig[temp];
  const Icon = cfg.icon;
  const badge = (
    <Badge variant="outline" className={cn("gap-1 font-medium", cfg.badgeCls)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
  
  if (!reason) return badge;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[200px]">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}

function getModeLabels(mode: string) {
  const map: Record<string, { leadLabel: string; leadsLabel: string; contextLabel: string; bookingLabel: string }> = {
    service: { leadLabel: "Lead", leadsLabel: "Leads", contextLabel: "Service Needed", bookingLabel: "Appointment" },
    dispatch: { leadLabel: "Caller", leadsLabel: "Callers", contextLabel: "Job Request", bookingLabel: "Pickup" },
    food: { leadLabel: "Lead", leadsLabel: "Leads", contextLabel: "Order Interest", bookingLabel: "Order" },
    medical: { leadLabel: "Patient", leadsLabel: "Patients", contextLabel: "Visit Reason", bookingLabel: "Visit" },
    sales: { leadLabel: "Prospect", leadsLabel: "Prospects", contextLabel: "Interest", bookingLabel: "Meeting" },
    general: { leadLabel: "Lead", leadsLabel: "Leads", contextLabel: "Request", bookingLabel: "Appointment" },
  };
  return map[mode] || map.service;
}

export default function LeadsPage() {
  const { data: enrichedLeads, isLoading: intelligenceLoading } = useLeadIntelligence();
  const { convertToCustomer, markAsLost } = useLeads();
  const { terms, mode } = useIndustryContext();
  const navigate = useNavigate();
  const caps = useCapabilities();
  const modeLabels = getModeLabels(mode);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tempTab, setTempTab] = useState<string>("all");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage | "all">("all");

  // Detail panel
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);

  // Dialog state
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingLeadName, setBookingLeadName] = useState("");
  const [bookingLeadPhone, setBookingLeadPhone] = useState("");
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState<{ phone: string; name: string; customerId?: string }>({ phone: "", name: "" });

  const leads = enrichedLeads ?? [];
  const isLoading = intelligenceLoading;

  // Temperature stats
  const stats = useMemo(() => {
    const hot = leads.filter((l) => l.temperature === "hot").length;
    const warm = leads.filter((l) => l.temperature === "warm").length;
    const cold = leads.filter((l) => l.temperature === "cold").length;
    return { total: leads.length, hot, warm, cold };
  }, [leads]);

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const counts: Record<PipelineStage, number> = { new: 0, contacted: 0, quoted: 0, won: 0, lost: 0 };
    for (const lead of leads) {
      const stage = lead.status as PipelineStage;
      if (stage in counts) counts[stage]++;
    }
    return counts;
  }, [leads]);

  // Filtering
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (tempTab !== "all" && lead.temperature !== tempTab) return false;
      if (pipelineStage !== "all" && lead.status !== pipelineStage) return false;
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.full_name.toLowerCase().includes(q);
        const matchesPhone = lead.phone?.includes(q);
        const matchesEmail = lead.email?.toLowerCase().includes(q);
        const matchesContext = lead.vehicle_or_context?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesContext) return false;
      }
      return true;
    });
  }, [leads, tempTab, pipelineStage, statusFilter, searchQuery]);

  const handleBookAppointment = (lead: EnrichedLead | { full_name: string; phone?: string | null }) => {
    setBookingLeadName(lead.full_name);
    setBookingLeadPhone(lead.phone || "");
    setBookingDialogOpen(true);
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title={modeLabels.leadsLabel}
        description={`Smart pipeline — ${modeLabels.leadsLabel.toLowerCase()} scored by engagement & intent`}
        action={
          <Button className="gap-2" onClick={() => setCreateLeadOpen(true)}>
            <Plus className="h-4 w-4" />
            Add {modeLabels.leadLabel}
          </Button>
        }
      />

      {/* Temperature Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label={`Total ${modeLabels.leadsLabel}`} value={stats.total} icon={Users} description="All time" />
          <StatCard label="Hot" value={stats.hot} icon={Flame} description="Ready to convert" variant="destructive" />
          <StatCard label="Warm" value={stats.warm} icon={Thermometer} description="Engaged recently" variant="warning" />
          <StatCard label="Cold" value={stats.cold} icon={Snowflake} description="Needs follow-up" />
        </div>
      )}

      {/* Pipeline Summary */}
      <div className="overflow-x-auto">
        <PipelineSummaryBar
          counts={pipelineCounts}
          activeStage={pipelineStage}
          onStageClick={(stage) => {
            setPipelineStage(stage);
            setStatusFilter("all");
          }}
        />
      </div>

      {/* Temperature Tabs + Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tempTab} onValueChange={setTempTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="hot" className="gap-1">
              <Flame className="h-3.5 w-3.5 text-red-500" />
              Hot
            </TabsTrigger>
            <TabsTrigger value="warm" className="gap-1">
              <Thermometer className="h-3.5 w-3.5 text-amber-500" />
              Warm
            </TabsTrigger>
            <TabsTrigger value="cold" className="gap-1">
              <Snowflake className="h-3.5 w-3.5 text-sky-500" />
              Cold
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1">
          <Toolbar
            searchPlaceholder={`Search ${modeLabels.leadsLabel.toLowerCase()}...`}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>

      {/* Table */}
      <SectionCard noPadding>
        {isLoading ? (
          <div className="p-6"><SkeletonTable rows={8} columns={6} /></div>
        ) : filteredLeads.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead className="hidden lg:table-cell">{modeLabels.contextLabel}</TableHead>
                <TableHead className="hidden sm:table-cell">Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                        lead.temperature === "hot" ? "bg-red-500/10 text-red-600" :
                        lead.temperature === "warm" ? "bg-amber-500/10 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {lead.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{lead.full_name}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone || "No phone"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TemperatureBadge temp={lead.temperature} reason={lead.temperatureReason} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(statusColors[lead.status])}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {sourceLabels[lead.source] || lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                    {lead.vehicle_or_context || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {lead.last_message_at
                      ? formatDistanceToNow(new Date(lead.last_message_at), { addSuffix: true })
                      : lead.latestCallAt
                        ? formatDistanceToNow(new Date(lead.latestCallAt), { addSuffix: true })
                        : formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {lead.phone && (
                          <DropdownMenuItem onClick={() => {
                            setSmsRecipient({ phone: lead.phone!, name: lead.full_name, customerId: lead.customer_id ?? undefined });
                            setSmsOpen(true);
                          }}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Send Message
                          </DropdownMenuItem>
                        )}
                        {lead.phone && (
                          <DropdownMenuItem onClick={() => window.open(`tel:${lead.phone}`, "_self")}>
                            <Phone className="mr-2 h-4 w-4" />
                            Call
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleBookAppointment(lead)}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {modeLabels.bookingLabel}
                        </DropdownMenuItem>
                        {caps.hasEstimates && (
                          <DropdownMenuItem onClick={() => navigate("/app/estimates")}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Quote
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => convertToCustomer.mutate(lead)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Convert to {terms.customer || "Customer"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => markAsLost.mutate(lead.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Mark as Lost
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Users}
            title={`No ${modeLabels.leadsLabel.toLowerCase()} found`}
            description={
              searchQuery || statusFilter !== "all" || tempTab !== "all" || pipelineStage !== "all"
                ? "Try adjusting your filters."
                : `${modeLabels.leadsLabel} will appear here when you receive calls or add them manually.`
            }
            action={
              !searchQuery && statusFilter === "all" && tempTab === "all" && pipelineStage === "all"
                ? { label: `Add Your First ${modeLabels.leadLabel}`, onClick: () => setCreateLeadOpen(true) }
                : undefined
            }
            compact
          />
        )}
      </SectionCard>

      <p className="text-xs text-muted-foreground text-center">
        {filteredLeads.length} {filteredLeads.length === 1 ? modeLabels.leadLabel.toLowerCase() : modeLabels.leadsLabel.toLowerCase()}
      </p>

      {/* Lead Detail Panel */}
      <LeadDetailPanel
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onBookAppointment={(lead) => handleBookAppointment(lead)}
        onConvertToCustomer={(lead) => convertToCustomer.mutate(lead)}
        onMarkAsLost={(lead) => markAsLost.mutate(lead.id)}
        temperature={selectedLead?.temperature}
        temperatureReason={selectedLead?.temperatureReason}
      />

      {/* Dialogs */}
      <CreateLeadDialog open={createLeadOpen} onOpenChange={setCreateLeadOpen} />
      <CreateBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        initialCustomerName={bookingLeadName}
        initialCustomerPhone={bookingLeadPhone}
      />
      <SendSmsDialog
        open={smsOpen}
        onOpenChange={setSmsOpen}
        recipientPhone={smsRecipient.phone}
        recipientName={smsRecipient.name}
        customerId={smsRecipient.customerId}
      />
    </PageContainer>
  );
}
