import { Link } from "react-router-dom";
import { useAIReadiness } from "@/hooks/useAIReadiness";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Sparkles
} from "lucide-react";

/**
 * Dashboard banner that shows AI readiness score
 * Only visible when score < 85
 */
export function AIReadinessBanner() {
  const { score, items, isReady, loading } = useAIReadiness();
  
  if (loading) return null;
  if (isReady) return null; // Hide when ready
  
  const incompleteItems = items.filter(i => !i.complete);
  const topPriority = incompleteItems
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);
  
  const getScoreColor = () => {
    if (score >= 70) return 'text-amber-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-rose-400';
  };
  
  const getScoreBg = () => {
    if (score >= 70) return 'bg-amber-500/15 border-amber-500/30';
    if (score >= 50) return 'bg-orange-500/15 border-orange-500/30';
    return 'bg-rose-500/15 border-rose-500/30';
  };

  return (
    <Card className={`border ${getScoreBg()}`}>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Score Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">AI Readiness</span>
                <Badge variant="outline" className={getScoreColor()}>
                  {score}%
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={score} className="w-24 h-1.5" />
                <span className="text-xs text-muted-foreground">
                  Need 85% to go live safely
                </span>
              </div>
            </div>
          </div>
          
          {/* Priority Items */}
          <div className="flex-1 flex flex-wrap gap-2">
            {topPriority.map(item => (
              <Link 
                key={item.id}
                to={item.href}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
              >
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span>{item.label}</span>
                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                  +{item.weight}
                </Badge>
              </Link>
            ))}
          </div>
          
          {/* Action Button - Route to Fix Center */}
          <Button size="sm" className="gap-1 shrink-0" asChild>
            <Link to="/app/readiness">
              <Sparkles className="h-3.5 w-3.5" />
              Fix Issues
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
