/**
 * EmptyDashboard — Shown when a tenant has zero call sessions.
 * Hero CTA (test call) → readiness → quick actions → checklist.
 * Mobile-first, mode-aware, industry-specific language.
 */

import { Phone, ArrowRight, Clock, Brain, Sparkles, UtensilsCrossed, Truck, Stethoscope, ShoppingBag, Copy, Check, PartyPopper, X, PhoneForwarded, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AgentControlPanel } from "./AgentControlPanel";
import { SmartChecklist } from "./SmartChecklist";
import { SoundManager } from "@/components/notifications/SoundManager";
import { useAuth } from "@/contexts/AuthContext";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { getReadinessVerb } from "@/data/industryTerminology";
import ErrorBoundary from "@/components/ErrorBoundary";

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

/** Mode-specific capabilities list for the celebration */
function getModeCapabilities(mode: string, readinessVerb?: string): string[] {
  // readinessVerb examples: "schedule jobs" (plumber), "book appointments" (salon), "take reservations" (restaurant)
  const bookingCapability = readinessVerb
    ? readinessVerb.charAt(0).toUpperCase() + readinessVerb.slice(1)
    : "Book appointments";
  switch (mode) {
    case "food": return ["Take phone orders", "Answer menu questions", "Handle delivery requests", "Manage reservations"];
    case "dispatch": return ["Accept new job requests", "Collect location details", "Provide ETA estimates", "Handle emergency calls"];
    case "medical": return ["Schedule appointments", "Handle patient inquiries", "Triage by urgency", "Verify insurance info"];
    case "sales": return ["Qualify incoming leads", "Answer product questions", "Schedule consultations", "Follow up on interest"];
    default: return ["Answer calls 24/7", bookingCapability, "Quote your prices", "Handle common questions"];
  }
}

export function EmptyDashboard() {
  const navigate = useNavigate();
  const { tenant, assistantSettings } = useAuth();
  const readiness = useAIReadinessV2();
  const { mode, terms, terminology } = useIndustryContext();
  const [copied, setCopied] = useState(false);

  // First-time celebration: show once after setup completes
  const celebrationKey = `celebration_dismissed_${tenant?.id}`;
  const setupJustCompleted = !!assistantSettings?.setup_completed_at;
  const [showCelebration, setShowCelebration] = useState(() => {
    if (!setupJustCompleted) return false;
    return !localStorage.getItem(celebrationKey);
  });

  // Auto-dismiss celebration after 30 seconds
  useEffect(() => {
    if (!showCelebration) return;
    const timer = setTimeout(() => {
      setShowCelebration(false);
      localStorage.setItem(celebrationKey, "true");
    }, 30000);
    return () => clearTimeout(timer);
  }, [showCelebration, celebrationKey]);

  const dismissCelebration = () => {
    setShowCelebration(false);
    localStorage.setItem(celebrationKey, "true");
  };

  const [forwardingOpen, setForwardingOpen] = useState(false);

  const businessName = (tenant?.name as string) || "your business";
  // closeloop_number lives in assistant_settings, not the tenant record
  const phoneNumber = assistantSettings?.forwarding_phone_e164 || assistantSettings?.closeloop_number || null;
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
      <ErrorBoundary>
        <AgentControlPanel />
      </ErrorBoundary>

      {/* ── First-time celebration ─────────────────────────────── */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50 via-background to-emerald-50/50 dark:from-emerald-950/30 dark:via-background dark:to-emerald-950/20 overflow-hidden relative">
              <button
                onClick={dismissCelebration}
                className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <PartyPopper className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Setup complete!</h2>
                    <p className="text-sm text-muted-foreground">
                      {businessName}'s AI receptionist is ready to go.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getModeCapabilities(mode, getReadinessVerb(terminology.appointmentLabel)).map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Make a test call below to hear your AI in action.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ── Next Steps: Phone Forwarding Guide ─────────────────── */}
      {phoneNumber && isReady && (
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <button
              type="button"
              onClick={() => setForwardingOpen(!forwardingOpen)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <PhoneForwarded className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Ready for real calls?</p>
                <p className="text-xs text-muted-foreground">Forward your business line to start receiving AI-answered calls</p>
              </div>
              {forwardingOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {forwardingOpen && (
              <div className="mt-4 space-y-3 pl-11">
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="text-sm font-medium">Make a test call first</p>
                      <p className="text-xs text-muted-foreground">Call your AI number above to hear how it sounds. Adjust your greeting or services in the Business Brain if needed.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="text-sm font-medium">Forward your business line</p>
                      <p className="text-xs text-muted-foreground">
                        On your phone, go to <strong>Settings → Phone → Call Forwarding</strong> and enter your AI number: <span className="font-mono font-medium text-foreground">{phoneNumber}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 break-words">
                        Or call your carrier: AT&T dial *21*{phoneNumber}# · T-Mobile *21*{phoneNumber}# · Verizon *72{phoneNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0 mt-0.5">3</span>
                    <div>
                      <p className="text-sm font-medium">Your AI starts answering</p>
                      <p className="text-xs text-muted-foreground">Calls to your business line will be answered by your AI. You'll see every call on your dashboard with transcripts and actions taken.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Quick Actions (mode-aware) ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/business-brain?section=about&item=business-hours")}
          className="flex items-center sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 rounded-xl border border-border/30 bg-card/60 hover:bg-card hover:border-border/50 transition-all text-left sm:text-center"
        >
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="sm:contents">
            <span className="text-sm sm:text-xs font-medium">Set Hours</span>
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
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate("/app/settings")}
          className="flex items-center sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 rounded-xl border border-border/30 bg-card/60 hover:bg-card hover:border-border/50 transition-all text-left sm:text-center"
        >
          <Settings2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="sm:contents">
            <span className="text-sm sm:text-xs font-medium">Settings</span>
          </div>
        </button>
      </div>

      {/* ── Setup Checklist ─────────────────────────────────────── */}
      <ErrorBoundary>
        <SmartChecklist />
      </ErrorBoundary>
    </div>
  );
}
