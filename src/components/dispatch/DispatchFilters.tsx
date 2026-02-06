import { Search, LayoutGrid, List } from "lucide-react";
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
      <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="en_route">En Route</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and additional filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, customers, addresses..."
              className="w-72 pl-9"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
