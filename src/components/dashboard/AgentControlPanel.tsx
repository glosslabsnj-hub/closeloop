import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";
import { useQuery } from "@tanstack/react-query";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import {
  Phone,
  Settings2,
  FlaskConical,
  Brain,
  Copy,
  Check,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AgentOffBehaviorModal } from "./AgentOffBehaviorModal";

/**
 * AgentControlPanel - Clean, focused control for the AI agent
 * Premium workspace aesthetic with calm, confident design
 */
export function AgentControlPanel() {
  const { tenant, assistantSettings, refreshTenant, subscription, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { score: readinessScore, canGoLive } = useAIReadinessV2();

  const planCode = subscription?.plan_code;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);

  // Fetch phone number from phone_numbers table as fallback
  // For super admins, also check for admin test lines
  const { data: phoneNumberData } = useQuery({
    queryKey: ["tenant-phone-number", tenant?.id, isSuperAdmin],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      // First, try to find a phone number for this tenant
      const { data: tenantPhone } = await supabase
        .from("phone_numbers")
        .select("phone_e164")
        .eq("tenant_id", tenant.id)
        .limit(1)
        .maybeSingle();
      
      if (tenantPhone?.phone_e164) return tenantPhone.phone_e164;
      
      // For super admins, also look for admin test lines
      if (isSuperAdmin) {
        const { data: adminLine } = await supabase
          .from("phone_numbers")
          .select("phone_e164")
          .eq("is_admin_test_line", true)
          .limit(1)
          .maybeSingle();
        
        if (adminLine?.phone_e164) return adminLine.phone_e164;
      }
      
      return null;
    },
    enabled: !!tenant?.id,
  });

  const voiceEnabled = assistantSettings?.voice_ai_enabled && assistantSettings?.go_live_enabled;
  const smsEnabled = assistantSettings?.instant_text_enabled || false;
  
  // Check multiple sources for phone number
  const closeloopNumber = 
    (assistantSettings as any)?.forwarding_phone_e164 || 
    assistantSettings?.closeloop_number ||
    phoneNumberData;
  
  const hasPhoneConnected = !!closeloopNumber;
  
  // Show as "Active" if enabled AND has phone
  const isActive = (voiceEnabled || smsEnabled) && hasPhoneConnected;
  
  // Super admins can always toggle; regular users need readiness threshold
  const canToggleOn = isSuperAdmin || canGoLive;
  const readinessPercent = readinessScore || 0;

  const [offBehaviorModalOpen, setOffBehaviorModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (!tenant) return;

    // If trying to enable and not a super admin, check readiness
    if (enabled && !isSuperAdmin && !canGoLive) {
      toast({
        variant: "destructive",
        title: "Cannot Go Live Yet",
        description: `AI Readiness must be at least 85%. Currently at ${readinessPercent}%.`,
      });
      return;
    }

    // If turning OFF with voice, check off_behavior is configured
    if (!enabled && hasVoice) {
      const offBehavior = assistantSettings?.off_behavior || "FORWARD_OWNER";
      const forwardNumber = assistantSettings?.owner_forward_number;

      if (offBehavior === "FORWARD_OWNER" && !forwardNumber) {
        setOffBehaviorModalOpen(true);
        return;
      }
    }

    setToggling(true);
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
    } finally {
      setToggling(false);
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

  // No subscription yet - super admins bypass this check
  if (!planCode && !isSuperAdmin) {
    return (
      <div className="rounded-2xl p-5 bg-muted/30">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Phone className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium mb-1">AI Agent</h3>
            <p className="text-sm text-muted-foreground">
              Complete setup to activate your AI receptionist.
            </p>
          </div>
          <Button asChild>
            <Link to="/app/go-live">Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "rounded-2xl p-5 transition-all",
        isActive
          ? "bg-gradient-to-r from-primary/8 via-primary/5 to-transparent"
          : "bg-muted/30"
      )}>
        {/* Main Control — Horizontal layout */}
        <div className="flex items-center gap-5">
          {/* Large toggle pill */}
          <button
            onClick={() => handleToggle(!isActive)}
            disabled={toggling || (!hasPhoneConnected && !isActive)}
            className={cn(
              "relative shrink-0 h-10 w-[72px] rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive ? "bg-primary" : "bg-muted-foreground/20",
              (toggling || (!hasPhoneConnected && !isActive)) && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className={cn(
              "absolute top-1 left-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform duration-200",
              isActive && "translate-x-[32px]"
            )} />
          </button>

          {/* Status Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0",
                isActive ? "bg-success" : "bg-muted-foreground/30"
              )} />
              <p className="font-medium">
                {isActive ? "AI Receptionist Active" : "AI Receptionist Paused"}
              </p>
              {isSuperAdmin && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
              {/* Inline readiness bar */}
              <div className="flex items-center gap-1.5">
                <div className="relative w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 w-px bg-foreground/30 z-10"
                    style={{ left: '85%' }}
                  />
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      readinessPercent >= 85 ? "bg-success" : "bg-destructive"
                    )}
                    style={{ width: `${Math.min(readinessPercent, 100)}%` }}
                  />
                </div>
                <span className={cn(
                  "text-[10px] font-medium tabular-nums",
                  readinessPercent >= 85 ? "text-success" : "text-destructive"
                )}>
                  {readinessPercent}%
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hasPhoneConnected
                ? formatPhone(closeloopNumber)
                : "No phone number connected"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {hasPhoneConnected ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={copyPhoneNumber}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/simulator")}
                >
                  <FlaskConical className="h-4 w-4" />
                  <span className="hidden sm:inline">Test AI</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/business-brain")}
                >
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">Knowledge</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/app/settings")}
                >
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </>
            ) : (
              <>
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
                  <span className="hidden sm:inline">Test AI</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Readiness detail when not active */}
        {!isActive && !canGoLive && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>AI Readiness</span>
              </div>
              <span className={cn(
                "font-medium",
                readinessPercent >= 85 ? "text-success" : "text-destructive"
              )}>
                {readinessPercent}%
              </span>
            </div>
            <Progress
              value={readinessPercent}
              className={cn(
                "h-1.5",
                readinessPercent >= 85 ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
              )}
            />
            {isSuperAdmin && (
              <p className="text-xs text-muted-foreground">
                <Shield className="h-3 w-3 inline mr-1" />
                Super admin: You can override readiness requirements
              </p>
            )}
          </div>
        )}
      </div>

      {/* OFF Behavior Modal */}
      <AgentOffBehaviorModal
        open={offBehaviorModalOpen}
        onOpenChange={setOffBehaviorModalOpen}
        tenantId={tenant?.id || ""}
        currentBehavior={assistantSettings?.off_behavior}
        currentForwardNumber={assistantSettings?.owner_forward_number}
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
