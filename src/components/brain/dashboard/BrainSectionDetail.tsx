import React from "react";
/**
 * BrainSectionDetail - Sidebar + Content split layout for section detail views
 *
 * Hosts:
 * - Breadcrumb navigation (Business Brain / {Title})
 * - Editorial title + inline icon + progress bar
 * - Banner content (QuoteReadinessCard, food notice, etc.)
 * - Sidebar + Content panel split (desktop) or mobile list/editor
 * - Add-on content (AddOnGroup, if any)
 * - Prev / Next category navigation
 */

import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BRAIN_CATEGORIES, type CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import { BrainSectionSidebar } from "@/components/brain/layout/BrainSectionSidebar";
import { BrainMobileItemList } from "@/components/brain/layout/BrainMobileItemList";
import { BrainContentPanel } from "@/components/brain/layout/BrainContentPanel";
import type { CategoryCompletionStats } from "@/hooks/useCategoryCompletion";
import type { SectionGroup, BrainSectionItem } from "@/config/brainSectionRegistry";
import type { ItemStatusInfo } from "@/hooks/useBrainItemStatuses";

interface BrainSectionDetailProps {
  category: CategoryConfig;
  /** Mode-specific ordered categories for prev/next navigation */
  orderedCategories?: CategoryConfig[];
  /** Dynamic title resolved from industry terminology */
  resolvedTitle?: string;
  completion: CategoryCompletionStats;
  onBack: () => void;
  onNavigate: (section: string) => void;
  // Sidebar + content props
  activeItemId: string | null;
  onItemChange: (itemId: string) => void;
  groups: SectionGroup[];
  statuses: Record<string, ItemStatusInfo>;
  activeItem: BrainSectionItem | null;
  usedByAI?: string[];
  guidance?: { whyText?: string; whatText?: string; tipText?: string };
  // Slot content
  bannerContent?: React.ReactNode;
  addOnContent?: React.ReactNode;
  editorContent: React.ReactNode;
}

function getAdjacentCategories(section: string, categories?: CategoryConfig[]) {
  const source = categories ?? BRAIN_CATEGORIES;
  const sorted = [...source].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.section === section);
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

export const BrainSectionDetail = React.memo(function BrainSectionDetail({
  category,
  orderedCategories,
  resolvedTitle,
  completion,
  onBack,
  onNavigate,
  activeItemId,
  onItemChange,
  groups,
  statuses,
  activeItem,
  usedByAI,
  guidance,
  bannerContent,
  addOnContent,
  editorContent,
}: BrainSectionDetailProps) {
  const _Icon = category.icon;
  const displayTitle = resolvedTitle || category.title;
  const { prev, next } = getAdjacentCategories(category.section, orderedCategories);
  const activeStatus = activeItemId ? statuses[activeItemId] : undefined;

  const handleMobileBack = () => {
    // Clear item selection to show list
    onItemChange("");
  };

  return (
    <div className="space-y-5">
      {/* Top accent border */}
      <div className="h-0.5 rounded-full bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

      {/* Breadcrumb + editorial header */}
      <div className="space-y-1">
        {/* Back button + breadcrumb + completion badge */}
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Business Brain
          </button>
          <span className="text-muted-foreground/50">/</span>
          <_Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground font-medium flex-1">{displayTitle}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs tabular-nums font-medium",
              completion.percentage === 100
                ? "border-primary/30 text-primary bg-primary/5"
                : "border-border/50 text-muted-foreground",
            )}
          >
            {completion.percentage}% complete
          </Badge>
        </div>
      </div>

      {/* Banner content */}
      {bannerContent}

      {/* Sidebar + Content split */}
      <div className="flex gap-0 min-h-[60vh]">
        {/* Desktop sidebar */}
        <BrainSectionSidebar
          groups={groups}
          activeItemId={activeItemId}
          onItemChange={onItemChange}
          statuses={statuses}
        />

        {/* Mobile: show list when no item selected, editor when item selected */}
        {!activeItemId ? (
          <BrainMobileItemList
            groups={groups}
            onItemSelect={onItemChange}
            statuses={statuses}
          />
        ) : (
          /* Content panel — always visible on desktop, conditional on mobile */
          <BrainContentPanel
            activeItem={activeItem}
            status={activeStatus}
            usedByAI={usedByAI}
            guidance={guidance}
            onMobileBack={handleMobileBack}
          >
            {editorContent}
          </BrainContentPanel>
        )}
      </div>

      {/* Add-on content */}
      {addOnContent}

      {/* Prev / Next nav */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
        {prev ? (
          <Button
            variant="outline"
            onClick={() => onNavigate(prev.section)}
            className="gap-2 px-4 py-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {prev.title}
          </Button>
        ) : (
          <div />
        )}

        {next ? (
          <Button
            variant="outline"
            onClick={() => onNavigate(next.section)}
            className="gap-2 px-4 py-2"
          >
            {next.title}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
});
