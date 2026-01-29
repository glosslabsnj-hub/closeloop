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
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                You're Live!
                <Badge variant="default" className="text-xs">Active</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                AI answering calls 24/7
              </p>
            </div>
            <Link to="/app/calls">
              <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0">
                Calls
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact checklist for when not live
  const incompleteItems = checklistItems.filter(i => !i.isComplete && i.required).slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Setup Progress
          </CardTitle>
          <Badge variant={canGoLive ? "default" : "secondary"} className="text-xs">
            {requiredComplete}/{requiredTotal}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {incompleteItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.id}
              to={item.link}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="h-7 w-7 rounded-full flex items-center justify-center bg-muted">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}

        {canGoLive ? (
          <Link to="/app/go-live">
            <Button className="w-full gap-2 mt-2" size="sm">
              <Rocket className="h-4 w-4" />
              Go Live Now
            </Button>
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Complete {requiredTotal - requiredComplete} more step{requiredTotal - requiredComplete > 1 ? 's' : ''} to go live
          </p>
        )}
      </CardContent>
    </Card>
  );
}
