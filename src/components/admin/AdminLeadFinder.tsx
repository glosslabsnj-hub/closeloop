import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Globe, Phone, Star, ExternalLink, Loader2, MapPin, Bookmark, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { scoreAgencyLead, getTemperatureColor, getTemperatureIcon, type LeadTemperature } from "../agency/lead-finder/leadScoring";
import { LeadDetailPanel, type AgencyLead } from "../agency/lead-finder/LeadDetailPanel";
import { SIGNAL_LABELS } from "../agency/lead-finder/leadConstants";
import {
  useAdminSavedLeads, useAdminSaveLead, useAdminSaveLeadsBatch,
} from "@/hooks/useAdminLeads";
import { AdminSavedLeadsTab } from "./AdminSavedLeadsTab";

const INDUSTRY_OPTIONS = [
  { value: "all", label: "All Industries (Top 10)" },
  { value: "towing", label: "Towing" },
  { value: "plumber", label: "Plumber" },
  { value: "hvac", label: "HVAC" },
  { value: "electrician", label: "Electrician" },
  { value: "locksmith", label: "Locksmith" },
  { value: "auto repair", label: "Auto Repair" },
  { value: "dental", label: "Dental" },
  { value: "med spa", label: "Med Spa" },
  { value: "salon", label: "Salon / Barbershop" },
  { value: "pest control", label: "Pest Control" },
  { value: "landscaping", label: "Landscaping" },
  { value: "roofing", label: "Roofing" },
  { value: "mobile detailing", label: "Mobile Detailing" },
  { value: "cleaning service", label: "Cleaning Service" },
  { value: "restaurant", label: "Restaurant" },
  { value: "veterinary", label: "Veterinary" },
  { value: "real estate", label: "Real Estate" },
  { value: "insurance agency", label: "Insurance Agency" },
  { value: "law firm", label: "Law Firm" },
  { value: "fitness studio", label: "Fitness Studio" },
];

