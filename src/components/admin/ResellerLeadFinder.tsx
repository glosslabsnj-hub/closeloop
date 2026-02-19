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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Globe, Phone, Star, Loader2, MapPin, Bookmark, Check, Trash2, Handshake, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  scoreResellerLead,
  getResellerTemperatureColor,
  getResellerTemperatureIcon,
  type ResellerTemperature,
} from "./reseller-finder/resellerScoring";
import { RESELLER_INDUSTRIES, PARTNERSHIP_SIGNAL_LABELS, RESELLER_STATUS_LABELS } from "./reseller-finder/resellerConstants";
import {
  useAdminResellerSavedLeads,
  useAdminSaveResellerLead,
  useAdminSaveResellerLeadsBatch,
  useAdminUpdateResellerLead,
  useAdminDeleteResellerLead,
  type AdminResellerLead,
} from "@/hooks/useAdminResellerLeads";
import { useEnrollLeads, useOutreachCampaigns } from "@/hooks/useAdminOutreach";

interface ResellerResult {
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  company_type: string;
  services_offered: string[];
  partnership_signals: string[];
  client_base_size: string | null;
  rating: number | null;
  review_count: number | null;
  employee_estimate: string | null;
  reason: string;
  confidence: "high" | "medium" | "low";
  score?: { temperature: ResellerTemperature; score: number; reasons: string[] };
}

