/**
 * AddOnGroup - "Available Add-ons" collapsible group for brain sections
 *
 * Shows sections that aren't relevant to the current business as compact
 * add-on cards with one-click "Enable" buttons. When enabled, the section
 * moves to the main area.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Puzzle, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { AddOnItem } from "@/config/brainSectionRelevance";

interface AddOnGroupProps {
  items: AddOnItem[];
  onEnable: (item: AddOnItem) => Promise<void>;
  className?: string;
}

export function AddOnGroup({ items, onEnable, className }: AddOnGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [enablingId, setEnablingId] = useState<string | null>(null);

  if (items.length === 0) return null;

  const handleEnable = async (item: AddOnItem) => {
    setEnablingId(item.id);
    try {
      await onEnable(item);
    } finally {
      setEnablingId(null);
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("space-y-3", className)}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed transition-all",
            "bg-muted/10 hover:bg-muted/20",
            isOpen && "bg-muted/20 border-muted-foreground/30"
          )}
        >
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/50 shrink-0">
            <Puzzle className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Available Add-ons</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {items.length}
              </span>
            </div>
            {!isOpen && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Expand your AI with additional capabilities
              </p>
            )}
          </div>

          <div className="shrink-0 text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isEnabling = enablingId === item.id;

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed",
                "bg-background hover:bg-muted/10 transition-colors"
              )}
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/30 shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEnable(item)}
                disabled={isEnabling}
                className="shrink-0 gap-1.5"
              >
                {isEnabling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Enable
              </Button>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
