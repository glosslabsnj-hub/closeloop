import { Link } from "react-router-dom";
import { useAIReadiness, type ReadinessItem } from "@/hooks/useAIReadiness";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Clock,
  Briefcase,
  UtensilsCrossed,
  FileText,
  HelpCircle,
  Calendar,
  Phone,
  Webhook,
  ListChecks
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  hours: Clock,
  services: Briefcase,
  menu: UtensilsCrossed,
  policies: FileText,
  intake: ListChecks,
  faqs: HelpCircle,
  calendar: Calendar,
  phone: Phone,
  webhook: Webhook,
};

interface AIReadinessChecklistProps {
  compact?: boolean;
}

/**
 * Full AI Readiness checklist with weighted scoring
 * Used on /app/business-brain and /app/go-live
 */
export function AIReadinessChecklist({ compact = false }: AIReadinessChecklistProps) {
  const { score, items, isReady, loading } = useAIReadiness();
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Calculating AI readiness...
        </CardContent>
      </Card>
    );
  }
  
  const getScoreColor = () => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-rose-400';
  };
  
  const getScoreLabel = () => {
    if (score >= 85) return 'Ready to Go Live';
    if (score >= 70) return 'Almost There';
    if (score >= 50) return 'Getting Started';
    return 'Needs Attention';
  };

  if (compact) {
    const incompleteCount = items.filter(i => !i.complete).length;
    
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">AI Readiness</span>
            <Badge variant="outline" className={getScoreColor()}>
              {score}%
            </Badge>
          </div>
          <div className="h-1.5 mt-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        {incompleteCount > 0 && (
          <Badge variant="secondary">{incompleteCount} left</Badge>
        )}
      </div>
    );
  }

  // Group items by priority (required vs recommended)
  const requiredItems = items.filter(i => i.priority === 'required');
  const recommendedItems = items.filter(i => i.priority === 'recommended');

  // Count incomplete by priority
  const incompleteRequired = requiredItems.filter(i => !i.complete).length;
  const incompleteRecommended = recommendedItems.filter(i => !i.complete).length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>AI Readiness Score</CardTitle>
              <CardDescription>
                Complete these items to ensure your AI performs well
              </CardDescription>
            </div>
          </div>
          
          {/* Score Ring */}
          <div className="relative hidden sm:block">
            <svg className="h-20 w-20 -rotate-90">
              <circle
                className="text-muted"
                strokeWidth="6"
                stroke="currentColor"
                fill="transparent"
                r="34"
                cx="40"
                cy="40"
              />
              <circle
                className="text-primary transition-all duration-500"
                strokeWidth="6"
                strokeDasharray={34 * 2 * Math.PI}
                strokeDashoffset={34 * 2 * Math.PI * (1 - score / 100)}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="34"
                cx="40"
                cy="40"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor()}`}>{score}%</span>
            </div>
          </div>
          
          {/* Mobile Score */}
          <div className="sm:hidden">
            <Badge variant="outline" className={`text-lg px-3 py-1 ${getScoreColor()}`}>
              {score}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Message */}
        {isReady ? (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Your AI is ready to go live! All critical items are complete.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              {getScoreLabel()} — Complete the items below to reach 85% and go live safely.
            </span>
          </div>
        )}
        
        {/* Required Section - Must complete to go live */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Required for Launch</span>
            </h4>
            {incompleteRequired > 0 ? (
              <Badge variant="destructive" className="text-xs">
                {incompleteRequired} blocking
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">
                All complete
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These items must be completed before going live. Your AI cannot function properly without them.
          </p>
          <div className="grid gap-2">
            {requiredItems.map(item => (
              <ReadinessItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Recommended Section - Improve AI quality */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span>Recommended</span>
            </h4>
            {incompleteRecommended > 0 && (
              <Badge variant="secondary" className="text-xs">
                {incompleteRecommended} remaining
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These items improve your AI's performance but aren't required to go live.
          </p>
          <div className="grid gap-2">
            {recommendedItems.map(item => (
              <ReadinessItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessItemRow({ item }: { item: ReadinessItem }) {
  const Icon = iconMap[item.id] || HelpCircle;

  return (
    <Link to={item.href}>
      <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
        item.complete
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : item.priority === 'required'
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-muted/30 border-border'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            item.complete
              ? 'bg-emerald-500/15'
              : item.priority === 'required'
                ? 'bg-amber-500/15'
                : 'bg-muted'
          }`}>
            <Icon className={`h-4 w-4 ${
              item.complete
                ? 'text-emerald-400'
                : item.priority === 'required'
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
            }`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{item.label}</p>
              {item.priority === 'required' && !item.complete && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-500/30">
                  Required
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
            {/* Show impact explanation for incomplete items */}
            {!item.complete && item.impact && (
              <p className="text-xs text-amber-600/80 mt-0.5 italic">{item.impact}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-xs ${item.complete ? 'text-emerald-400 border-emerald-500/30' : ''}`}>
            +{item.weight} pts
          </Badge>
          {item.complete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </Link>
  );
}
