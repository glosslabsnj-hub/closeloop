import { Search, LayoutGrid, List, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DispatchFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
}

export function DispatchFilters({
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: DispatchFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Status tabs */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
          <TabsList className="bg-muted/40 h-10">
            <TabsTrigger value="active" className="text-sm px-4">Active</TabsTrigger>
            <TabsTrigger value="pending" className="text-sm px-4">Pending</TabsTrigger>
            <TabsTrigger value="en_route" className="text-sm px-4">En Route</TabsTrigger>
            <TabsTrigger value="completed" className="text-sm px-4">Completed</TabsTrigger>
            <TabsTrigger value="all" className="text-sm px-4">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* View mode toggle */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/50">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-md transition-colors",
              viewMode === "table" && "bg-background shadow-sm"
            )}
            onClick={() => onViewModeChange("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-md transition-colors",
              viewMode === "grid" && "bg-background shadow-sm"
            )}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and additional filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search jobs, customers, addresses..."
            className="pl-9 h-10 bg-muted/30 border-border/50 focus:bg-background transition-colors"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
          <SelectTrigger className="w-36 h-10 bg-muted/30 border-border/50">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Priority" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Urgent
              </span>
            </SelectItem>
            <SelectItem value="high">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-warning" />
                High
              </span>
            </SelectItem>
            <SelectItem value="normal">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                Normal
              </span>
            </SelectItem>
            <SelectItem value="low">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                Low
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
