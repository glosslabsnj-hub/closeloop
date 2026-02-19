import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Phone, Mic, MessageSquare, Settings, Play, Power,
  Check, ChevronRight, AlertCircle
} from "lucide-react";
import type { AssistantSettings } from "@/types/database";
import { ConnectPhoneDialog } from "./ConnectPhoneDialog";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
  required?: boolean;
}

interface SetupChecklistProps {
  planCode: string | null;
  assistantSettings: AssistantSettings | null;
  onRefresh: () => void;
}

export function SetupChecklist({ planCode, assistantSettings, onRefresh }: SetupChecklistProps) {
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);
  const navigate = useNavigate();
  const [showConnectPhone, setShowConnectPhone] = useState(false);
  
  const phoneConnected = assistantSettings?.phone_connected || false;
  const goLiveEnabled = assistantSettings?.go_live_enabled || false;

  // Build steps based on plan
  const getSteps = (): SetupStep[] => {
    const baseSteps: SetupStep[] = [
      {
        id: "connect-phone",
        title: "Connect Business Phone Number",
        description: phoneConnected 
          ? `Connected: ${assistantSettings?.business_phone_number || assistantSettings?.closeloop_number}` 
          : "Link your existing number or get a new CloseLoop number",
        icon: Phone,
        completed: phoneConnected,
        action: () => setShowConnectPhone(true),
        actionLabel: phoneConnected ? "Change Number" : "Connect Number",
        required: true,
      },
    ];

    // SMS-only plans (no voice)
    if (hasSms && !hasVoice) {
      return [
        ...baseSteps,
        {
          id: "test-missed-call",
          title: "Send Test Missed Call",
          description: "Simulate a missed call to see the instant text-back in action",
          icon: MessageSquare,
          completed: false,
          action: () => navigate("/app/simulator"),
          actionLabel: "Open Simulator",
        },
        {
          id: "review-scripts",
          title: "Review Message Scripts",
          description: "Customize your automated SMS responses",
          icon: Settings,
          completed: false,
          action: () => navigate("/app/automations"),
          actionLabel: "View Automations",
        },
      ];
    }

    // Voice-only plans (no SMS)
    if (hasVoice && !hasSms) {
      return [
        ...baseSteps,
        {
          id: "voice-greeting",
          title: "Choose Voice & Greeting",
          description: "Select AI voice and customize the greeting script",
          icon: Mic,
          completed: false,
          action: () => navigate("/app/ai-assistant"),
          actionLabel: "Configure Voice",
        },
        {
          id: "test-ai-call",
          title: "Test AI Call",
          description: "Make a test call to hear your AI receptionist",
          icon: Play,
          completed: false,
          action: () => navigate("/app/simulator"),
          actionLabel: "Open Simulator",
        },
        {
          id: "configure-routing",
          title: "Configure Call Routing",
          description: "Set when AI answers: always, when busy, overflow, or after hours",
          icon: Settings,
          completed: assistantSettings?.voice_mode !== undefined,
          action: () => navigate("/app/ai-assistant"),
          actionLabel: "Configure Routing",
        },
        {
          id: "go-live",
          title: "Enable Go Live",
          description: goLiveEnabled ? "Your AI is live and answering calls!" : "Turn on your AI to start answering real calls",
          icon: Power,
          completed: goLiveEnabled,
          action: () => navigate("/app/ai-assistant"),
          actionLabel: goLiveEnabled ? "Manage" : "Enable",
          required: true,
        },
      ];
    }

    // Both plan
    return [
      ...baseSteps,
      {
        id: "voice-greeting",
        title: "Choose Voice & Greeting",
        description: "Select AI voice and customize the greeting script",
        icon: Mic,
        completed: false,
        action: () => navigate("/app/ai-assistant"),
        actionLabel: "Configure Voice",
      },
      {
        id: "test-simulator",
        title: "Test AI Call + Missed Call",
        description: "Try both features in the simulator",
        icon: Play,
        completed: false,
        action: () => navigate("/app/simulator"),
        actionLabel: "Open Simulator",
      },
      {
        id: "configure-routing",
        title: "Configure Routing & Behavior",
        description: "Set call routing mode and missed call behavior",
        icon: Settings,
        completed: assistantSettings?.voice_mode !== undefined,
        action: () => navigate("/app/ai-assistant"),
        actionLabel: "Configure",
      },
      {
        id: "go-live",
        title: "Enable Go Live",
        description: goLiveEnabled ? "Your AI is live!" : "Turn on your AI to start",
        icon: Power,
        completed: goLiveEnabled,
        action: () => navigate("/app/ai-assistant"),
        actionLabel: goLiveEnabled ? "Manage" : "Enable",
        required: true,
      },
    ];
  };

  const steps = getSteps();
  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allComplete = completedCount === steps.length;

  if (allComplete) {
    return null; // Hide checklist when all done
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Finish Setup
              </CardTitle>
              <CardDescription>
                Complete these steps to get your AI running
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{completedCount}/{steps.length}</p>
              <p className="text-xs text-muted-foreground">completed</p>
            </div>
          </div>
          <Progress value={progress} className="h-2 mt-3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    step.completed 
                      ? 'bg-muted/50' 
                      : 'bg-background border hover:border-primary/50'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    step.completed 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {step.completed ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${step.completed ? 'text-muted-foreground line-through' : ''}`}>
                      {step.title}
                      {step.required && !step.completed && (
                        <span className="ml-2 text-xs text-destructive">Required</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                  {step.action && !step.completed && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={step.action}
                      className="shrink-0"
                    >
                      {step.actionLabel}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ConnectPhoneDialog 
        open={showConnectPhone} 
        onOpenChange={setShowConnectPhone}
        currentSettings={assistantSettings}
        onSuccess={onRefresh}
      />
    </>
  );
}
