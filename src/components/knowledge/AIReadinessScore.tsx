import { useAuth } from "@/contexts/AuthContext";
import { useBusinessContext, calculateReadinessFromContext, getMissingKnowledge } from "@/hooks/useBusinessContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, CheckCircle2, AlertCircle, ArrowRight, 
  Building2, Clock, FileText, HelpCircle, MessageSquare, Sparkles 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AIReadinessScoreProps {
  compact?: boolean;
}

export default function AIReadinessScore({ compact = false }: AIReadinessScoreProps) {
  const { tenant } = useAuth();
  const { context, loading } = useBusinessContext(tenant?.id || null);
  const navigate = useNavigate();

  const score = calculateReadinessFromContext(context);
  const missingItems = getMissingKnowledge(context);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Ready';
    if (score >= 50) return 'Almost There';
    return 'Needs Work';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Calculating AI readiness...
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">AI Readiness</span>
            <Badge variant="outline" className={getScoreColor(score)}>
              {score}%
            </Badge>
          </div>
          <Progress 
            value={score} 
            className="h-1.5 mt-1"
          />
        </div>
        {score < 80 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/app/settings')}
          >
            Improve
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Readiness Score
            </CardTitle>
            <CardDescription>
              How prepared your AI is to handle customer conversations
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
              {score}%
            </div>
            <Badge variant="outline" className={getScoreColor(score)}>
              {getScoreLabel(score)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress 
          value={score} 
          className="h-3"
        />

        {score >= 80 ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">
              Your AI is ready to handle customer conversations!
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                Add more information to improve AI performance
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Missing:</p>
              <div className="flex flex-wrap gap-2">
                {missingItems.map((item, idx) => (
                  <Badge key={idx} variant="outline" className="text-sm">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              className="w-full gap-2" 
              onClick={() => navigate('/app/settings')}
            >
              Complete Setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Score Breakdown:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <ScoreItem 
              icon={Building2} 
              label="Business Info" 
              complete={!!context?.business.name && !!context?.business.phone}
            />
            <ScoreItem 
              icon={Sparkles} 
              label="Services" 
              complete={(context?.services?.length || 0) >= 3}
            />
            <ScoreItem 
              icon={Clock} 
              label="Business Hours" 
              complete={!!context?.hours && Object.keys(context.hours).length > 0}
            />
            <ScoreItem 
              icon={FileText} 
              label="Policies" 
              complete={!!context?.policies.cancellation}
            />
            <ScoreItem 
              icon={HelpCircle} 
              label="FAQs" 
              complete={(context?.faqs?.length || 0) >= 3}
            />
            <ScoreItem 
              icon={MessageSquare} 
              label="Objections" 
              complete={(context?.objection_responses?.length || 0) >= 2}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreItem({ 
  icon: Icon, 
  label, 
  complete 
}: { 
  icon: React.ElementType; 
  label: string; 
  complete: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded ${complete ? 'bg-green-50' : 'bg-muted'}`}>
      <Icon className={`h-4 w-4 ${complete ? 'text-green-500' : 'text-muted-foreground'}`} />
      <span className={complete ? 'text-green-700' : 'text-muted-foreground'}>{label}</span>
      {complete && <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />}
    </div>
  );
}
