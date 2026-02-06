import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Power, Check, Loader2, Sparkles, Phone, Calendar, MessageSquare, Shield, AlertTriangle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";

interface GoLiveStepProps {
  onComplete: () => void;
  isComplete: boolean;
  canActivate: boolean; // Basic prerequisite (phone + test)
}

export function GoLiveStep({ onComplete, isComplete, canActivate }: GoLiveStepProps) {
  const { tenant, assistantSettings, subscription, refreshTenant } = useAuth();
  const { toast } = useToast();
  const { score, canGoLive, p0Flags, loading: readinessLoading } = useAIReadinessV2();

  const [showConfirm, setShowConfirm] = useState(false);
  const [activating, setActivating] = useState(false);
  const isLive = assistantSettings?.go_live_enabled || false;

  // Plan-based feature filtering using centralized helpers
  const planCode = subscription?.plan_code || null;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);

  // CRITICAL: Go live requires 85%+ readiness score AND no P0 blockers
  const meetsReadinessRequirements = canGoLive; // This checks score >= 85 AND p0Flags.length === 0
  const fullyCanActivate = canActivate && meetsReadinessRequirements;

  // Filter features based on plan capabilities
  const features = useMemo(() => {
    const allFeatures = [];
    if (hasVoice) {
      allFeatures.push({ icon: Phone, text: "Answer calls you miss or can't take" });
    }
    if (hasSms) {
      allFeatures.push({ icon: MessageSquare, text: "Send instant texts to missed callers" });
    }
    allFeatures.push(
      { icon: Calendar, text: "Direct customers to book appointments" },
      { icon: Shield, text: "Work 24/7, even when you're closed" }
    );
    return allFeatures;
  }, [hasVoice, hasSms]);

  const handleGoLive = async () => {
    if (!tenant) return;

    setActivating(true);
    try {
      const { error } = await supabase
        .from("assistant_settings")
        .upsert({
          tenant_id: tenant.id,
          go_live_enabled: true,
          setup_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "tenant_id",
        });

      if (error) throw error;

      await refreshTenant();
      setShowConfirm(false);
      
      toast({
        title: "🎉 You're Live!",
        description: "Your AI is now answering calls and booking appointments.",
      });
      onComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Activation Failed",
        description: error.message,
      });
    } finally {
      setActivating(false);
    }
  };

  const handleToggleLive = async (enabled: boolean) => {
    if (!tenant) return;

    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          go_live_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      await refreshTenant();
      toast({
        title: enabled ? "AI Activated" : "AI Paused",
        description: enabled 
          ? "Your AI is now answering calls" 
          : "Your AI is paused and won't answer calls",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    }
  };

  if (isComplete || isLive) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            Your AI is Live! 🎉
          </CardTitle>
          <CardDescription>
            Your AI assistant is actively answering calls and helping customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-background/80">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
              <span className="font-medium">AI Agent Status</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isLive ? "default" : "secondary"}>
                {isLive ? "Active" : "Paused"}
              </Badge>
              <Switch
                checked={isLive}
                onCheckedChange={handleToggleLive}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={!fullyCanActivate ? "opacity-90" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-primary" />
            Go Live
          </CardTitle>
          <CardDescription>
            {fullyCanActivate 
              ? "You're ready! Activate your AI to start answering calls."
              : "Complete your setup to activate your AI."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Readiness Score - Always show */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Readiness</span>
              </div>
              <Badge variant={meetsReadinessRequirements ? "default" : "secondary"}>
                {readinessLoading ? "..." : `${score}%`}
              </Badge>
            </div>
            <Progress value={score} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {meetsReadinessRequirements 
                ? "Your AI is ready to go live!"
                : "Need 85% or higher to go live. Complete your Business Brain setup."
              }
            </p>
            
            {/* P0 Blockers */}
            {p0Flags.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {p0Flags.length} blocking issue{p0Flags.length > 1 ? "s" : ""} to fix:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {p0Flags.slice(0, 3).map((flag, i) => (
                    <li key={i} className="flex items-center gap-1">
                      • {flag}
                    </li>
                  ))}
                  {p0Flags.length > 3 && (
                    <li className="text-muted-foreground">
                      +{p0Flags.length - 3} more...
                    </li>
                  )}
                </ul>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link to="/app/business-brain">
                    <Brain className="h-3 w-3 mr-1" />
                    Open Business Brain
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* What happens when you go live */}
          <div className="space-y-3">
            <p className="text-sm font-medium">When you go live, your AI will:</p>
            <div className="grid gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <feature.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Go Live Button */}
          <Button 
            onClick={() => setShowConfirm(true)}
            disabled={!fullyCanActivate || readinessLoading}
            size="lg"
            className="w-full gap-2 h-14 text-lg"
          >
            <Power className="h-5 w-5" />
            {readinessLoading ? "Checking readiness..." : "Go Live Now"}
          </Button>

          {!fullyCanActivate && !readinessLoading && (
            <p className="text-xs text-center text-muted-foreground">
              {!canActivate 
                ? "Complete the phone and testing steps above first"
                : "Complete your Business Brain setup to reach 85% readiness"
              }
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ready to Go Live?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your AI assistant will start answering calls and booking appointments immediately. 
              You can pause it anytime from your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not Yet</AlertDialogCancel>
            <AlertDialogAction onClick={handleGoLive} disabled={activating} className="gap-2">
              {activating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {activating ? "Activating..." : "Yes, Go Live!"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
