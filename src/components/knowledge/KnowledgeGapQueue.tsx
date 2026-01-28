import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { KnowledgeGap } from "@/types/database";
import { 
  AlertTriangle, CheckCircle2, Clock, HelpCircle, 
  DollarSign, MapPin, MessageSquare, X, Plus,
  BookOpen, FileText, ShieldAlert
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
  1: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  3: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

type AddAsType = 'faq' | 'policy' | 'objection';

export default function KnowledgeGapQueue() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  // Add as dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addAsType, setAddAsType] = useState<AddAsType>('faq');
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [saving, setSaving] = useState(false);

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

  const openAddDialog = (gap: KnowledgeGap, type: AddAsType) => {
    setSelectedGap(gap);
    setAddAsType(type);
    setNewQuestion(gap.customer_question || gap.description);
    setNewAnswer('');
    setAddDialogOpen(true);
  };

  const handleAddKnowledge = async () => {
    if (!tenant?.id || !selectedGap) return;
    
    setSaving(true);
    try {
      if (addAsType === 'faq') {
        const { error } = await supabase.from('business_faqs').insert({
          tenant_id: tenant.id,
          question: newQuestion,
          answer: newAnswer,
          priority_weight: 1,
        });
        if (error) throw error;
      } else if (addAsType === 'objection') {
        const { error } = await supabase.from('objection_responses').insert({
          tenant_id: tenant.id,
          objection: newQuestion,
          response: newAnswer,
          priority_weight: 1,
        });
        if (error) throw error;
      } else if (addAsType === 'policy') {
        const { error } = await supabase.from('ai_knowledge_base').insert({
          tenant_id: tenant.id,
          type: 'policy',
          title: newQuestion,
          content: newAnswer,
          priority_weight: 1,
        });
        if (error) throw error;
      }

      // Mark gap as resolved
      await supabase.from('knowledge_gaps').update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: `Added as ${addAsType}`,
      }).eq('id', selectedGap.id);

      toast({ 
        title: "Knowledge added!",
        description: `Added as ${addAsType} and gap resolved.`,
      });
      
      setAddDialogOpen(false);
      setSelectedGap(null);
      setNewQuestion('');
      setNewAnswer('');
      fetchGaps();
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Failed to add knowledge",
        description: error.message,
      });
    } finally {
      setSaving(false);
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Knowledge Gaps
              </CardTitle>
              <CardDescription>
                Questions the AI couldn't answer confidently. Fix these to improve performance.
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {gapTypeLabels[gap.gap_type]}
                            </span>
                            <Badge className={priorityColors[gap.priority || 1]}>
                              {gap.priority === 3 ? 'High' : gap.priority === 2 ? 'Medium' : 'Low'}
                            </Badge>
                            {gap.occurrence_count > 1 && (
                              <Badge variant="outline">
                                {gap.occurrence_count}x asked
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
                        title="Dismiss"
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
                      <div className="pl-11 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          onClick={() => openAddDialog(gap, 'faq')}
                        >
                          <BookOpen className="h-3 w-3" />
                          Add as FAQ
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          onClick={() => openAddDialog(gap, 'policy')}
                        >
                          <FileText className="h-3 w-3" />
                          Add Policy
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          onClick={() => openAddDialog(gap, 'objection')}
                        >
                          <ShieldAlert className="h-3 w-3" />
                          Add Objection
                        </Button>
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

      {/* Add Knowledge Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add as {addAsType === 'faq' ? 'FAQ' : addAsType === 'policy' ? 'Policy' : 'Objection Response'}
            </DialogTitle>
            <DialogDescription>
              Add this to your AI knowledge base to handle similar questions in the future.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={addAsType} onValueChange={(v) => setAddAsType(v as AddAsType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faq">FAQ (Question & Answer)</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="objection">Objection Response</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {addAsType === 'faq' ? 'Question' : addAsType === 'objection' ? 'Customer Objection' : 'Policy Title'}
              </Label>
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={addAsType === 'faq' ? 'What is your cancellation policy?' : 
                            addAsType === 'objection' ? 'That seems expensive...' :
                            'Emergency Service Policy'}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {addAsType === 'faq' ? 'Answer' : addAsType === 'objection' ? 'AI Response' : 'Policy Details'}
              </Label>
              <Textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={4}
                placeholder={addAsType === 'faq' ? 'Enter the answer your AI should give...' :
                            addAsType === 'objection' ? 'Enter how AI should respond to this objection...' :
                            'Describe the policy in detail...'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddKnowledge} 
              disabled={!newQuestion || !newAnswer || saving}
            >
              {saving ? 'Adding...' : 'Add to Knowledge Base'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
