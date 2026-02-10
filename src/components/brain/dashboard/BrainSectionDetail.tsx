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
import { Progress } from "@/components/ui/progress";
import { BRAIN_CATEGORIES, type CategoryConfig } from "@/components/brain/layout/businessBrainNavConfig";
import { BrainSectionSidebar } from "@/components/brain/layout/BrainSectionSidebar";
import { BrainMobileItemList } from "@/components/brain/layout/BrainMobileItemList";
import { BrainContentPanel } from "@/components/brain/layout/BrainContentPanel";
import type { CategoryCompletionStats } from "@/hooks/useCategoryCompletion";
import type { SectionGroup, BrainSectionItem } from "@/config/brainSectionRegistry";
import type { ItemStatusInfo } from "@/hooks/useBrainItemStatuses";

interface BrainSectionDetailProps {
  category: CategoryConfig;
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

function getAdjacentCategories(section: string) {
  const sorted = [...BRAIN_CATEGORIES].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.section === section);
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

export function BrainSectionDetail({
  category,
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
  const Icon = category.icon;
  const { prev, next } = getAdjacentCategories(category.section);
  const activeStatus = activeItemId ? statuses[activeItemId] : undefined;

  const handleMobileBack = () => {
    // Clear item selection to show list
    onItemChange("");
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb + editorial header */}
      <div className="space-y-3">
        {/* Back button + breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Business Brain
          </button>
          <span className="text-muted-foreground/50">/</span>
          <span className="flex items-center gap-1.5 text-foreground font-medium">
            <Icon className="h-4 w-4" />
            {category.title}
          </span>
        </nav>

        {/* Title + progress */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{category.description}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight flex-1">{category.title}</h1>
            <span className="text-sm font-medium tabular-nums shrink-0">
              {completion.percentage}%
            </span>
          </div>
        </div>

        <Progress value={completion.percentage} className="h-1" />
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
}
