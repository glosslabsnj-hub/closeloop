import type { ClientReadiness } from "@/hooks/useAgencyClientReadiness";

const STEPS = [
  { key: "provisioned", label: "Provisioned" },
  { key: "brain_setup", label: "Brain" },
  { key: "ai_ready", label: "AI Ready" },
  { key: "live", label: "Live" },
] as const;

const stepOrder: Record<string, number> = {
  provisioned: 0,
  brain_setup: 1,
  ai_ready: 2,
  plan_selected: 3,
  live: 3,
};

interface ClientOnboardingTrackerProps {
  readiness: ClientReadiness | undefined;
  tenantId: string;
  compact?: boolean;
}

export function ClientOnboardingTracker({ readiness, tenantId, compact = true }: ClientOnboardingTrackerProps) {
  const currentStep = stepOrder[readiness?.onboarding_step || "provisioned"] ?? 0;

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {STEPS.map((step, i) => {
          const isComplete = i <= currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`h-2 w-2 rounded-full ${
                  isComplete
                    ? isCurrent && step.key !== "live"
                      ? "bg-amber-500"
                      : "bg-green-500"
                    : "bg-muted-foreground/30"
                }`}
                title={step.label}
              />
              {i < STEPS.length - 1 && (
                <div className={`h-px w-2 ${isComplete && i < currentStep ? "bg-green-500" : "bg-muted-foreground/20"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full version with labels
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const isComplete = i <= currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full border-2 ${
                  isComplete
                    ? isCurrent && step.key !== "live"
                      ? "border-amber-500 bg-amber-500"
                      : "border-green-500 bg-green-500"
                    : "border-muted-foreground/30 bg-transparent"
                }`}
              />
              <span className={`text-[10px] mt-0.5 ${isComplete ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 mt-[-10px] ${isComplete && i < currentStep ? "bg-green-500" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
