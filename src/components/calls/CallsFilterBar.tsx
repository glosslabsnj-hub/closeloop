import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, X, CalendarIcon, ArrowUpDown } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type OutcomeFilter = "all" | "booked" | "answered" | "lost" | "message" | "escalated" | "order" | "dispatch";
export type DurationFilter = "all" | "under1" | "1to3" | "3to5" | "over5";
export type CustomerTypeFilter = "all" | "new" | "returning" | "unknown";
export type SortOption = "recent" | "oldest" | "longest" | "revenue";
export type DatePreset = "all" | "today" | "yesterday" | "week" | "month" | "custom";

export interface CallFilters {
  search: string;
  outcome: OutcomeFilter;
  duration: DurationFilter;
  customerType: CustomerTypeFilter;
  datePreset: DatePreset;
  dateRange: DateRange | undefined;
  sort: SortOption;
}

interface CallsFilterBarProps {
  filters: CallFilters;
  onChange: (filters: CallFilters) => void;
  outcomeCounts: Record<string, number>;
}

const OUTCOME_OPTIONS: { value: OutcomeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "booked", label: "Booked" },
  { value: "answered", label: "Questions" },
  { value: "lost", label: "Missed" },
  { value: "message", label: "Voicemail" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "all", label: "Any Duration" },
  { value: "under1", label: "< 1 min" },
  { value: "1to3", label: "1-3 min" },
  { value: "3to5", label: "3-5 min" },
  { value: "over5", label: "5+ min" },
];

const CUSTOMER_TYPE_OPTIONS: { value: CustomerTypeFilter; label: string }[] = [
  { value: "all", label: "All Customers" },
  { value: "new", label: "New" },
  { value: "returning", label: "Returning" },
  { value: "unknown", label: "Unknown" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Most Recent" },
  { value: "oldest", label: "Oldest First" },
  { value: "longest", label: "Longest Duration" },
  { value: "revenue", label: "Highest Revenue" },
];

function getDateRangeFromPreset(preset: DatePreset): DateRange | undefined {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case "week":
      return { from: startOfWeek(now), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    default:
      return undefined;
  }
}

export function CallsFilterBar({ filters, onChange, outcomeCounts }: CallsFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const updateFilter = <K extends keyof CallFilters>(key: K, value: CallFilters[K]) => {
    const newFilters = { ...filters, [key]: value };
    
    // Auto-compute dateRange when preset changes
    if (key === "datePreset" && value !== "custom") {
      newFilters.dateRange = getDateRangeFromPreset(value as DatePreset);
    }
    
    onChange(newFilters);
  };

  const activeFilterCount = [
    filters.duration !== "all",
    filters.customerType !== "all",
    filters.datePreset !== "all",
    filters.sort !== "recent",
  ].filter(Boolean).length;

  const clearFilters = () => {
    onChange({
      ...filters,
      duration: "all",
      customerType: "all",
      datePreset: "all",
      dateRange: undefined,
      sort: "recent",
    });
  };

  return (
    <div className="space-y-3">
      {/* Primary row: Outcome tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Outcome tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
          {OUTCOME_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={filters.outcome === option.value ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 shrink-0",
                filters.outcome === option.value ? "" : "text-muted-foreground"
              )}
              onClick={() => updateFilter("outcome", option.value)}
            >
              {option.label}
              {outcomeCounts[option.value] !== undefined && outcomeCounts[option.value] > 0 && (
                <Badge variant="secondary" size="sm" className="ml-1.5">
                  {outcomeCounts[option.value]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Search + Filter controls */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search calls, transcripts..."
              className="pl-10"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>

          {/* Date preset quick select */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {filters.datePreset === "custom" && filters.dateRange?.from
                    ? `${format(filters.dateRange.from, "MMM d")}${filters.dateRange.to ? ` - ${format(filters.dateRange.to, "MMM d")}` : ""}`
                    : DATE_PRESETS.find(p => p.value === filters.datePreset)?.label || "All Time"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-2 space-y-1">
                {DATE_PRESETS.slice(0, -1).map(preset => (
                  <Button
                    key={preset.value}
                    variant={filters.datePreset === preset.value ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      updateFilter("datePreset", preset.value);
                      if (preset.value !== "custom") setDatePickerOpen(false);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground px-2 py-1">Custom Range</p>
                <Calendar
                  mode="range"
                  selected={filters.dateRange}
                  onSelect={(range) => {
                    updateFilter("datePreset", "custom");
                    updateFilter("dateRange", range);
                  }}
                  numberOfMonths={1}
                  className="p-0"
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Advanced filters */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
                {activeFilterCount > 0 && (
                  <Badge variant="default" size="sm" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Duration */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Duration</label>
                    <Select
                      value={filters.duration}
                      onValueChange={(v) => updateFilter("duration", v as DurationFilter)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Customer Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Customer Type</label>
                    <Select
                      value={filters.customerType}
                      onValueChange={(v) => updateFilter("customerType", v as CustomerTypeFilter)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Sort */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Sort By</label>
                    <Select
                      value={filters.sort}
                      onValueChange={(v) => updateFilter("sort", v as SortOption)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort quick toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => updateFilter("sort", filters.sort === "recent" ? "oldest" : "recent")}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.duration !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {DURATION_OPTIONS.find(o => o.value === filters.duration)?.label}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => updateFilter("duration", "all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.customerType !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {CUSTOMER_TYPE_OPTIONS.find(o => o.value === filters.customerType)?.label}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => updateFilter("customerType", "all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.datePreset !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {filters.datePreset === "custom" && filters.dateRange?.from
                ? `${format(filters.dateRange.from, "MMM d")}${filters.dateRange.to ? ` - ${format(filters.dateRange.to, "MMM d")}` : ""}`
                : DATE_PRESETS.find(p => p.value === filters.datePreset)?.label}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => {
                  updateFilter("datePreset", "all");
                  updateFilter("dateRange", undefined);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.sort !== "recent" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {SORT_OPTIONS.find(o => o.value === filters.sort)?.label}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => updateFilter("sort", "recent")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