export function AdminLeadFinder() {
  const { user } = useAuth();
  const userId = user?.id;
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [leads, setLeads] = useState<AgencyLead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLead, setSelectedLead] = useState<AgencyLead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState<"all" | LeadTemperature>("all");
  const [mainTab, setMainTab] = useState("search");

  const savedLeads = useAdminSavedLeads(userId);
  const saveLead = useAdminSaveLead(userId);
  const saveLeadsBatch = useAdminSaveLeadsBatch(userId);

  const savedNames = useMemo(() => {
    const set = new Set<string>();
    (savedLeads.data ?? []).forEach((l) => set.add(l.name.toLowerCase().trim()));
    return set;
  }, [savedLeads.data]);

  const isLeadSaved = (name: string) => savedNames.has(name.toLowerCase().trim());

  const handleSearch = async () => {
    if (!industry || !location) {
      toast.error("Select an industry and enter a location");
      return;
    }

    setIsSearching(true);
    setLeads([]);
    setTempFilter("all");

    try {
      const { data, error } = await supabase.functions.invoke("admin-lead-search", {
        body: { industry, location, count: 50 },
      });
      if (error) throw error;

      const rawLeads: AgencyLead[] = (data.leads || []).map((l: any) => ({
        ...l,
        industry: l.industry || industry,
        score: scoreAgencyLead({
          friction_signals: l.friction_signals,
          rating: l.rating,
          review_count: l.review_count,
          phone: l.phone,
          website: l.website,
          industry: l.industry || industry,
        }),
      }));

      rawLeads.sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0));
      setLeads(rawLeads);
      setHasSearched(true);

      if (rawLeads.length === 0) {
        toast.info("No leads found. Try a different location or industry.");
      } else {
        toast.success(`Found ${rawLeads.length} leads`);
      }
    } catch (err) {
      console.error("Lead search failed:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const filteredLeads = useMemo(() => {
    if (tempFilter === "all") return leads;
    return leads.filter((l) => l.score?.temperature === tempFilter);
  }, [leads, tempFilter]);

  const tempCounts = useMemo(() => {
    const counts = { hot: 0, warm: 0, cold: 0 };
    leads.forEach((l) => {
      if (l.score?.temperature) counts[l.score.temperature]++;
    });
    return counts;
  }, [leads]);

  const openDetail = (lead: AgencyLead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const buildSavePayload = (lead: AgencyLead) => ({
    name: lead.name,
    phone: lead.phone,
    website: lead.website,
    address: lead.address,
    industry: lead.industry || null,
    rating: lead.rating,
    review_count: lead.review_count,
    employee_estimate: lead.employee_estimate || null,
    hours: lead.hours || null,
    reason: lead.reason,
    friction_signals: lead.friction_signals || [],
    confidence: lead.confidence,
    score: lead.score?.score ?? null,
    temperature: lead.score?.temperature ?? null,
    score_reasons: lead.score?.reasons ?? [],
  });

  const handleSaveAll = () => {
    const unsaved = filteredLeads.filter((l) => !isLeadSaved(l.name));
    if (unsaved.length === 0) {
      toast.info("All leads are already saved");
      return;
    }
    saveLeadsBatch.mutate(unsaved.map(buildSavePayload));
  };

  const handleSaveSingle = (lead: AgencyLead) => {
    saveLead.mutate(buildSavePayload(lead), {
      onSuccess: () => toast.success(`"${lead.name}" saved`),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Business Lead Finder</h2>
          <p className="text-sm text-muted-foreground">
            Find local businesses that need an AI receptionist. No daily search limit.
          </p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="h-9">
          <TabsTrigger value="search" className="text-xs px-4">Search</TabsTrigger>
          <TabsTrigger value="saved" className="text-xs px-4">
            Saved Leads {savedLeads.data?.length ? `(${savedLeads.data.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block">Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block">Location</Label>
              <Input
                placeholder="e.g. Austin, TX"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={isSearching || !industry || !location}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isSearching ? "Searching..." : "Find Leads"}
              </Button>
            </div>
          </div>

          {isSearching && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              <p>Searching for {industry === "all" ? "businesses across industries" : `${industry} businesses`} in {location}...</p>
              <p className="text-xs mt-1">This may take a moment as we search multiple sources.</p>
            </div>
          )}

          {!isSearching && leads.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Tabs value={tempFilter} onValueChange={(v) => setTempFilter(v as "all" | LeadTemperature)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-3 h-6">All ({leads.length})</TabsTrigger>
                    <TabsTrigger value="hot" className="text-xs px-3 h-6">Hot ({tempCounts.hot})</TabsTrigger>
                    <TabsTrigger value="warm" className="text-xs px-3 h-6">Warm ({tempCounts.warm})</TabsTrigger>
                    <TabsTrigger value="cold" className="text-xs px-3 h-6">Cold ({tempCounts.cold})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{filteredLeads.length} leads</span>
                  <Button size="sm" variant="outline" onClick={handleSaveAll} disabled={saveLeadsBatch.isPending}>
                    <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                    Save All
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {filteredLeads.map((lead) => {
                  const saved = isLeadSaved(lead.name);
                  const key = `${lead.name}-${lead.address || lead.phone || ""}`;
                  return (
                    <Card
                      key={key}
                      className="cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => openDetail(lead)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-sm truncate">{lead.name}</h3>
                              {lead.score && (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getTemperatureColor(lead.score.temperature)}`}>
                                  {getTemperatureIcon(lead.score.temperature)} {lead.score.temperature} {lead.score.score}
                                </Badge>
                              )}
                              {saved && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-700 border-green-500/20">
                                  <Check className="h-2.5 w-2.5 mr-0.5" /> Saved
                                </Badge>
                              )}
                              {lead.industry && (
                                <span className="text-[10px] text-muted-foreground capitalize">{lead.industry}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.reason}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                              {lead.rating != null && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {lead.rating}
                                  {lead.review_count != null && <span>({lead.review_count})</span>}
                                </span>
                              )}
                              {lead.phone && (
                                <span className="flex items-center gap-0.5">
                                  <Phone className="h-3 w-3" />{lead.phone}
                                </span>
                              )}
                              {lead.address && (
                                <span className="flex items-center gap-0.5 truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{lead.address}</span>
                                </span>
                              )}
                              {lead.website && (
                                <span className="flex items-center gap-0.5">
                                  <Globe className="h-3 w-3" /><ExternalLink className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="hidden sm:flex flex-wrap gap-1 max-w-[180px] justify-end">
                              {lead.friction_signals?.slice(0, 3).map((signal) => (
                                <Badge key={signal} variant="secondary" className="text-[9px] px-1 py-0 whitespace-nowrap">
                                  {SIGNAL_LABELS[signal] || signal}
                                </Badge>
                              ))}
                            </div>
                            {!saved && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={(e) => { e.stopPropagation(); handleSaveSingle(lead); }}
                              >
                                <Bookmark className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {!isSearching && hasSearched && leads.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No leads found. Try adjusting the industry or location.
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          {userId && <AdminSavedLeadsTab leads={savedLeads.data ?? []} userId={userId} />}
        </TabsContent>
      </Tabs>

      <LeadDetailPanel
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isSaved={selectedLead ? isLeadSaved(selectedLead.name) : false}
        onSave={selectedLead && !isLeadSaved(selectedLead.name) ? () => handleSaveSingle(selectedLead) : undefined}
        savingInProgress={saveLead.isPending}
      />
    </div>
  );
}
