import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Globe, Phone, Loader2, MapPin, ExternalLink, Users, Briefcase, Linkedin, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SEARCH_TYPES = [
  { value: "marketing_agencies", label: "Marketing Agencies", description: "Digital agencies serving local businesses" },
  { value: "it_consultants", label: "IT Consultants", description: "Tech solution providers for SMBs" },
  { value: "business_coaches", label: "Business Coaches", description: "Coaches and fractional CMOs" },
  { value: "freelancers", label: "Freelancers", description: "Web devs, VAs, social media managers" },
];

interface ResellerLead {
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  email: string | null;
  linkedin: string | null;
  type: string;
  client_count_estimate: string | null;
  specialties: string[];
  reason: string;
  fit_signals: string[];
  confidence: string;
}

const FIT_SIGNAL_LABELS: Record<string, string> = {
  serves_smb: "Serves SMBs",
  tech_savvy: "Tech Savvy",
  needs_new_revenue: "Needs Revenue Streams",
  high_client_count: "Many Clients",
  local_focus: "Local Focus",
  agency_experience: "Agency Experience",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-500/10 text-green-700 border-green-500/20",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  low: "bg-muted text-muted-foreground",
};

export default function AdminResellerFinderPage() {
  const [location, setLocation] = useState("");
  const [searchType, setSearchType] = useState("marketing_agencies");
  const [leads, setLeads] = useState<ResellerLead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ResellerLead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSearch = async () => {
    if (!location) {
      toast.error("Enter a location");
      return;
    }

    setIsSearching(true);
    setLeads([]);

    try {
      const { data, error } = await supabase.functions.invoke("admin-lead-search", {
        body: { location, count: 25, mode: "reseller", searchType },
      });
      if (error) throw error;

      const results: ResellerLead[] = (data.leads || []).map((l: any) => ({
        name: l.name || "Unknown",
        phone: l.phone || null,
        website: l.website || null,
        address: l.address || null,
        email: l.email || null,
        linkedin: l.linkedin || null,
        type: l.type || searchType,
        client_count_estimate: l.client_count_estimate || null,
        specialties: l.specialties || [],
        reason: l.reason || "",
        fit_signals: l.fit_signals || [],
        confidence: l.confidence || "medium",
      }));

      setLeads(results);
      setHasSearched(true);

      if (results.length === 0) {
        toast.info("No resellers found. Try a different location or type.");
      } else {
        toast.success(`Found ${results.length} potential partners`);
      }
    } catch (err) {
      console.error("Reseller search failed:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const confidenceCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    leads.forEach((l) => {
      if (l.confidence in counts) counts[l.confidence as keyof typeof counts]++;
    });
    return counts;
  }, [leads]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reseller & Agency Finder</h1>
        <p className="text-sm text-muted-foreground">
          Find marketing agencies, consultants, and freelancers who could sell CloseLoop.
        </p>
      </div>

      {/* Search Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SEARCH_TYPES.map((st) => (
          <Card
            key={st.value}
            className={`cursor-pointer transition-colors ${searchType === st.value ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
            onClick={() => setSearchType(st.value)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-sm font-medium">{st.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{st.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Label className="text-xs mb-1.5 block">Location</Label>
          <Input
            placeholder="e.g. Austin, TX or nationwide"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleSearch} disabled={isSearching || !location}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {isSearching ? "Searching..." : "Find Partners"}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isSearching && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          <p>Searching for {SEARCH_TYPES.find(s => s.value === searchType)?.label} in {location}...</p>
        </div>
      )}

      {/* Results */}
      {!isSearching && leads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{leads.length} partners found</span>
            <span>·</span>
            <span className="text-green-600">{confidenceCounts.high} high fit</span>
            <span>·</span>
            <span className="text-amber-600">{confidenceCounts.medium} medium</span>
          </div>

          <div className="grid gap-2">
            {leads.map((lead, idx) => (
              <Card
                key={`${lead.name}-${idx}`}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm truncate">{lead.name}</h3>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CONFIDENCE_COLORS[lead.confidence] || ""}`}>
                          {lead.confidence} fit
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.reason}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        {lead.client_count_estimate && (
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />{lead.client_count_estimate}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-3 w-3" />{lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-0.5">
                            <Mail className="h-3 w-3" />{lead.email}
                          </span>
                        )}
                        {lead.linkedin && (
                          <span className="flex items-center gap-0.5">
                            <Linkedin className="h-3 w-3" />
                          </span>
                        )}
                        {lead.website && (
                          <span className="flex items-center gap-0.5">
                            <Globe className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-wrap gap-1 max-w-[180px] justify-end">
                      {lead.specialties?.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[9px] px-1 py-0 whitespace-nowrap">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isSearching && hasSearched && leads.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No potential partners found. Try a different location or type.
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLead.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Badge variant="outline" className={`${CONFIDENCE_COLORS[selectedLead.confidence] || ""}`}>
                  {selectedLead.confidence} fit
                </Badge>

                <div>
                  <h4 className="text-sm font-medium mb-1">Why They're a Good Fit</h4>
                  <p className="text-sm text-muted-foreground">{selectedLead.reason}</p>
                </div>

                {selectedLead.specialties?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Specialties</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedLead.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLead.fit_signals?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Fit Signals</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedLead.fit_signals.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs bg-green-500/5 text-green-700 border-green-500/20">
                          {FIT_SIGNAL_LABELS[s] || s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Contact</h4>
                  {selectedLead.phone && (
                    <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="h-4 w-4" />{selectedLead.phone}
                    </a>
                  )}
                  {selectedLead.email && (
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Mail className="h-4 w-4" />{selectedLead.email}
                    </a>
                  )}
                  {selectedLead.website && (
                    <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Globe className="h-4 w-4" />{selectedLead.website}
                    </a>
                  )}
                  {selectedLead.linkedin && (
                    <a href={selectedLead.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Linkedin className="h-4 w-4" />LinkedIn Profile
                    </a>
                  )}
                  {selectedLead.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />{selectedLead.address}
                    </div>
                  )}
                </div>

                {selectedLead.client_count_estimate && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Estimated Client Base</h4>
                    <p className="text-sm text-muted-foreground">{selectedLead.client_count_estimate}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
