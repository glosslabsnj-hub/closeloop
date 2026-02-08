import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessContext, calculateReadinessFromContext } from "@/hooks/useBusinessContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Building2,
  Clock,
  Briefcase,
  FileText,
  HelpCircle,
  UtensilsCrossed,
  ChevronRight
} from "lucide-react";

interface StatusItem {
  id: string;
  label: string;
  complete: boolean;
  icon: React.ElementType;
  count?: number;
  target?: number;
}

export function KnowledgeStatusBar() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const { context, loading } = useBusinessContext(tenant?.id || null);

  const score = calculateReadinessFromContext(context);

  const statusItems = useMemo<StatusItem[]>(() => {
    const items: StatusItem[] = [
      {
        id: 'identity',
        label: 'Identity',
        complete: !!(context?.business.name && context?.business.phone),
        icon: Building2,
      },
      {
        id: 'hours',
        label: 'Hours',
        complete: !!(context?.hours && Object.keys(context.hours).length > 0),
        icon: Clock,
      },
    ];

    // Mode-specific: Menu vs Services
    if (caps.isFoodBusiness) {
      items.push({
        id: 'menu',
        label: 'Menu',
        complete: (context?.services?.length || 0) >= 5,
        icon: UtensilsCrossed,
        count: context?.services?.length || 0,
      });
    } else {
      items.push({
        id: 'services',
        label: 'Services',
        complete: (context?.services?.length || 0) >= 3,
        icon: Briefcase,
        count: context?.services?.length || 0,
      });
    }

    items.push(
      {
        id: 'faqs',
        label: 'FAQs',
        complete: (context?.faqs?.length || 0) >= 3,
        icon: HelpCircle,
        count: context?.faqs?.length || 0,
        target: 3,
      },
      {
        id: 'policies',
        label: 'Policies',
        complete: !!(context?.policies.cancellation || context?.policies.deposit),
        icon: FileText,
      }
    );

    return items;
  }, [context, businessMode]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/15';
    if (score >= 50) return 'bg-amber-500/15';
    return 'bg-rose-500/15';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-6 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Top: Score + Progress */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getScoreBg(score)}`}>
              <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}%</span>
              <span className="text-sm text-muted-foreground">Ready</span>
            </div>
            <div className="flex-1">
              <Progress value={score} className="h-2" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-xs"
              onClick={() => navigate("/app/business-brain")}
            >
              Review
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {/* Bottom: Status Pills */}
          <div className="flex flex-wrap gap-2">
            {statusItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  item.complete
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {item.complete ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="opacity-70">
                    ({item.count}{item.target ? `/${item.target}` : ''})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
