import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, Check, AlertCircle, ArrowRight, CheckCircle2,
  Package, Clock, HelpCircle, FileText
} from "lucide-react";
import { useAIReadinessV2, formatReadinessFlag } from "@/hooks/useAIReadinessV2";

interface ConfigureAIStepProps {
  onComplete: () => void;
  isComplete: boolean;
}

export function ConfigureAIStep({ onComplete, isComplete }: ConfigureAIStepProps) {
  const navigate = useNavigate();
  const { score, p0Flags, p1Flags, loading } = useAIReadinessV2();

  const readinessPercent = score || 0;
  const meetsThreshold = readinessPercent >= 85 && p0Flags.length === 0;

  const getFixPath = (flag: string): string => {
    const paths: Record<string, string> = {
      missing_hours: "/app/business-brain?section=hours",
      no_services: "/app/business-brain?section=services",
      few_services: "/app/business-brain?section=services",
      missing_pricing: "/app/business-brain?section=services",
      no_menu_items: "/app/business-brain?section=services",
      few_menu_items: "/app/business-brain?section=services",
      missing_menu_prices: "/app/business-brain?section=services",
      no_dispatch_services: "/app/business-brain?section=services",
      missing_faqs: "/app/business-brain?section=knowledge",
      few_faqs: "/app/business-brain?section=knowledge",
      missing_policies: "/app/business-brain?section=policies",
      missing_phone: "/app/go-live",
      missing_booking_mode: "/app/business-brain?section=availability",
      missing_service_area: "/app/business-brain?section=service-area",
    };
    return paths[flag] || "/app/business-brain";
  };

  const getIcon = (flag: string) => {
    if (flag.includes('hours')) return <Clock className="h-4 w-4 text-muted-foreground" />;
    if (flag.includes('services') || flag.includes('menu')) return <Package className="h-4 w-4 text-muted-foreground" />;
    if (flag.includes('faqs')) return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    if (flag.includes('policies')) return <FileText className="h-4 w-4 text-muted-foreground" />;
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };

  if (isComplete || meetsThreshold) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Check className="h-5 w-5" />
            AI Knowledge Ready
          </CardTitle>
          <CardDescription>
            Your AI has everything it needs to answer calls effectively.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score display */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Readiness Score</span>
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {readinessPercent}%
            </Badge>
          </div>
          
          <Button 
            onClick={onComplete}
            className="w-full gap-2"
          >
            Continue to Go Live
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Configure Your AI Knowledge
        </CardTitle>
        <CardDescription>
          Fill out your business information so your AI knows how to help customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Readiness Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Readiness</span>
            <span className={`text-sm font-medium ${readinessPercent >= 85 ? 'text-primary' : 'text-muted-foreground'}`}>
              {loading ? "..." : `${readinessPercent}%`}
            </span>
          </div>
          <Progress value={readinessPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Reach 85% to unlock Go Live. Your AI needs this info to answer calls correctly.
          </p>
        </div>

        {/* Blocking Issues (P0) */}
        {p0Flags.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Required to Go Live</span>
            </div>
            <div className="space-y-2">
              {p0Flags.slice(0, 4).map((flag) => (
                <div 
                  key={flag}
                  className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div className="flex items-center gap-2">
                    {getIcon(flag)}
                    <span className="text-sm">{formatReadinessFlag(flag)}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(getFixPath(flag))}
                    className="gap-1 text-xs"
                  >
                    Fix
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Improvements (P1) */}
        {p1Flags.length > 0 && p0Flags.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Recommended Improvements</span>
            </div>
            <div className="space-y-2">
              {p1Flags.slice(0, 3).map((flag) => (
                <div 
                  key={flag}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <span className="text-sm text-muted-foreground">{formatReadinessFlag(flag)}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(getFixPath(flag))}
                    className="gap-1 text-xs"
                  >
                    Add
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main CTA */}
        <Button 
          onClick={() => navigate("/app/business-brain")}
          className="w-full gap-2"
          size="lg"
        >
          <Brain className="h-5 w-5" />
          Open Business Brain
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          This is where your AI learns about your business
        </p>
      </CardContent>
    </Card>
  );
}
