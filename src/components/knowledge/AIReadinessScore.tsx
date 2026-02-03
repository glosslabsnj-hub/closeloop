import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useBusinessContext, calculateReadinessFromContext, getMissingKnowledge } from "@/hooks/useBusinessContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, CheckCircle2, AlertCircle, ChevronRight,
  Building2, Clock, FileText, HelpCircle, MessageSquare, Sparkles,
  UtensilsCrossed, Briefcase
} from "lucide-react";

interface AIReadinessScoreProps {
  compact?: boolean;
}

interface ScoreItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  href: string;
  points: number;
  complete: boolean;
}

export default function AIReadinessScore({ compact = false }: AIReadinessScoreProps) {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { context, loading } = useBusinessContext(tenant?.id || null);
  const navigate = useNavigate();

  const score = calculateReadinessFromContext(context);

  const scoreItems = useMemo<ScoreItem[]>(() => {
    const items: ScoreItem[] = [
      {
        id: 'identity',
        label: 'Business Identity',
        description: 'Name, phone, address, tagline',
        icon: Building2,
        iconBg: 'bg-blue-500/15',
        iconColor: 'text-blue-400',
        href: '/app/settings',
        points: 20,
        complete: !!(context?.business.name && context?.business.phone),
      },
      {
        id: 'hours',
        label: 'Business Hours',
        description: 'When you are open',
        icon: Clock,
        iconBg: 'bg-purple-500/15',
        iconColor: 'text-purple-400',
        href: '/app/settings',
        points: 10,
        complete: !!(context?.hours && Object.keys(context.hours).length > 0),
      },
    ];

    // Industry-specific: Menu for food, Services for others
    if (businessMode === 'food') {
      items.push({
        id: 'menu',
        label: 'Menu Items',
        description: 'Your menu with prices',
        icon: UtensilsCrossed,
        iconBg: 'bg-orange-500/15',
        iconColor: 'text-orange-400',
        href: '/app/business-brain',
        points: 20,
        complete: (context?.services?.length || 0) >= 5, // menu_items mapped to services
      });
    } else {
      items.push({
        id: 'services',
        label: 'Services & Pricing',
        description: 'What you offer and pricing',
        icon: Briefcase,
        iconBg: 'bg-emerald-500/15',
        iconColor: 'text-emerald-400',
        href: '/app/services',
        points: 20,
        complete: (context?.services?.length || 0) >= 3,
      });
    }

    items.push(
      {
        id: 'policies',
        label: 'Policies',
        description: 'Cancellation, deposits, payments',
        icon: FileText,
        iconBg: 'bg-rose-500/15',
        iconColor: 'text-rose-400',
        href: '/app/settings',
        points: 15,
        complete: !!(context?.policies.cancellation || context?.policies.deposit),
      },
      {
        id: 'faqs',
        label: 'FAQs',
        description: 'Common questions answered',
        icon: HelpCircle,
        iconBg: 'bg-cyan-500/15',
        iconColor: 'text-cyan-400',
        href: '/app/ai-assistant',
        points: 20,
        complete: (context?.faqs?.length || 0) >= 3,
      },
      {
        id: 'objections',
        label: 'Objection Handling',
        description: 'How to respond to pushback',
        icon: MessageSquare,
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-400',
        href: '/app/ai-assistant',
        points: 15,
        complete: (context?.objection_responses?.length || 0) >= 2,
      }
    );

    return items;
  }, [context, businessMode]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Ready';
    if (score >= 50) return 'Almost There';
    return 'Needs Work';
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
          <div className="h-1.5 mt-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        {score < 80 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/app/business-brain')}
          >
            Improve
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          {/* Left: Title + description */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>AI Readiness Score</CardTitle>
              <CardDescription>
                How prepared your AI is to handle conversations
              </CardDescription>
            </div>
          </div>
          
          {/* Right: Large score with ring */}
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
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
            </div>
          </div>
          
          {/* Mobile: Just show score badge */}
          <div className="sm:hidden">
            <Badge variant="outline" className={`text-lg px-3 py-1 ${getScoreColor(score)}`}>
              {score}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status message */}
        {score >= 80 ? (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Your AI is ready to handle customer conversations!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Complete these items to improve your AI's knowledge</span>
          </div>
        )}
        
        {/* Actionable Checklist */}
        <div className="grid gap-2">
          {scoreItems.map(item => (
            <Link to={item.href} key={item.id}>
              <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                item.complete 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : 'bg-muted/30 border-border'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    item.complete ? item.iconBg : 'bg-muted'
                  }`}>
                    <item.icon className={`h-4 w-4 ${
                      item.complete ? item.iconColor : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${item.complete ? 'text-emerald-400 border-emerald-500/30' : ''}`}>
                    +{item.points} pts
                  </Badge>
                  {item.complete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
