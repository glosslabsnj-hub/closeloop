import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface StepDefinition {
  id: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
}

interface StepNavigatorProps {
  steps: StepDefinition[];
  icons: LucideIcon[];
  currentStep: number;
  onStepClick: (stepNumber: number) => void;
  totalMinutes: number;
}

export const StepNavigator = React.memo(function StepNavigator({ steps, icons, currentStep, onStepClick, totalMinutes }: StepNavigatorProps) {
  return (
    <aside className="hidden lg:flex w-80 border-r bg-card flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CL</span>
          </div>
          <span className="font-semibold text-lg">Flux Receptionist</span>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            const isFuture = stepNum > currentStep;
            const Icon = icons[idx];
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.id} className="relative">
                {!isLast && (
                  <div className={cn(
                    "absolute left-4 top-12 w-0.5 h-6",
                    isCompleted ? "bg-primary/30" : "bg-border"
                  )} />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (stepNum <= currentStep) onStepClick(stepNum);
                  }}
                  disabled={isFuture}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all relative z-10",
                    isActive && "bg-primary/10",
                    isCompleted && "hover:bg-muted/50 cursor-pointer",
                    isFuture && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isActive && "bg-primary text-primary-foreground border-primary",
                    isCompleted && "bg-primary/15 text-primary border-primary/40",
                    isFuture && "bg-background text-muted-foreground border-border"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive && "text-foreground",
                      (isCompleted || isFuture) && "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    {isActive && (
                      <p className="text-xs text-muted-foreground truncate">{step.subtitle} · ~{step.estimatedMinutes} min</p>
                    )}
                    {isCompleted && (
                      <p className="text-xs text-primary/70 truncate">Click to edit</p>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="p-6 border-t">
        <p className="text-sm text-muted-foreground">
          About {totalMinutes} minutes total
        </p>
      </div>
    </aside>
  );
});
