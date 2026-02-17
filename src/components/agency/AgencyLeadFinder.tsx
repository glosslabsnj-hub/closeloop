import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Phone, Star, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lead {
  name: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  reason: string;
  friction_signals: string[];
  confidence: "high" | "medium" | "low";
}

const INDUSTRY_OPTIONS = [
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

const SIGNAL_LABELS: Record<string, string> = {
  no_online_booking: "No Online Booking",
  small_team: "Small Team",
  high_volume: "High Call Volume",
  after_hours_demand: "After-Hours Demand",
  growth_signals: "Growing Fast",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-500/10 text-green-700 border-green-500/20",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  low: "bg-muted text-muted-foreground",
};

export function AgencyLeadFinder() {
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [citations, setCitations] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!industry || !location) {
      toast.error("Select an industry and enter a location");
      return;
    }

    setIsSearching(true);
    setLeads([]);
    setCitations([]);

    try {
      const { data, error } = await supabase.functions.invoke("agency-lead-search", {
        body: { industry, location, count: 5 },
      });

      if (error) throw error;

      setLeads(data.leads || []);
      setCitations(data.citations || []);
      setHasSearched(true);

      if (data.leads?.length === 0) {
        toast.info("No leads found. Try a different location or industry.");
      }
    } catch (err) {
      console.error("Lead search failed:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">AI Lead Finder</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Find local businesses that are likely missing calls and could benefit from CloseLoop.
      </p>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Label className="text-xs mb-1.5 block">Industry</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
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
            {isSearching ? "Searching…" : "Find Leads"}
          </Button>
        </div>
      </div>

      {/* Results */}
      {isSearching && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Searching for {industry} businesses in {location}…
        </div>
      )}

      {!isSearching && leads.length > 0 && (
        <div className="space-y-3">
          {leads.map((lead, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{lead.name}</h3>
                      <Badge variant="outline" className={CONFIDENCE_COLORS[lead.confidence]}>
                        {lead.confidence}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">{lead.reason}</p>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {lead.friction_signals?.map((signal) => (
                        <Badge key={signal} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {SIGNAL_LABELS[signal] || signal}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {lead.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {lead.rating} ({lead.review_count})
                        </span>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </a>
                      )}
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <Globe className="h-3 w-3" />
                          Website
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {citations.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Sources ({citations.length})</summary>
              <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                {citations.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {!isSearching && hasSearched && leads.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No leads found. Try adjusting the industry or location.
        </div>
      )}
    </div>
  );
}
