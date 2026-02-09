/**
 * Pricing & ETA Guidance Component
 * Provides UX guidance for pricing rules and ETA configuration
 */

import { DollarSign, Clock, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface PricingEtaGuidanceProps {
  businessMode: BusinessMode;
  hasDistanceEta?: boolean;
  hasBaseLocation?: boolean;
  etaSummary?: string | null;
}

export function PricingEtaGuidance({
  businessMode,
  hasDistanceEta = false,
  hasBaseLocation = false,
  etaSummary,
}: PricingEtaGuidanceProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="space-y-4 mb-6">
      {/* Main guidance card */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <DollarSign className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm">Pricing and arrival-time expectations</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                This determines what the AI can confidently quote and how it sets ETA expectations.
              </p>
            </div>
          </div>

          {/* How AI uses it */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">How your AI uses this</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• If pricing is fixed or "starting at," the AI will quote it using your service pricing.</li>
              <li>• If pricing isn't defined, the AI will collect details and route to a callback/quote.</li>
              <li>• ETAs are always spoken as ranges—never exact guarantees.</li>
              {businessMode === "service" && (
                <li>• Service businesses often use "starting at" prices for jobs that vary by scope or property size.</li>
              )}
              {businessMode === "dispatch" && (
                <li>• Towing rates typically vary by distance — configure distance-based pricing tiers for accurate quotes.</li>
              )}
              {businessMode === "food" && (
                <li>• Food prep times vary by order size — set realistic ranges and mention delivery time separately.</li>
              )}
              {businessMode === "medical" && (
                <li>• Medical practices should clarify that fees may vary by insurance — direct pricing questions to billing.</li>
              )}
            </ul>
          </div>

          {/* Quote vs Callback guidance */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2">
                ✓ The AI WILL quote when:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• A service has an exact price</li>
                <li>• A service has a "starting at" price</li>
                <li>• Distance-based pricing tiers are configured</li>
              </ul>
            </div>
            <div className="rounded-lg border bg-amber-500/5 border-amber-500/20 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
                ✗ The AI WILL NOT quote when:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Pricing is marked as "quote" or "varies"</li>
                <li>• No pricing info is provided</li>
                <li>• Request is complex (multi-stop, unknown scope)</li>
              </ul>
            </div>
          </div>

          {/* ETA Range reminder */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium">ETAs are always spoken as a range</p>
              <p className="text-xs text-muted-foreground mt-0.5 italic">
                Example: "about 25 to 35 minutes" — never "exactly 25 minutes"
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">Important</Badge>
          </div>

          {/* Advanced: Distance-aware ETA */}
          {businessMode === "dispatch" && (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
                  <span className="text-xs">Advanced: Distance-aware ETA</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    If distance-aware ETA is enabled, the AI will factor the travel time from your
                    configured base location to the caller's pickup/delivery address.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    If base location isn't configured, the AI falls back to your standard ETA rules.
                  </p>
                  {hasDistanceEta && hasBaseLocation && (
                    <Badge variant="secondary" className="text-xs">Currently Active</Badge>
                  )}
                  {hasDistanceEta && !hasBaseLocation && (
                    <Badge variant="outline" className="text-xs text-amber-500">Base location needed</Badge>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Preview snippet */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Preview: What the AI will say</span>
            </div>
            <p className="text-xs italic">
              {etaSummary
                ? `"${etaSummary}"`
                : '"The AI will give a conservative ETA range and may request a callback if details are missing."'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Avoid list */}
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">Avoid these</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• "We'll be there in exactly 25 minutes." (never guarantee exact times)</li>
          <li>• "Guaranteed arrival time." (conditions change)</li>
          <li>• Quoting without asking for location first (if dispatch)</li>
        </ul>
      </div>
    </div>
  );
}
