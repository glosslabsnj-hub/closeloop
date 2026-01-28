import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Mic, Power, Check, ChevronRight } from "lucide-react";
import { PhoneConnectionStep } from "./PhoneConnectionStep";
import { CalendarConnectionStep } from "./CalendarConnectionStep";
import { TestAIStep } from "./TestAIStep";
import { GoLiveStep } from "./GoLiveStep";

interface SetupWizardProps {
  onSetupComplete: () => void;
}

type SetupStep = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
};

export function SetupWizard({ onSetupComplete }: SetupWizardProps) {
  const { tenant, assistantSettings } = useAuth();
  const [activeStep, setActiveStep] = useState<number>(0);

  // Determine completion status from assistant_settings
  const phoneComplete = (assistantSettings as any)?.setup_step_phone || assistantSettings?.phone_connected || false;
  const calendarComplete = (assistantSettings as any)?.setup_step_calendar || !!(assistantSettings as any)?.booking_url;
  const testComplete = (assistantSettings as any)?.setup_step_tested || false;
  const goLiveComplete = assistantSettings?.go_live_enabled || false;

  const steps: SetupStep[] = [
    { id: "phone", title: "Connect Phone", icon: Phone, isComplete: phoneComplete },
    { id: "calendar", title: "Connect Calendar", icon: Calendar, isComplete: calendarComplete },
    { id: "test", title: "Test AI", icon: Mic, isComplete: testComplete },
    { id: "golive", title: "Go Live", icon: Power, isComplete: goLiveComplete },
  ];

  const completedCount = steps.filter(s => s.isComplete).length;
  const progress = (completedCount / steps.length) * 100;

  // Auto-advance to first incomplete step
  const firstIncompleteIndex = steps.findIndex(s => !s.isComplete);
  const currentStep = firstIncompleteIndex === -1 ? steps.length - 1 : firstIncompleteIndex;

  const handleStepComplete = (stepIndex: number) => {
    if (stepIndex < steps.length - 1) {
      setActiveStep(stepIndex + 1);
    } else {
      onSetupComplete();
    }
  };

  const handleCalendarSkip = () => {
    setActiveStep(2); // Move to test step
  };

  const canActivateGoLive = phoneComplete && testComplete; // Calendar is optional

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Get Your AI Running</h1>
        <p className="text-muted-foreground">
          Complete these steps to start answering calls with AI
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Setup Progress</span>
          <span className="font-medium">{completedCount} of {steps.length} complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep || step.isComplete;
          
          return (
            <button
              key={step.id}
              onClick={() => isClickable && setActiveStep(index)}
              disabled={!isClickable}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all min-w-[80px] ${
                step.isComplete 
                  ? "bg-primary/10 text-primary" 
                  : isCurrent 
                    ? "bg-secondary text-foreground" 
                    : "text-muted-foreground"
              } ${isClickable ? "cursor-pointer hover:bg-secondary" : "cursor-not-allowed opacity-50"}`}
            >
              <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
                step.isComplete 
                  ? "bg-primary text-primary-foreground" 
                  : isCurrent 
                    ? "bg-foreground text-background" 
                    : "bg-muted"
              }`}>
                {step.isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Current Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 0 && (
          <PhoneConnectionStep 
            onComplete={() => handleStepComplete(0)}
            isComplete={phoneComplete}
          />
        )}
        
        {currentStep === 1 && (
          <CalendarConnectionStep 
            onComplete={() => handleStepComplete(1)}
            isComplete={calendarComplete}
            onSkip={handleCalendarSkip}
          />
        )}
        
        {currentStep === 2 && (
          <TestAIStep 
            onComplete={() => handleStepComplete(2)}
            isComplete={testComplete}
          />
        )}
        
        {currentStep === 3 && (
          <GoLiveStep 
            onComplete={() => handleStepComplete(3)}
            isComplete={goLiveComplete}
            canActivate={canActivateGoLive}
          />
        )}
      </div>

      {/* Business Name */}
      <div className="text-center pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Setting up AI for <span className="font-medium text-foreground">{tenant?.name || "your business"}</span>
        </p>
      </div>
    </div>
  );
}
