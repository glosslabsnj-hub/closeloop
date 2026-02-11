/**
 * GuidedSetupOverlay
 *
 * A modal overlay that appears on first visit to Business Brain (or via ?guided=true).
 * Shows the 3-4 most important setup sections for the user's business mode.
 */

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useAuth } from "@/contexts/AuthContext";
import { getOrderedSteps, getStepTitle, type HubStep } from "./hub/hubStepsConfig";
import type { BusinessMode } from "@/hooks/useTenantConfig";

const STORAGE_KEY = "brain_guided_seen";
const SNOOZE_KEY = "brain_guided_snoozed_at";
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface GuidedSetupOverlayProps {
  onNavigateToSection: (sectionId: string) => void;
  getStepCompletion: (stepId: string) => boolean;
}

/** Get priority steps for a mode — the 3-4 most important ones */
function getPrioritySteps(mode: BusinessMode, capabilities?: Record<string, boolean>): string[] {
  const isCallbackOnly = capabilities?.aiBooksDirect === false;

  // Common priorities
  const steps: string[] = ["identity"];

  switch (mode) {
    case "dispatch":
      steps.push("coverage", "ai-setup", "knowledge");
      break;
    case "food":
      steps.push("offerings", "ai-setup", "knowledge");
      break;
    case "medical":
      steps.push("calendar", "policies", "knowledge");
      break;
    case "service":
    case "general":
    default:
      if (isCallbackOnly) {
        steps.push("ai-setup", "knowledge", "hours");
      } else {
        steps.push("calendar", "offerings", "ai-setup");
      }
      break;
  }

  return steps;
}

export function GuidedSetupOverlay({
  onNavigateToSection,
  getStepCompletion,
}: GuidedSetupOverlayProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { businessMode } = useTenantConfig();
  const { tenant } = useAuth();
  const [open, setOpen] = useState(false);

  // Read capabilities from tenant
  const capabilities = useMemo(() => {
    const raw = (tenant as any)?.capabilities_json;
    if (raw && typeof raw === "object") return raw as Record<string, boolean>;
    return {};
  }, [tenant]);

  useEffect(() => {
    const isGuided = searchParams.get("guided") === "true";
    const hasSeen = localStorage.getItem(STORAGE_KEY) === "true";
    const snoozedAt = localStorage.getItem(SNOOZE_KEY);
    const isSnoozed = snoozedAt && Date.now() - parseInt(snoozedAt, 10) < SNOOZE_DURATION_MS;

    if (isGuided || (!hasSeen && !isSnoozed)) {
      setOpen(true);
      // Clean up the query param
      if (isGuided) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("guided");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  const allSteps = getOrderedSteps(businessMode);
  const priorityIds = getPrioritySteps(businessMode, capabilities);
  const prioritySteps = priorityIds
    .map((id) => allSteps.find((s) => s.id === id))
    .filter(Boolean) as HubStep[];

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  const handleSnooze = () => {
    localStorage.setItem(SNOOZE_KEY, Date.now().toString());
    setOpen(false);
  };

  const handleNavigate = (step: HubStep) => {
    handleDismiss();
    onNavigateToSection(step.sectionId);
  };

  const completedCount = prioritySteps.filter((s) => getStepCompletion(s.id)).length;

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <DialogTitle>Let's finish setting up</DialogTitle>
              </div>
              <DialogDescription>
                Here are the most important things to configure for your business.
                {completedCount > 0 && ` ${completedCount} of ${prioritySteps.length} done!`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {prioritySteps.map((step, i) => {
                const isComplete = getStepCompletion(step.id);
                const title = getStepTitle(step.id, businessMode);
                const Icon = step.icon;

                return (
                  <motion.button
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleNavigate(step)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                      isComplete
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        isComplete ? "bg-emerald-500/20" : "bg-muted"
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {step.purpose}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </motion.button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleSnooze}>
                Show me later
              </Button>
              <Button size="sm" className="flex-1" onClick={handleDismiss}>
                I'll explore on my own
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
