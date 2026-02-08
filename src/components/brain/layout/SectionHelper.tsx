/**
 * SectionHelper - Industry-aware helper content for Business Brain sections
 * 
 * Provides contextual guidance showing:
 * - What this section controls
 * - How AI uses the data
 * - Industry-specific examples
 * - Mode-specific tips (not just dispatch)
 */

import { Info, Lightbulb, Mic, Truck, UtensilsCrossed, HeartPulse, Wrench, Building2 } from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import { SECTION_HELPERS, MODE_LABELS } from "@/lib/industryHelpers";

export interface SectionHelperProps {
  sectionId: string;
  businessMode: BusinessMode;
  className?: string;
}

const MODE_ICONS: Record<BusinessMode, typeof Truck> = {
  service: Wrench,
  dispatch: Truck,
  food: UtensilsCrossed,
  medical: HeartPulse,
  general: Building2,
};

const MODE_COLORS: Record<BusinessMode, string> = {
  service: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  dispatch: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  food: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medical: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  general: "text-slate-500 bg-slate-500/10 border-slate-500/20",
};

export function SectionHelper({ sectionId, businessMode, className }: SectionHelperProps) {
  const content = SECTION_HELPERS[sectionId];
  
  if (!content) return null;
  
  const example = content.examplesByMode[businessMode] || content.examplesByMode.general || Object.values(content.examplesByMode)[0];
  const tip = content.tipsByMode[businessMode] || content.defaultTip;
  
  const ModeIcon = MODE_ICONS[businessMode];
  const modeLabel = MODE_LABELS[businessMode].label;
  const modeColors = MODE_COLORS[businessMode];
  
  return (
    <div className={`rounded-lg border bg-muted/30 p-4 space-y-3 ${className || ""}`}>
      {/* What it controls */}
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">{content.whatItControls}</p>
      </div>
      
      {/* How AI uses it */}
      <div className="pl-6 space-y-1">
        {content.howAIUsesIt.map((item, i) => (
          <p key={i} className="text-xs text-muted-foreground">• {item}</p>
        ))}
      </div>
      
      {/* Example */}
      {example && (
        <div className="flex items-start gap-2 pt-2 border-t border-border/50">
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Example of what AI says:</p>
            <p className="text-sm italic text-foreground/80">{example}</p>
          </div>
        </div>
      )}
      
      {/* Mode-specific tip (for ALL modes, not just dispatch) */}
      {tip && (
        <div className={`flex items-start gap-2 pt-2 border-t border-border/50 -mx-4 px-4 py-3 -mb-4 rounded-b-lg ${modeColors}`}>
          <ModeIcon className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium mb-0.5">{modeLabel} Tip</p>
            <p className="text-xs opacity-90">{tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}
