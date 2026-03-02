import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type { JobFilter, JobPriority, JobStatus } from "@/hooks/useActiveJobs";
import { useTenantConfig } from "@/hooks/useTenantConfig";

interface JobFilterBarProps {
  filter: JobFilter;
  onFilterChange: (filter: JobFilter) => void;
}

const BASE_STATUS_TABS: { value: JobStatus | "all"; label: string; dispatchOnly?: boolean }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "picked_up", label: "Picked Up", dispatchOnly: true },
];

export function JobFilterBar({ filter, onFilterChange }: JobFilterBarProps) {
  const { businessMode } = useTenantConfig();
  const statusTabs = BASE_STATUS_TABS.filter(t => !t.dispatchOnly || businessMode === "dispatch");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        value={filter.status || "all"}
        onValueChange={(v) => onFilterChange({ ...filter, status: v as JobStatus | "all" })}
      >
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={filter.search || ""}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            className="pl-8 h-9 w-48 text-sm"
          />
        </div>
        <Select
          value={filter.priority || "all"}
          onValueChange={(v) => onFilterChange({ ...filter, priority: v as JobPriority | "all" })}
        >
          <SelectTrigger className="h-9 w-32 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="rush">Rush</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
