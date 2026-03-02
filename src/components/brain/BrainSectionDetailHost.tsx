/**
 * BrainSectionDetailHost — Thin wrapper that adds completion stats and renders the editor.
 * Extracted from BusinessBrainPage.tsx for maintainability.
 */
import { useMemo } from "react";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { resolveCardTitle } from "@/data/industryTerminology";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { groupSectionItems, type BrainSectionItem } from "@/config/brainSectionRegistry";
import { getModeTabDef } from "@/config/brainModeLayout";
import { type CategoryConfig } from "@/components/brain/layout";
import { BrainSectionDetail } from "@/components/brain/dashboard/BrainSectionDetail";
import { BrainEditorRenderer } from "@/components/brain/layout/BrainEditorRenderer";
import { useBrainItemStatuses } from "@/hooks/useBrainItemStatuses";

interface BrainSectionDetailHostProps {
  activeSection: string;
  currentCategory: CategoryConfig;
  modeCategories: CategoryConfig[];
  onBack: () => void;
  onNavigate: (section: string) => void;
  activeItemId: string | null;
  onItemChange: (itemId: string) => void;
  groups: ReturnType<typeof groupSectionItems>;
  statuses: ReturnType<typeof useBrainItemStatuses>;
  activeItem: BrainSectionItem | null;
  usedByAI?: string[];
  guidance?: { whyText?: string; whatText?: string; tipText?: string };
  bannerContent?: React.ReactNode;
  addOnContent?: React.ReactNode;
  businessMode: ReturnType<typeof useTenantConfig>["businessMode"];
  caps: ReturnType<typeof useCapabilities>;
  isFoodMode: boolean;
  isDispatchMode: boolean;
}

export function BrainSectionDetailHost({
  activeSection,
  currentCategory,
  modeCategories,
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
  businessMode,
  caps,
  isFoodMode,
  isDispatchMode,
}: BrainSectionDetailHostProps) {
  // Compute completion from item statuses (same method as BrainDashboard cards)
  // instead of essentialFields, so the breadcrumb % matches the overview card %.
  const tabDef = getModeTabDef(businessMode as any, activeSection);
  const completion = useMemo(() => {
    if (!tabDef) {
      return { totalFields: 0, completedFields: 0, percentage: 100, hasRequiredIncomplete: false };
    }
    let total = 0;
    let completed = 0;
    let hasRequiredIncomplete = false;
    for (const group of tabDef.groups) {
      for (const itemId of group.itemIds) {
        const info = statuses[itemId];
        if (!info || info.status === "optional") continue;
        total++;
        if (info.status === "complete") {
          completed++;
        } else if (info.status === "error") {
          hasRequiredIncomplete = true;
        }
      }
    }
    return {
      totalFields: total,
      completedFields: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
      hasRequiredIncomplete,
    };
  }, [tabDef, statuses]);
  const ic = useIndustryContext();

  const categoryTitle = resolveCardTitle(
    currentCategory.titleKey,
    currentCategory.title,
    businessMode,
    ic.category ?? undefined,
    ic.slug ?? undefined,
  );

  return (
    <BrainSectionDetail
      category={currentCategory}
      orderedCategories={modeCategories}
      resolvedTitle={categoryTitle}
      completion={completion}
      onBack={onBack}
      onNavigate={onNavigate}
      activeItemId={activeItemId}
      onItemChange={onItemChange}
      groups={groups}
      statuses={statuses}
      activeItem={activeItem ?? null}
      usedByAI={usedByAI}
      guidance={guidance}
      bannerContent={bannerContent}
      addOnContent={addOnContent}
      editorContent={
        activeItemId ? (
          <BrainEditorRenderer
            itemId={activeItemId}
            businessMode={businessMode}
            caps={caps}
            isFoodMode={isFoodMode}
            isDispatchMode={isDispatchMode}
          />
        ) : null
      }
    />
  );
}
