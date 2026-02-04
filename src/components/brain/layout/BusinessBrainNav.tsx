/**
 * Business Brain Left Navigation
 * 
 * Sticky left sidebar with:
 * - Category navigation
 * - Mode-aware ordering
 * - Review count badge
 * - Active state highlighting
 */

import { Brain, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BRAIN_CATEGORIES, 
  getOrderedCategories,
  type CategoryConfig 
} from "./businessBrainNavConfig";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useBrainReviewCount } from "@/components/brain/BrainReviewQueue";
import { cn } from "@/lib/utils";

interface BusinessBrainNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  className?: string;
}

export function BusinessBrainNav({ 
  activeSection, 
  onSectionChange,
  className 
}: BusinessBrainNavProps) {
  const { businessMode } = useTenantConfig();
  const reviewCount = useBrainReviewCount();

  // Get categories ordered by relevance for current mode
  const categories = getOrderedCategories(businessMode);

  return (
    <aside className={cn(
      "w-64 border-r border-border bg-card/50 sticky top-0 h-screen overflow-hidden flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Business Brain</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Everything your AI needs to know
        </p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeSection === category.section;
            const isEmphasized = category.emphasis?.includes(businessMode);
            const showBadge = category.section === "knowledge" && reviewCount > 0;

            return (
              <button
                key={category.id}
                onClick={() => onSectionChange(category.section)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  "hover:bg-muted/50",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isActive && isEmphasized && "bg-primary/5 border border-primary/20"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )} />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium truncate",
                      isActive && "text-primary-foreground"
                    )}>
                      {category.title}
                    </span>
                    {showBadge && (
                      <Badge 
                        variant={isActive ? "secondary" : "destructive"} 
                        className="h-5 px-1.5 text-xs shrink-0"
                      >
                        {reviewCount}
                      </Badge>
                    )}
                    {isEmphasized && !isActive && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] h-4 px-1 border-primary/30 text-primary shrink-0"
                      >
                        Key
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs truncate",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {category.description}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 shrink-0 mt-0.5 opacity-0 transition-opacity",
                  isActive && "opacity-100 text-primary-foreground"
                )} />
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer hint */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Changes save automatically and sync to your AI in real-time
        </p>
      </div>
    </aside>
  );
}
