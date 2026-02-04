/**
 * Business Brain Tabs - Horizontal tab navigation
 * 
 * A clean horizontal tab bar showing all 8 sections.
 * Replaces the left sidebar for a simpler, more scannable layout.
 */

import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  BRAIN_CATEGORIES, 
  getOrderedCategories,
} from "./businessBrainNavConfig";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useBrainReviewCount } from "@/components/brain/BrainReviewQueue";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface BusinessBrainTabsProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  className?: string;
}

export function BusinessBrainTabs({ 
  activeSection, 
  onSectionChange,
  className 
}: BusinessBrainTabsProps) {
  const { businessMode } = useTenantConfig();
  const reviewCount = useBrainReviewCount();

  // Get categories ordered by relevance for current mode
  const categories = getOrderedCategories(businessMode);

  return (
    <div className={cn("border-b bg-card/30", className)}>
      {/* Header */}
      <div className="container max-w-5xl px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Business Brain</h1>
          <span className="text-sm text-muted-foreground">
            — Everything your AI needs to know
          </span>
        </div>
      </div>

      {/* Tabs */}
      <ScrollArea className="w-full">
        <div className="container max-w-5xl px-4 sm:px-6">
          <nav className="flex gap-1 pb-px" role="tablist">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeSection === category.section;
              const isEmphasized = category.emphasis?.includes(businessMode);
              const showBadge = category.section === "knowledge" && reviewCount > 0;

              return (
                <button
                  key={category.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSectionChange(category.section)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap",
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive 
                      ? "bg-background text-foreground border-b-2 border-primary -mb-px" 
                      : "text-muted-foreground hover:text-foreground",
                    !isActive && isEmphasized && "text-primary/80"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "opacity-60"
                  )} />
                  <span>{category.title}</span>
                  {showBadge && (
                    <Badge 
                      variant={isActive ? "destructive" : "secondary"} 
                      className="h-4 px-1 text-[10px] shrink-0"
                    >
                      {reviewCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
