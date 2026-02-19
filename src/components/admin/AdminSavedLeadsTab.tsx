import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Phone, Trash2, Building2, Search } from "lucide-react";
import { type AdminSavedLead, useAdminUpdateSavedLead, useAdminDeleteSavedLead } from "@/hooks/useAdminLeads";
import { getTemperatureColor, getTemperatureIcon, type LeadTemperature } from "../agency/lead-finder/leadScoring";
import { LeadDetailPanel, type AgencyLead } from "../agency/lead-finder/LeadDetailPanel";
import { STATUS_LABELS } from "../agency/lead-finder/leadConstants";

const FILTER_TABS = ["all", "new", "contacted", "interested", "converted"] as const;

interface AdminSavedLeadsTabProps {
  leads: AdminSavedLead[];
  userId: string;
}

export function AdminSavedLeadsTab({ leads, userId }: AdminSavedLeadsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<AgencyLead | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminSavedLead | null>(null);
  const updateLead = useAdminUpdateSavedLead(userId);
  const deleteLead = useAdminDeleteSavedLead(userId);

  const filtered = useMemo(() => {
    let result = leads;
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        (l.industry || "").toLowerCase().includes(q) ||
        (l.address || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    leads.forEach((l) => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [leads]);

  const openDetail = (saved: AdminSavedLead) => {
    const asLead: AgencyLead = {
      name: saved.name,
      phone: saved.phone,
      website: saved.website,
      address: saved.address,
      rating: saved.rating,
      review_count: saved.review_count,
      reason: saved.reason || "",
      friction_signals: saved.friction_signals || [],
      confidence: (saved.confidence as "high" | "medium" | "low") || "medium",
      industry: saved.industry || undefined,
      employee_estimate: saved.employee_estimate,
      hours: saved.hours,
      score: saved.score != null ? {
        score: saved.score,
        temperature: (saved.temperature as LeadTemperature) || "cold",
        reasons: saved.score_reasons || [],
      } : undefined,
    };
    setSelectedLead(asLead);
    setSelectedSavedId(saved.id);
    setDetailOpen(true);
  };

  const selectedSaved = leads.find((l) => l.id === selectedSavedId);

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No saved leads yet.</p>
        <p className="text-xs mt-1">Search for leads and save the ones you want to track.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
          <TabsList className="h-8">
            {FILTER_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs px-3 h-6 capitalize">
                {t === "all" ? "All" : STATUS_LABELS[t] || t} ({counts[t] || 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {leads.length > 8 && (
          <div className="relative max-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search saved..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</div>

      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {search ? "No leads match your search." : "No leads in this category."}
          </div>
        ) : (
          filtered.map((lead) => (
            <Card key={lead.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openDetail(lead)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm truncate">{lead.name}</h3>
                      {lead.temperature && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getTemperatureColor(lead.temperature as LeadTemperature)}`}>
                          {getTemperatureIcon(lead.temperature as LeadTemperature)} {lead.score}
                        </Badge>
                      )}
                      {lead.industry && (
                        <span className="text-[10px] text-muted-foreground capitalize">{lead.industry}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {lead.phone && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="h-3 w-3" /> {lead.phone}
                        </span>
                      )}
                      {lead.address && (
                        <span className="truncate">{lead.address}</span>
                      )}
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => updateLead.mutate({ id: lead.id, status: v })}
                    >
                      <SelectTrigger className="h-7 text-xs w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(lead); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <LeadDetailPanel
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        savedLeadId={selectedSavedId}
        savedStatus={selectedSaved?.status}
        savedNotes={selectedSaved?.notes ?? undefined}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteTarget?.name}" from your saved leads?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteLead.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
