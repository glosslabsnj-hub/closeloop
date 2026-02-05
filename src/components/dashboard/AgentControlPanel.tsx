import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  PhoneIncoming,
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
  const isActive = voiceEnabled || smsEnabled;
  const closeloopNumber = assistantSettings?.closeloop_number;

  const [offBehaviorModalOpen, setOffBehaviorModalOpen] = useState(false);

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
      toast({ title: "Copied!", description: "Phone number copied to clipboard" });
    }
  };

  // No subscription yet
  if (!planCode) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">AI Agent</h3>
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
        "overflow-hidden transition-all duration-300",
        isActive && "ring-1 ring-primary/20 shadow-lg shadow-primary/5"
      )}>
        <CardContent className="p-0">
          {/* Main Control Row */}
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Status and Description */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Status Indicator */}
                <div className={cn(
                  "relative flex items-center justify-center h-14 w-14 rounded-2xl transition-all duration-300 shrink-0",
                  isActive 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {hasVoice ? <Phone className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success border-2 border-card"></span>
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-semibold">AI Agent</h2>
                    <Badge 
                      variant={isActive ? "success" : "muted"} 
                      size="sm"
                      className="font-medium"
                    >
                      {isActive ? "Live" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[300px]">
                    {isActive 
                      ? `Answering for ${tenant?.name || "your business"}`
                      : hasVoice 
                        ? "Turn on to start answering calls"
                        : "Enable instant text responses"
                    }
                  </p>
                </div>
              </div>

              {/* Right: Toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={isActive}
                  onCheckedChange={handleToggle}
                  className="scale-110"
                />
              </div>
            </div>

            {/* Phone Number Pill (if assigned) */}
            {closeloopNumber && (
              <div className="mt-5 flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50 w-fit">
                <PhoneIncoming className="h-4 w-4 text-primary shrink-0" />
                <span className="font-mono text-sm font-medium tracking-wide">
                  {formatPhone(closeloopNumber)}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={copyPhoneNumber}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="border-t border-border/50 bg-muted/30 px-5 py-3 md:px-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/app/simulator")}
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Test AI
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/app/business-brain")}
              >
                <Brain className="h-3.5 w-3.5" />
                Knowledge
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/app/inbox?tab=calls")}
              >
                <Phone className="h-3.5 w-3.5" />
                Calls
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => navigate("/app/settings")}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </Button>
            </div>
          </div>
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