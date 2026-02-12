import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useKnowledgeGaps } from "@/hooks/useKnowledgeGaps";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { buildTestScenarios } from "@/lib/testScenarioBuilder";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface SuggestedTestsBannerProps {
  onDismiss?: () => void;
}

/**
 * Suggested Tests Banner
 *
 * Shows business-aware test scenarios built from real data:
 * 1. Knowledge gaps — questions the AI couldn't answer
 * 2. Actual services — questions about real service names/prices
 * 3. Industry/mode fallback — generic questions for the business type
 */
export function SuggestedTestsBanner({ onDismiss }: SuggestedTestsBannerProps) {
  const { tenant } = useAuth();
  const businessMode = (tenant?.business_mode as BusinessMode) || "service";
  const businessName = (tenant as any)?.business_name || tenant?.name || "";
  const { services: allServices } = useServices();
  const { topGaps } = useKnowledgeGaps();
  const { slug } = useIndustryContext();

  const activeServices = useMemo(
    () => (allServices || []).filter((s) => s.is_active !== false),
    [allServices],
  );

  const scenarios = useMemo(
    () => buildTestScenarios(activeServices, topGaps, businessMode, slug),
    [activeServices, topGaps, businessMode, slug],
  );

  const hasRealData = scenarios.some((s) => s.source !== "industry");
  const bannerText = hasRealData && businessName
    ? `Questions ${businessName} customers actually ask:`
    : `Common questions for ${businessMode} businesses:`;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Try these test scenarios</h3>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {bannerText}
            </p>

            <div className="flex flex-wrap gap-2">
              {scenarios.map((scenario, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 text-xs font-normal whitespace-normal text-left gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(scenario.text);
                    window.dispatchEvent(
                      new CustomEvent('suggested-test-clicked', {
                        detail: { text: scenario.text }
                      })
                    );
                  }}
                >
                  "{scenario.text}"
                  {scenario.badge && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-1 shrink-0">
                      {scenario.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Click any test to copy it to your clipboard
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
