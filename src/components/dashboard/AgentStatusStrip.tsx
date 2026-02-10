import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";
import { Phone, Copy, Check, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { AgentOffBehaviorModal } from "./AgentOffBehaviorModal";

/**
 * AgentStatusStrip — Compact single-row AI agent control.
 * Replaces the full-card AgentControlPanel with a 48px strip:
 * status dot + label + phone number + toggle switch.
 */
export function AgentStatusStrip() {
  const { tenant, assistantSettings, refreshTenant, subscription, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const { canGoLive, score: readinessScore } = useAIReadinessV2();

  const planCode = subscription?.plan_code;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);

  const { data: phoneNumberData } = useQuery({
    queryKey: ["tenant-phone-number", tenant?.id, isSuperAdmin],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data: tenantPhone } = await supabase
        .from("phone_numbers")
        .select("phone_e164")
        .eq("tenant_id", tenant.id)
        .limit(1)
        .maybeSingle();
      if (tenantPhone?.phone_e164) return tenantPhone.phone_e164;
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
  const closeloopNumber =
    (assistantSettings as any)?.forwarding_phone_e164 ||
    assistantSettings?.closeloop_number ||
    phoneNumberData;
  const hasPhoneConnected = !!closeloopNumber;
  const isActive = (voiceEnabled || smsEnabled) && hasPhoneConnected;
  const readinessPercent = readinessScore || 0;

  const [offBehaviorModalOpen, setOffBehaviorModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (!tenant) return;
    if (enabled && !isSuperAdmin && !canGoLive) {
      toast({
        variant: "destructive",
        title: "Cannot Go Live Yet",
        description: `AI Readiness must be at least 85%. Currently at ${readinessPercent}%.`,
      });
      return;
    }
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

  // No subscription — minimal prompt
  if (!planCode && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="text-sm font-medium text-muted-foreground">
            AI Agent — Not Set Up
          </span>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/app/go-live">Get Started</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors",
          isActive ? "border-primary/20 bg-primary/[0.03]" : "border-border"
        )}
      >
        {/* Left: Status + Phone */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0 transition-colors",
              isActive ? "bg-success" : "bg-muted-foreground/30"
            )}
          />
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-sm font-medium whitespace-nowrap">
              {isActive ? "AI Active" : "AI Paused"}
            </span>
            {isSuperAdmin && (
              <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
                <Shield className="h-2.5 w-2.5" />
                Admin
              </Badge>
            )}
            {hasPhoneConnected && (
              <>
                <span className="text-muted-foreground hidden sm:inline">·</span>
                <button
                  onClick={copyPhoneNumber}
                  className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  <span className="font-mono text-xs">
                    {formatPhone(closeloopNumber)}
                  </span>
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Toggle */}
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={toggling || (!hasPhoneConnected && !isActive)}
        />
      </div>

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
