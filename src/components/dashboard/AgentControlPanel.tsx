import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";
import {
  Phone,
  MessageSquare,
  Settings2,
  FlaskConical,
  Brain,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AgentOffBehaviorModal } from "./AgentOffBehaviorModal";

/**
 * AgentControlPanel - Clean, focused control for the AI agent
 * Premium workspace aesthetic with calm, confident design
 */
export function AgentControlPanel() {
  const { tenant, assistantSettings, refreshTenant, subscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const planCode = subscription?.plan_code;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);

  const voiceEnabled = assistantSettings?.voice_ai_enabled && assistantSettings?.go_live_enabled;
  const smsEnabled = assistantSettings?.instant_text_enabled || false;
  
  // Check both forwarding_phone_e164 (real Twilio number) and closeloop_number (legacy)
  const closeloopNumber = (assistantSettings as any)?.forwarding_phone_e164 || assistantSettings?.closeloop_number;
  
  // Only show as "Active" if phone is actually connected
  const isActive = (voiceEnabled || smsEnabled) && !!closeloopNumber;

  const [offBehaviorModalOpen, setOffBehaviorModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (!tenant) return;

    // If turning OFF with voice, check off_behavior is configured
    if (!enabled && hasVoice) {
      const offBehavior = (assistantSettings as any)?.off_behavior || "FORWARD_OWNER";
      const forwardNumber = (assistantSettings as any)?.owner_forward_number;

      if (offBehavior === "FORWARD_OWNER" && !forwardNumber) {
        setOffBehaviorModalOpen(true);
        return;
      }
    }

    try {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      if (hasVoice) {
        updates.go_live_enabled = enabled;
        updates.voice_ai_enabled = enabled;
      }
      if (hasSms) {
        updates.instant_text_enabled = enabled;
      }

      const { error } = await supabase
        .from("assistant_settings")
        .update(updates)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      await refreshTenant();

      toast({
        title: enabled ? "AI Agent is now live" : "AI Agent paused",
        description: enabled 
          ? "Your AI is now handling incoming calls and messages." 
          : "Your AI has stopped answering. Calls will follow your fallback rules.",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    }
  };

  const copyPhoneNumber = () => {
    if (closeloopNumber) {
      navigator.clipboard.writeText(closeloopNumber);
      setCopied(true);
      toast({ title: "Copied!", description: "Phone number copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // No subscription yet
  if (!planCode) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">AI Agent</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Complete setup to activate your AI receptionist.
          </p>
          <Button asChild>
            <Link to="/app/go-live">Get Started</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        "border-2 transition-all duration-200",
        isActive 
          ? "border-primary/20 bg-primary/[0.03]" 
          : "border-border"
      )}>
        <CardContent className="p-6">
          {/* Main Control */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Status Dot */}
              <div className={cn(
                "w-3 h-3 rounded-full shrink-0 transition-colors",
                isActive ? "bg-success" : "bg-muted-foreground/30"
              )} />
              
              {/* Status Text */}
              <div className="min-w-0">
                <p className="font-medium">
                  {isActive ? "AI Receptionist Active" : "AI Receptionist Paused"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {closeloopNumber 
                    ? formatPhone(closeloopNumber) 
                    : "No phone number connected"}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
            />
          </div>

          {/* Phone Number & Actions */}
          {closeloopNumber && (
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {formatPhone(closeloopNumber)}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={copyPhoneNumber}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/simulator")}
                >
                  <FlaskConical className="h-4 w-4" />
                  Test AI
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/business-brain")}
                >
                  <Brain className="h-4 w-4" />
                  Knowledge
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/settings")}
                >
                  <Settings2 className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>
          )}

          {/* Actions when no phone number */}
          {!closeloopNumber && (
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                asChild
              >
                <Link to="/app/go-live">
                  <Phone className="h-4 w-4" />
                  Connect Phone
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/app/simulator")}
              >
                <FlaskConical className="h-4 w-4" />
                Test AI
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/app/business-brain")}
              >
                <Brain className="h-4 w-4" />
                Knowledge
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OFF Behavior Modal */}
      <AgentOffBehaviorModal
        open={offBehaviorModalOpen}
        onOpenChange={setOffBehaviorModalOpen}
        tenantId={tenant?.id || ""}
        currentBehavior={(assistantSettings as any)?.off_behavior}
        currentForwardNumber={(assistantSettings as any)?.owner_forward_number}
        onConfigured={async () => {
          await refreshTenant();
          handleToggle(false);
        }}
      />
    </>
  );
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}