import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, CheckCircle2, AlertCircle, Building2, 
  Clock, Sparkles, FileText, HelpCircle, MessageSquare,
  ShieldAlert
} from "lucide-react";

interface KnowledgeItem {
  category: string;
  icon: React.ElementType;
  items: string[];
  status: 'complete' | 'partial' | 'missing';
}

interface AIKnowledgePreviewProps {
  businessName: string;
  services: { name: string }[];
  faqs: { question: string }[];
  objections: { objection: string }[];
  policies: {
    cancellationPolicy: string;
    depositPolicy: string;
  };
  businessHours: Record<string, { open: string; close: string; closed: boolean }>;
  intakeQuestions: { label: string }[];
  aiNeverPromise: string[];
}

export function AIKnowledgePreview({
  businessName,
  services,
  faqs,
  objections,
  policies,
  businessHours,
  intakeQuestions,
  aiNeverPromise,
}: AIKnowledgePreviewProps) {
  // Calculate readiness score
  let score = 0;
  
  if (businessName) score += 15;
  if (services.length >= 1) score += 10;
  if (services.length >= 3) score += 10;
  if (Object.values(businessHours).some(h => !h.closed)) score += 10;
  if (policies.cancellationPolicy) score += 10;
  if (policies.depositPolicy) score += 5;
  if (faqs.length >= 3) score += 15;
  if (faqs.length >= 6) score += 5;
  if (objections.length >= 2) score += 10;
  if (intakeQuestions.length >= 2) score += 5;
  if (aiNeverPromise.length >= 1) score += 5;

  score = Math.min(score, 100);

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Ready';
    if (s >= 50) return 'Almost There';
    return 'Needs Work';
  };

  const knowledgeItems: KnowledgeItem[] = [
    {
      category: 'Business Identity',
      icon: Building2,
      items: businessName ? [businessName] : [],
      status: businessName ? 'complete' : 'missing',
    },
    {
      category: 'Services',
      icon: Sparkles,
      items: services.slice(0, 5).map(s => s.name),
      status: services.length >= 3 ? 'complete' : services.length > 0 ? 'partial' : 'missing',
    },
    {
      category: 'Business Hours',
      icon: Clock,
      items: Object.entries(businessHours)
        .filter(([_, h]) => !h.closed)
        .slice(0, 3)
        .map(([day, h]) => `${day}: ${h.open}-${h.close}`),
      status: Object.values(businessHours).some(h => !h.closed) ? 'complete' : 'missing',
    },
    {
      category: 'FAQs',
      icon: HelpCircle,
      items: faqs.slice(0, 4).map(f => f.question),
      status: faqs.length >= 3 ? 'complete' : faqs.length > 0 ? 'partial' : 'missing',
    },
    {
      category: 'Objection Handling',
      icon: MessageSquare,
      items: objections.slice(0, 3).map(o => o.objection),
      status: objections.length >= 2 ? 'complete' : objections.length > 0 ? 'partial' : 'missing',
    },
    {
      category: 'Policies',
      icon: FileText,
      items: [
        policies.cancellationPolicy ? 'Cancellation policy' : '',
        policies.depositPolicy ? 'Deposit policy' : '',
      ].filter(Boolean),
      status: policies.cancellationPolicy ? 'complete' : 'missing',
    },
    {
      category: 'Do NOT Promise',
      icon: ShieldAlert,
      items: aiNeverPromise.slice(0, 3),
      status: aiNeverPromise.length > 0 ? 'complete' : 'partial',
    },
  ];

  const statusIcon = (status: string) => {
    if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === 'partial') return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">What the AI Knows</CardTitle>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}%
            </span>
            <Badge variant="outline" className={`ml-2 ${getScoreColor(score)}`}>
              {getScoreLabel(score)}
            </Badge>
          </div>
        </div>
        <Progress value={score} className="h-2" />
        <CardDescription className="text-xs mt-2">
          AI Readiness Score • Higher score = better call quality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {knowledgeItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.category} className="flex items-start gap-3">
              <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 ${
                item.status === 'complete' ? 'bg-primary/10' :
                item.status === 'partial' ? 'bg-accent/50' : 'bg-destructive/10'
              }`}>
                <Icon className={`h-4 w-4 ${
                  item.status === 'complete' ? 'text-primary' :
                  item.status === 'partial' ? 'text-accent-foreground' : 'text-destructive'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.category}</span>
                  {statusIcon(item.status)}
                </div>
                {item.items.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.items.map((text, i) => (
                      <Badge key={i} variant="secondary" className="text-xs truncate max-w-[150px]">
                        {text}
                      </Badge>
                    ))}
                    {item.items.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not configured</p>
                )}
              </div>
            </div>
          );
        })}

        {score < 80 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Tip: Add more FAQs and objection responses to improve call quality
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
