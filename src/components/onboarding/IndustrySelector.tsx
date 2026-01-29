import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  industryCatalog,
  searchIndustries,
  getPopularIndustries,
  categoryLabels,
  type IndustryCategory,
  type IndustryCatalogEntry,
  INDUSTRY_COUNT,
} from "@/data/industryCatalog";

interface IndustrySelectorProps {
  value: string;
  onChange: (slug: string, industry: IndustryCatalogEntry) => void;
}

const RECENT_INDUSTRIES_KEY = "closeloop_recent_industries";
const MAX_RECENT = 5;

// Category filter chips
const categoryFilters: { key: IndustryCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "home_services", label: "Home Services" },
  { key: "auto_services", label: "Auto" },
  { key: "beauty_wellness", label: "Beauty" },
  { key: "health_medical", label: "Medical" },
  { key: "food_hospitality", label: "Food" },
  { key: "dispatch_logistics", label: "Dispatch" },
  { key: "professional_services", label: "Professional" },
  { key: "pet_services", label: "Pets" },
  { key: "fitness_recreation", label: "Fitness" },
  { key: "events_entertainment", label: "Events" },
];

export default function IndustrySelector({ value, onChange }: IndustrySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<IndustryCategory | "all">("all");
  const [recentIndustries, setRecentIndustries] = useState<string[]>([]);

  // Load recent industries from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_INDUSTRIES_KEY);
      if (stored) {
        setRecentIndustries(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save to recent industries
  const saveToRecent = (slug: string) => {
    const updated = [slug, ...recentIndustries.filter(s => s !== slug)].slice(0, MAX_RECENT);
    setRecentIndustries(updated);
    try {
      localStorage.setItem(RECENT_INDUSTRIES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Get popular industries
  const popularIndustries = useMemo(() => getPopularIndustries(12), []);

  // Get recent industries as full objects
  const recentIndustryObjects = useMemo(() => {
    return recentIndustries
      .map(slug => industryCatalog.find(i => i.slug === slug))
      .filter((i): i is IndustryCatalogEntry => i !== undefined);
  }, [recentIndustries]);

  // Filter industries based on search and category
  const filteredIndustries = useMemo(() => {
    let results = searchQuery ? searchIndustries(searchQuery) : industryCatalog;
    
    if (activeCategory !== "all") {
      results = results.filter(i => i.category === activeCategory);
    }
    
    // Sort alphabetically, but keep "Other" at the end
    return results.sort((a, b) => {
      if (a.slug === "other") return 1;
      if (b.slug === "other") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, activeCategory]);

  // Determine what to show
  const showRecent = !searchQuery && activeCategory === "all" && recentIndustryObjects.length > 0;
  const showPopular = !searchQuery && activeCategory === "all";

  const handleSelect = (industry: IndustryCatalogEntry) => {
    saveToRecent(industry.slug);
    onChange(industry.slug, industry);
  };

  const renderIndustryItem = (industry: IndustryCatalogEntry, showBadge?: string) => {
    const isSelected = value === industry.slug;
    
    return (
      <button
        key={industry.slug}
        type="button"
        onClick={() => handleSelect(industry)}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all",
          "hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/20",
          isSelected && "bg-primary/10 ring-2 ring-primary"
        )}
      >
        <span className="text-xl flex-shrink-0">{industry.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-medium truncate", isSelected && "text-primary")}>
              {industry.name}
            </span>
            {showBadge && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {showBadge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {categoryLabels[industry.category]}
          </p>
        </div>
        {isSelected && (
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Industry *</Label>
        <p className="text-xs text-muted-foreground">
          Choose from {INDUSTRY_COUNT} industries to get tailored templates
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search industries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-1.5">
        {categoryFilters.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Industry List */}
      <ScrollArea className="h-[300px] rounded-lg border">
        <div className="p-2 space-y-4">
          {/* Recent Industries */}
          {showRecent && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1">
                <Star className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recently Used
                </span>
              </div>
              {recentIndustryObjects.map(industry => renderIndustryItem(industry, "Recent"))}
            </div>
          )}

          {/* Popular Industries */}
          {showPopular && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Popular
                </span>
              </div>
              {popularIndustries
                .filter(i => !recentIndustries.includes(i.slug))
                .map(industry => renderIndustryItem(industry))}
            </div>
          )}

          {/* Divider if we showed popular */}
          {showPopular && filteredIndustries.length > popularIndustries.length && (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">All Industries</span>
              <div className="flex-1 border-t" />
            </div>
          )}

          {/* All/Filtered Industries */}
          {(searchQuery || activeCategory !== "all") && (
            <div className="space-y-1">
              {filteredIndustries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No industries found for "{searchQuery}"</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                filteredIndustries.map(industry => renderIndustryItem(industry))
              )}
            </div>
          )}

          {/* Full list when not searching (excluding already shown) */}
          {!searchQuery && activeCategory === "all" && (
            <div className="space-y-1">
              {filteredIndustries
                .filter(i => 
                  !popularIndustries.some(p => p.slug === i.slug) && 
                  !recentIndustries.includes(i.slug)
                )
                .map(industry => renderIndustryItem(industry))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Selected Industry Display */}
      {value && value !== "other" && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-lg">
            {industryCatalog.find(i => i.slug === value)?.icon || "🏢"}
          </span>
          <div className="flex-1">
            <p className="font-medium text-sm">
              {industryCatalog.find(i => i.slug === value)?.name || value}
            </p>
            <p className="text-xs text-muted-foreground">
              Templates will be loaded for this industry
            </p>
          </div>
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}
    </div>
  );
}

