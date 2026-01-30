import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, Star, ChevronDown } from "lucide-react";
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

// Category filter chips with icons for better UX
const categoryFilters: { key: IndustryCategory | "all"; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "🏢" },
  { key: "home_services", label: "Home", icon: "🏠" },
  { key: "auto_services", label: "Auto", icon: "🚗" },
  { key: "beauty_wellness", label: "Beauty", icon: "💇" },
  { key: "health_medical", label: "Medical", icon: "🏥" },
  { key: "food_hospitality", label: "Food", icon: "🍽️" },
  { key: "dispatch_logistics", label: "Dispatch", icon: "🚛" },
  { key: "professional_services", label: "Pro", icon: "💼" },
  { key: "pet_services", label: "Pets", icon: "🐕" },
  { key: "fitness_recreation", label: "Fitness", icon: "💪" },
  { key: "events_entertainment", label: "Events", icon: "📸" },
  { key: "property_real_estate", label: "Property", icon: "🏘️" },
];

export default function IndustrySelector({ value, onChange }: IndustrySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<IndustryCategory | "all">("all");
  const [recentIndustries, setRecentIndustries] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(!value || value === "other" || value === "");

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
  const saveToRecent = useCallback((slug: string) => {
    setRecentIndustries(prev => {
      const updated = [slug, ...prev.filter(s => s !== slug)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_INDUSTRIES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

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
    setIsExpanded(false);
    onChange(industry.slug, industry);
  };

  // Mode badge helper
  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'food': return { label: 'Food', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
      case 'dispatch': return { label: 'Dispatch', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      case 'medical': return { label: 'Medical', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
      case 'service': return { label: 'Booking', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      default: return { label: 'General', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' };
    }
  };

  const renderIndustryItem = (industry: IndustryCatalogEntry, showBadge?: string) => {
    const isSelected = value === industry.slug;
    const modeInfo = getModeLabel(industry.businessMode);
    
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
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", modeInfo.color)}>
              {modeInfo.label}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {industry.services.length} services
            </span>
          </div>
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

      {/* Show search and filters only when expanded or no selection */}
      {(isExpanded || !value || value === "other") && (
        <>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search industries..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsExpanded(true);
              }}
              className="pl-9"
            />
          </div>

          {/* Category Filters - horizontal scroll on mobile */}
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <div className="flex gap-1.5 min-w-max">
              {categoryFilters.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setIsExpanded(true);
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                    activeCategory === cat.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
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
        </>
      )}

      {/* Selected Industry Display */}
      {value && value !== "other" && (
        <div 
          className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-xl">
            {industryCatalog.find(i => i.slug === value)?.icon || "🏢"}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">
                {industryCatalog.find(i => i.slug === value)?.name || value}
              </p>
              {(() => {
                const industry = industryCatalog.find(i => i.slug === value);
                if (industry) {
                  const modeInfo = getModeLabel(industry.businessMode);
                  return (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", modeInfo.color)}>
                      {modeInfo.label}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              {industryCatalog.find(i => i.slug === value)?.services.length || 0} default services • Click to change
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </div>
      )}
    </div>
  );
}