export function ResellerLeadFinder() {
  const { user } = useAuth();
  const userId = user?.id;
  const [companyType, setCompanyType] = useState("");
  const [location, setLocation] = useState("");
  const [leads, setLeads] = useState<ResellerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [tempFilter, setTempFilter] = useState<"all" | ResellerTemperature>("all");
  const [mainTab, setMainTab] = useState("search");
  const [deleteTarget, setDeleteTarget] = useState<AdminResellerLead | null>(null);

  const savedLeads = useAdminResellerSavedLeads(userId);
  const saveLead = useAdminSaveResellerLead(userId);
  const saveLeadsBatch = useAdminSaveResellerLeadsBatch(userId);
  const updateLead = useAdminUpdateResellerLead(userId);
  const deleteLead = useAdminDeleteResellerLead(userId);
  const enrollLeads = useEnrollLeads();
  const { data: campaigns } = useOutreachCampaigns();
  const defaultResellerCampaign = (campaigns ?? []).find((c) => c.target_type === "reseller" && c.status === "active");

  const handleStartOutreach = (lead: AdminResellerLead) => {
    if (!defaultResellerCampaign) { toast.error("No active reseller campaign. Create one in Growth Engine."); return; }
    enrollLeads.mutate({
      campaign_id: defaultResellerCampaign.id,
      leads: [{ lead_id: lead.id, lead_type: "reseller", lead_name: lead.name, lead_email: undefined, lead_phone: lead.phone || undefined }],
    });
  };

  const savedNames = useMemo(() => {
    const set = new Set<string>();
    (savedLeads.data ?? []).forEach((l) => set.add(l.name.toLowerCase().trim()));
    return set;
  }, [savedLeads.data]);

  const isLeadSaved = (name: string) => savedNames.has(name.toLowerCase().trim());

  const handleSearch = async () => {
    if (!companyType || !location) {
      toast.error("Select a company type and enter a location");
      return;
    }

    setIsSearching(true);
    setLeads([]);
    setTempFilter("all");

    try {
      const { data, error } = await supabase.functions.invoke("reseller-lead-search", {
        body: { company_type: companyType, location, count: 30 },
      });
      if (error) throw error;

      const rawLeads: ResellerResult[] = (data.leads || []).map((l: any) => ({
        ...l,
        company_type: l.company_type || companyType,
        score: scoreResellerLead({
          partnership_signals: l.partnership_signals,
          rating: l.rating,
          review_count: l.review_count,
          client_base_size: l.client_base_size,
          services_offered: l.services_offered,
          employee_estimate: l.employee_estimate,
          website: l.website,
        }),
      }));

      rawLeads.sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0));
      setLeads(rawLeads);
      setHasSearched(true);

      if (rawLeads.length === 0) {
        toast.info("No leads found. Try a different location or company type.");
      } else {
        toast.success(`Found ${rawLeads.length} potential partners`);
      }
    } catch (err) {
      console.error("Reseller search failed:", err);
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

  const buildSavePayload = (lead: ResellerResult) => ({
    name: lead.name,
    phone: lead.phone,
    website: lead.website,
    address: lead.address,
    company_type: lead.company_type || null,
    services_offered: lead.services_offered || [],
    partnership_signals: lead.partnership_signals || [],
    client_base_size: lead.client_base_size || null,
    rating: lead.rating,
    review_count: lead.review_count,
    employee_estimate: lead.employee_estimate || null,
    reason: lead.reason,
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

  const handleSaveSingle = (lead: ResellerResult) => {
    saveLead.mutate(buildSavePayload(lead), {
      onSuccess: () => toast.success(`"${lead.name}" saved`),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Reseller / Agency Partner Finder</h2>
        <p className="text-sm text-muted-foreground">
          Find marketing agencies, consultants, and resellers who could become CloseLoop channel partners.
        </p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="h-9">
          <TabsTrigger value="search" className="text-xs px-4">Search</TabsTrigger>
          <TabsTrigger value="saved" className="text-xs px-4">
            Saved {savedLeads.data?.length ? `(${savedLeads.data.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block">Company Type</Label>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {RESELLER_INDUSTRIES.map((opt) => (
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
              <Button onClick={handleSearch} disabled={isSearching || !companyType || !location}>
                {isSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                {isSearching ? "Searching..." : "Find Partners"}
              </Button>
            </div>
          </div>

          {isSearching && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              <p>Searching for {companyType} companies in {location}...</p>
            </div>
          )}

          {!isSearching && leads.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Tabs value={tempFilter} onValueChange={(v) => setTempFilter(v as "all" | ResellerTemperature)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-3 h-6">All ({leads.length})</TabsTrigger>
                    <TabsTrigger value="hot" className="text-xs px-3 h-6">Hot ({tempCounts.hot})</TabsTrigger>
                    <TabsTrigger value="warm" className="text-xs px-3 h-6">Warm ({tempCounts.warm})</TabsTrigger>
                    <TabsTrigger value="cold" className="text-xs px-3 h-6">Cold ({tempCounts.cold})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{filteredLeads.length} results</span>
                  <Button size="sm" variant="outline" onClick={handleSaveAll} disabled={saveLeadsBatch.isPending}>
                    <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Save All
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {filteredLeads.map((lead) => {
                  const saved = isLeadSaved(lead.name);
                  return (
                    <Card key={`${lead.name}-${lead.address || ""}`} className="hover:border-primary/40 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-sm truncate">{lead.name}</h3>
                              {lead.score && (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getResellerTemperatureColor(lead.score.temperature)}`}>
                                  {getResellerTemperatureIcon(lead.score.temperature)} {lead.score.temperature} {lead.score.score}
                                </Badge>
                              )}
                              {saved && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-700 border-green-500/20">
                                  <Check className="h-2.5 w-2.5 mr-0.5" /> Saved
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground capitalize">{lead.company_type}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.reason}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                              {lead.rating != null && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {lead.rating}
                                </span>
                              )}
                              {lead.phone && (
                                <span className="flex items-center gap-0.5">
                                  <Phone className="h-3 w-3" /> {lead.phone}
                                </span>
                              )}
                              {lead.address && (
                                <span className="flex items-center gap-0.5 truncate">
                                  <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{lead.address}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="hidden sm:flex flex-wrap gap-1 max-w-[180px] justify-end">
                              {lead.partnership_signals?.slice(0, 3).map((signal) => (
                                <Badge key={signal} variant="secondary" className="text-[9px] px-1 py-0 whitespace-nowrap">
                                  {PARTNERSHIP_SIGNAL_LABELS[signal] || signal}
                                </Badge>
                              ))}
                            </div>
                            {!saved && (
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 shrink-0"
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
              No partners found. Try a different company type or location.
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          {savedLeads.data?.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Handshake className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No saved partner leads yet.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {(savedLeads.data ?? []).map((lead) => (
                <Card key={lead.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-sm truncate">{lead.name}</h3>
                          {lead.temperature && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getResellerTemperatureColor(lead.temperature as ResellerTemperature)}`}>
                              {getResellerTemperatureIcon(lead.temperature as ResellerTemperature)} {lead.score}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground capitalize">{lead.company_type}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          {lead.phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" /> {lead.phone}</span>}
                          {lead.address && <span className="truncate">{lead.address}</span>}
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select value={lead.status} onValueChange={(v) => updateLead.mutate({ id: lead.id, status: v })}>
                          <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(RESELLER_STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {defaultResellerCampaign && lead.status === "new" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Start Outreach"
                          onClick={(e) => { e.stopPropagation(); handleStartOutreach(lead); }}>
                          <Mail className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(lead); }}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove lead?</AlertDialogTitle>
            <AlertDialogDescription>Remove "{deleteTarget?.name}" from saved partners?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteLead.mutate(deleteTarget.id); setDeleteTarget(null); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
