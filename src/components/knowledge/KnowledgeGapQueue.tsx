import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { KnowledgeGap } from "@/types/database";
import { 
  AlertTriangle, CheckCircle2, Clock, HelpCircle, 
  DollarSign, MapPin, MessageSquare, X 
} from "lucide-react";

const gapTypeIcons: Record<string, React.ElementType> = {
  missing_policy: AlertTriangle,
  missing_pricing: DollarSign,
  missing_service_area: MapPin,
  unanswered_question: HelpCircle,
  missing_hours: Clock,
  missing_faq: MessageSquare,
  other: HelpCircle,
};

const gapTypeLabels: Record<string, string> = {
  missing_policy: 'Missing Policy',
  missing_pricing: 'Missing Pricing',
  missing_service_area: 'Service Area',
  unanswered_question: 'Unanswered Question',
  missing_hours: 'Missing Hours',
  missing_faq: 'Missing FAQ',
  other: 'Other',
};

const priorityColors: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-red-100 text-red-800',
};

export default function KnowledgeGapQueue() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (tenant?.id) {
      fetchGaps();
    }
  }, [tenant?.id]);

  const fetchGaps = async () => {
    if (!tenant?.id) return;

    const { data, error } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('resolved', false)
      .order('priority', { ascending: false })
      .order('occurrence_count', { ascending: false });

    if (error) {
      console.error('Failed to fetch knowledge gaps:', error);
    } else {
      setGaps(data || []);
    }
    setLoading(false);
  };

  const resolveGap = async (gapId: string) => {
    const { error } = await supabase
      .from('knowledge_gaps')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes || 'Resolved',
      })
      .eq('id', gapId);

    if (error) {
      toast({ variant: "destructive", title: "Failed to resolve gap" });
    } else {
      toast({ title: "Knowledge gap resolved!" });
      setResolvingId(null);
      setResolutionNotes('');
      fetchGaps();
    }
  };

  const dismissGap = async (gapId: string) => {
    const { error } = await supabase
      .from('knowledge_gaps')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: 'Dismissed - not applicable',
      })
      .eq('id', gapId);

    if (error) {
      toast({ variant: "destructive", title: "Failed to dismiss gap" });
    } else {
      fetchGaps();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading knowledge gaps...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Knowledge Gaps
            </CardTitle>
            <CardDescription>
              Issues the AI couldn't handle confidently - fix these to improve performance
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg">
            {gaps.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium">No knowledge gaps!</p>
            <p className="text-sm text-muted-foreground">
              Your AI has all the information it needs.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap) => {
              const Icon = gapTypeIcons[gap.gap_type] || HelpCircle;
              const isResolving = resolvingId === gap.id;

              return (
                <div
                  key={gap.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {gapTypeLabels[gap.gap_type]}
                          </span>
                          <Badge className={priorityColors[gap.priority || 1]}>
                            {gap.priority === 3 ? 'High' : gap.priority === 2 ? 'Medium' : 'Low'}
                          </Badge>
                          {gap.occurrence_count > 1 && (
                            <Badge variant="outline">
                              {gap.occurrence_count}x
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {gap.description}
                        </p>
                        {gap.customer_question && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">
                            Customer asked: "{gap.customer_question}"
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => dismissGap(gap.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {isResolving ? (
                    <div className="space-y-2 pl-11">
                      <Textarea
                        placeholder="What did you fix? (optional)"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => resolveGap(gap.id)}>
                          Mark Resolved
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setResolvingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-11">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResolvingId(gap.id)}
                      >
                        I Fixed This
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
