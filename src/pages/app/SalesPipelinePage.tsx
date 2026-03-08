import { useState, useMemo } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DollarSign, Search, Loader2, User, Phone, Clock, Mail, Car, Calendar, Tag, PhoneCall, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSalesLeads } from "@/hooks/useSalesLeads";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const ALL_PIPELINE_COLUMNS = [
  { key: "new", label: "New", color: "bg-blue-500", dealerOnly: false },
  { key: "contacted", label: "Contacted", color: "bg-yellow-500", dealerOnly: false },
  { key: "qualified", label: "Qualified", color: "bg-purple-500", dealerOnly: false },
  { key: "appointment_set", label: "Appointment", color: "bg-indigo-500", dealerOnly: false },
  { key: "test_drive", label: "Test Drive", color: "bg-cyan-500", dealerOnly: true },
  { key: "negotiation", label: "Negotiation", color: "bg-orange-500", dealerOnly: false },
  { key: "sold", label: "Sold", color: "bg-green-500", dealerOnly: false },
  { key: "lost", label: "Lost", color: "bg-gray-500", dealerOnly: false },
] as const;

const CAR_DEALERSHIP_SLUGS = new Set([
  "car-dealership-new",
  "car-dealership-used",
  "car-dealership-full",
  "rv-dealer",
  "boat-dealer",
  "motorcycle-dealer",
  "equipment-sales",
]);

const priorityColors: Record<string, string> = {
  hot: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  normal: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function SalesPipelinePage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["sales_leads"]);
  const { leads, isLoading, stats, updateLead } = useSalesLeads();
  const { industrySlug } = useTenantConfig();
  const navigate = useNavigate();
  const isCarDealership = industrySlug ? CAR_DEALERSHIP_SLUGS.has(industrySlug) : false;
  const PIPELINE_COLUMNS = ALL_PIPELINE_COLUMNS.filter((c) => !c.dealerOnly || isCarDealership);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<(typeof leads)[number] | null>(null);

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (l) =>
        l.customer?.full_name?.toLowerCase().includes(q) ||
        l.vehicle_interest?.toLowerCase().includes(q) ||
        l.lead_number?.toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  const leadsByStatus = useMemo(() => {
    const grouped: Record<string, typeof leads> = {};
    for (const col of PIPELINE_COLUMNS) {
      grouped[col.key] = filteredLeads.filter((l) => l.status === col.key);
    }
    return grouped;
  }, [filteredLeads]);

  if (moduleLoading || !isAllowed || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading your sales pipeline">
    <PageContainer maxWidth="full">
      <div className="space-y-6">
        <PageHeader
          title="Sales Pipeline"
          description={`${stats.total} leads total — ${stats.hot} hot, ${stats.new} new`}
        />

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {leads.length === 0 ? (
          <EmptyState
            icon={PhoneCall}
            title="No leads in your pipeline yet"
            description={isCarDealership
              ? "When your AI answers a call and qualifies a prospect, they'll appear here. Each caller becomes a lead you can move through New → Contacted → Test Drive → Sold."
              : "When your AI answers a call and qualifies a prospect, they'll appear here. Move leads through your pipeline stages as you follow up."}
            action={{
              label: "View Call History",
              icon: PhoneCall,
              onClick: () => navigate("/app/calls"),
            }}
          />
        ) : (
          /* Kanban board */
          <>
          {/* Mobile scroll hint */}
          <p className="md:hidden text-xs text-muted-foreground flex items-center gap-1">
            <span>Swipe</span>
            <ArrowRight className="h-3 w-3" />
            <span>to see all stages</span>
          </p>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {PIPELINE_COLUMNS.map((col) => (
                <div key={col.key} className="w-72 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={cn("w-2 h-2 rounded-full", col.color)} />
                    <span className="text-sm font-medium">{col.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {leadsByStatus[col.key]?.length || 0}
                    </Badge>
                  </div>

                  <div className="space-y-2 min-h-[200px]">
                    {leadsByStatus[col.key]?.map((lead) => (
                      <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedLead(lead)}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium truncate">
                                {lead.customer?.full_name || "Unknown"}
                              </span>
                            </div>
                            <Badge className={cn("text-[10px] px-1.5", priorityColors[lead.priority])}>
                              {lead.priority}
                            </Badge>
                          </div>

                          {lead.vehicle_interest && (
                            <p className="text-xs text-muted-foreground truncate">
                              {lead.vehicle_interest}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {lead.customer?.phone_e164 && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.customer.phone_e164}
                              </span>
                            )}
                            {lead.timeline && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lead.timeline.replace("_", " ")}
                              </span>
                            )}
                          </div>

                          {/* Status dropdown */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={lead.status}
                              onValueChange={(newStatus) =>
                                updateLead.mutate({ id: lead.id, status: newStatus })
                              }
                            >
                              <SelectTrigger className="h-7 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PIPELINE_COLUMNS.map((s) => (
                                  <SelectItem key={s.key} value={s.key}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {lead.lead_number && (
                            <p className="text-[10px] text-muted-foreground">{lead.lead_number}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedLead?.customer?.full_name || "Unknown Lead"}
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={cn("text-xs", priorityColors[selectedLead.priority])}>
                  {selectedLead.priority} priority
                </Badge>
                {selectedLead.lead_number && (
                  <span className="text-xs text-muted-foreground">{selectedLead.lead_number}</span>
                )}
              </div>

              <div className="space-y-3 text-sm">
                {selectedLead.customer?.phone_e164 && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.customer.phone_e164}</span>
                  </div>
                )}
                {selectedLead.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.customer.email}</span>
                  </div>
                )}
                {selectedLead.vehicle_interest && (
                  <div className="flex items-center gap-2">
                    {isCarDealership
                      ? <Car className="h-4 w-4 text-muted-foreground" />
                      : <Tag className="h-4 w-4 text-muted-foreground" />}
                    <span>{selectedLead.vehicle_interest}</span>
                  </div>
                )}
                {selectedLead.budget_range && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Budget: {selectedLead.budget_range}</span>
                  </div>
                )}
                {selectedLead.timeline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Timeline: {selectedLead.timeline.replace("_", " ")}</span>
                  </div>
                )}
                {selectedLead.assigned_sales_rep && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Rep: {selectedLead.assigned_sales_rep}</span>
                  </div>
                )}
                {selectedLead.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{selectedLead.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Move to Stage
                </label>
                <Select
                  value={selectedLead.status}
                  onValueChange={(newStatus) => {
                    updateLead.mutate({ id: selectedLead.id, status: newStatus });
                    setSelectedLead({ ...selectedLead, status: newStatus });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_COLUMNS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
    </ErrorBoundary>
  );
}
