import { useAuth } from "@/contexts/AuthContext";
import { useBusinessContext, calculateReadinessFromContext } from "@/hooks/useBusinessContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, Circle, Brain, Phone, Mic, 
  Settings, ArrowRight, Rocket, Sparkles 
} from "lucide-react";
import { Link } from "react-router-dom";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  isComplete: boolean;
  link: string;
  linkLabel: string;
  icon: React.ElementType;
  required: boolean;
}

export function GoLiveChecklist() {
  const { tenant, assistantSettings } = useAuth();
  const { context, loading } = useBusinessContext(tenant?.id || null);

  const readinessScore = calculateReadinessFromContext(context);
  
  // Determine completion status
  const brainComplete = readinessScore >= 70;
  const phoneComplete = assistantSettings?.phone_connected || !!(assistantSettings as any)?.setup_step_phone;
  const testComplete = (assistantSettings as any)?.setup_step_tested || false;
  const handoffComplete = true; // Optional, always considered done for MVP
  const goLiveEnabled = assistantSettings?.go_live_enabled || false;

  const checklistItems: ChecklistItem[] = [
    {
      id: 'brain',
      label: 'Business Brain',
      description: `AI readiness: ${readinessScore}%`,
      isComplete: brainComplete,
      link: '/app/brain',
      linkLabel: 'Edit Knowledge',
      icon: Brain,
      required: true,
    },
    {
      id: 'phone',
      label: 'Phone Connected',
      description: phoneComplete 
        ? assistantSettings?.closeloop_number || 'Connected' 
        : 'Connect your AI phone number',
      isComplete: phoneComplete,
      link: '/app/settings',
      linkLabel: 'Connect Phone',
      icon: Phone,
      required: true,
    },
    {
      id: 'test',
      label: 'Test Call Completed',
      description: testComplete ? 'AI tested successfully' : 'Try a test call or text',
      isComplete: testComplete,
      link: '/app/simulator',
      linkLabel: 'Test AI',
      icon: Mic,
      required: true,
    },
    {
      id: 'handoff',
      label: 'Handoff Configured',
      description: 'How bookings/orders are delivered',
      isComplete: handoffComplete,
      link: '/app/settings',
      linkLabel: 'Configure',
      icon: Settings,
      required: false,
    },
  ];

  const requiredComplete = checklistItems.filter(i => i.required && i.isComplete).length;
  const requiredTotal = checklistItems.filter(i => i.required).length;
  const canGoLive = requiredComplete === requiredTotal;
  const progress = (requiredComplete / requiredTotal) * 100;

  if (goLiveEnabled) {
    return (
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold flex items-center gap-2">
                You're Live!
                <Badge variant="default">Active</Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                Your AI is answering calls 24/7
              </p>
            </div>
            <Link to="/app/calls">
              <Button variant="outline" size="sm" className="gap-2">
                View Calls
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Go Live Checklist
            </CardTitle>
            <CardDescription>
              Complete these steps to activate your AI
            </CardDescription>
          </div>
          <Badge variant={canGoLive ? "default" : "secondary"}>
            {requiredComplete}/{requiredTotal} complete
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {checklistItems.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                item.isComplete ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
              }`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                item.isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {item.isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${item.isComplete ? 'text-foreground' : ''}`}>
                    {item.label}
                  </span>
                  {!item.required && (
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
              {!item.isComplete && (
                <Link to={item.link}>
                  <Button variant="outline" size="sm" className="text-xs shrink-0">
                    {item.linkLabel}
                  </Button>
                </Link>
              )}
            </div>
          );
        })}

        {/* Go Live Button */}
        <div className="pt-3 border-t">
          {canGoLive ? (
            <Link to="/app/go-live">
              <Button className="w-full gap-2">
                <Rocket className="h-4 w-4" />
                Go Live Now
              </Button>
            </Link>
          ) : (
            <Button className="w-full gap-2" disabled>
              <Circle className="h-4 w-4" />
              Complete Required Steps to Go Live
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
