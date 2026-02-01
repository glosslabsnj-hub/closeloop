import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { ReactNode } from "react";

interface ToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standardized toolbar for list pages with search, filters, and actions.
 * Handles responsive layout automatically.
 */
export function Toolbar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  actions,
  className,
}: ToolbarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-3 mb-6", className)}>
      {/* Search */}
      {onSearchChange && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Filters */}
      {filters && <div className="flex gap-2 flex-wrap">{filters}</div>}

      {/* Actions */}
      {actions && <div className="flex gap-2 sm:ml-auto">{actions}</div>}
    </div>
  );
}

interface FilterSelectProps {
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

/**
 * Companion component for Toolbar filters
 */
export function FilterSelect({ placeholder, value, onValueChange, options }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
