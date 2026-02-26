/**
 * EmptyDashboard — Shown when a tenant has zero call sessions.
 * Hero CTA (test call) → readiness → quick actions → checklist.
 * Mobile-first, mode-aware, industry-specific language.
 */

import { Phone, ArrowRight, Clock, Brain, Sparkles, UtensilsCrossed, Truck, Stethoscope, ShoppingBag, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AgentControlPanel } from "./AgentControlPanel";
import { SmartChecklist } from "./SmartChecklist";
import { SoundManager } from "@/components/notifications/SoundManager";
import { useAuth } from "@/contexts/AuthContext";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useIndustryContext } from "@/hooks/useIndustryContext";

/** Mode-specific welcome messaging */
function getWelcomeSubtext(mode: string, businessName: string): string {
  switch (mode) {
    case "food": return `Your AI is learning ${businessName}'s menu so it can take orders by phone.`;
    case "dispatch": return `Your AI is ready to answer calls and dispatch jobs for ${businessName}.`;
    case "medical": return `Your AI is being trained to handle patient calls for ${businessName}.`;
    case "sales": return `Your AI is ready to qualify leads and book appointments for ${businessName}.`;
    default: return `Your AI receptionist is almost ready to answer calls for ${businessName}.`;
  }
}

/** Mode-specific icon for the hero section */
function getModeIcon(mode: string) {
  switch (mode) {
    case "food": return UtensilsCrossed;
    case "dispatch": return Truck;
    case "medical": return Stethoscope;
    case "sales": return ShoppingBag;
    default: return Sparkles;
  }
}

export function EmptyDashboard() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const readiness = useAIReadinessV2();
  const { mode, terms } = useIndustryContext();
  const [copied, setCopied] = useState(false);

  const businessName = (tenant?.name as string) || "your business";
  const phoneNumber = (tenant?.closeloop_number as string) || null;
  const isReady = readiness.score >= 80;
  const ModeIcon = getModeIcon(mode);

  const copyPhone = () => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <SoundManager />

      {/* Agent Status */}
      <AgentControlPanel />

      {/* ── Hero: Test Call CTA (THE primary action) ────────────── */}
      <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-card/60 backdrop-blur-sm glow-primary-subtle overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 glow-primary-sm shrink-0">
              <ModeIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Welcome to {businessName}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {getWelcomeSubtext(mode, businessName)}
              </p>
            </div>
          </div>

          {/* Phone number + Test call in one row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {phoneNumber && (
              <button
                type="button"
                onClick={copyPhone}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
              >
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none">Your AI number</p>
                  <p className="text-sm font-semibold tracking-wide font-mono">{phoneNumber}</p>
                </div>
                {copied ? (
                  <Check className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            )}
            <Button
              size="lg"
              className="gap-2 flex-1 sm:flex-initial shadow-[0_0_24px_-6px_hsl(230_70%_62%/0.3)]"
              onClick={() => navigate("/app/simulator")}
            >
              <Phone className="h-4 w-4" />
              Make a Test Call
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── AI Readiness ────────────────────────────────────────── */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {isReady ? "AI Ready" : "Getting Ready"}
              </span>
            </div>
            <span className="text-sm font-bold tabular-nums">{readiness.score}%</span>
          </div>
          <Progress value={readiness.score} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {isReady
              ? "Your AI is fully configured and ready for real calls!"
              : `${readiness.recommendations.length} item${readiness.recommendations.length === 1 ? "" : "s"} left to optimize your AI's performance.`
            }
          </p>
        </CardContent>
      </Card>

      {/* ── Quick Actions (mode-aware) ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/business-brain?section=about&item=business-hours")}
          className="flex items-center sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 rounded-xl border border-border/30 bg-card/60 hover:bg-card hover:border-border/50 transition-all text-left sm:text-center"
        >
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="sm:contents">
            <span className="text-sm sm:text-xs font-medium">Set Hours</span>
            <span className="text-xs text-muted-foreground sm:hidden ml-auto">~1 min</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate("/app/business-brain?section=services")}
          className="flex items-center sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 rounded-xl border border-border/30 bg-card/60 hover:bg-card hover:border-border/50 transition-all text-left sm:text-center"
        >
          {mode === "food" ? (
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : mode === "dispatch" ? (
            <Truck className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <ShoppingBag className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div className="sm:contents">
            <span className="text-sm sm:text-xs font-medium">{terms.addService}</span>
            <span className="text-xs text-muted-foreground sm:hidden ml-auto">~3 min</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate("/app/business-brain?section=training")}
          className="flex items-center sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 rounded-xl border border-border/30 bg-card/60 hover:bg-card hover:border-border/50 transition-all text-left sm:text-center"
        >
          <Brain className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="sm:contents">
            <span className="text-sm sm:text-xs font-medium">Train AI</span>
            <span className="text-xs text-muted-foreground sm:hidden ml-auto">~3 min</span>
          </div>
        </button>
      </div>

      {/* ── Setup Checklist ─────────────────────────────────────── */}
      <SmartChecklist />
    </div>
  );
}
