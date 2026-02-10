import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, LayoutList, LayoutGrid, Table2, Calendar, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export interface FilterTab {
  value: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export interface FilterDropdown {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export type ViewMode = "list" | "grid" | "table" | "calendar";

const VIEW_MODE_ICONS: Record<ViewMode, LucideIcon> = {
  list: LayoutList,
  grid: LayoutGrid,
  table: Table2,
  calendar: Calendar,
};

interface FilterBarProps {
  /** Tab filters (e.g., status tabs) */
  tabs?: FilterTab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  /** Search input */
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Dropdown filters */
  filters?: FilterDropdown[];
  /** View mode toggle */
  viewModes?: ViewMode[];
  activeViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  /** Extra actions to render on the right */
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({
  tabs,
  activeTab,
  onTabChange,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  viewModes,
  activeViewMode,
  onViewModeChange,
  actions,
  className,
}: FilterBarProps) {
  const hasSearch = onSearchChange !== undefined;
  const hasFilters = filters && filters.length > 0;
  const hasViewModes = viewModes && viewModes.length > 1;
  const hasControls = hasSearch || hasFilters || hasViewModes || actions;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Row 1: Tabs (if any) */}
      {tabs && tabs.length > 0 && onTabChange && (
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      {/* Row 2: Search + Filters + View Toggle */}
      {hasControls && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Search */}
          {hasSearch && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}

          {/* Dropdown filters */}
          {hasFilters && (
            <div className="flex gap-2 flex-wrap">
              {filters.map((filter) => (
                <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
                  <SelectTrigger className="h-9 w-auto min-w-[120px]">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1 hidden sm:block" />

          {/* View mode toggle + actions */}
          <div className="flex gap-2 items-center">
            {hasViewModes && (
              <div className="flex rounded-lg border border-border/50 overflow-hidden">
                {viewModes.map((mode) => {
                  const Icon = VIEW_MODE_ICONS[mode];
                  return (
                    <Button
                      key={mode}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-9 w-9 p-0 rounded-none border-0",
                        activeViewMode === mode && "bg-muted text-foreground"
                      )}
                      onClick={() => onViewModeChange?.(mode)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            )}
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}
