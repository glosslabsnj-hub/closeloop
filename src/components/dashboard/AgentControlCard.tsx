import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { hasVoiceFeature, hasSmsFeature } from "@/config/pricing";
import { 
  Phone, 
  MessageSquare,
  CheckCircle2, 
  AlertCircle,
  Play,
  Settings2,
  Zap,
  Copy,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function AgentControlCard() {
  const { tenant, assistantSettings, refreshTenant, subscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [smsDelay, setSmsDelay] = useState(assistantSettings?.sms_first_delay_seconds || 5);
  const [updatingDelay, setUpdatingDelay] = useState(false);

  // Use centralized helpers for feature detection
  const planCode = subscription?.plan_code;
  const hasVoice = hasVoiceFeature(planCode);
  const hasSms = hasSmsFeature(planCode);
  const showTabs = hasVoice && hasSms;

  // Voice agent state
  const voiceEnabled = assistantSettings?.voice_ai_enabled && assistantSettings?.go_live_enabled;
  const phoneConnected = assistantSettings?.phone_connected || false;
  const calendarConnected = !!(assistantSettings as any)?.booking_url;
  const closeloopNumber = assistantSettings?.closeloop_number;

  // SMS agent state
  const smsEnabled = assistantSettings?.instant_text_enabled || false;

  const handleToggleVoice = async (enabled: boolean) => {
    if (!tenant) return;

    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          go_live_enabled: enabled,
          voice_ai_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      await refreshTenant();
      toast({
        title: enabled ? "Voice Agent Activated ✅" : "Voice Agent Paused",
        description: enabled 
          ? "Now answering calls 24/7" 
          : "Paused - won't answer calls",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    }
  };

  const handleToggleSms = async (enabled: boolean) => {
    if (!tenant) return;

    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          instant_text_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      await refreshTenant();
      toast({
        title: enabled ? "SMS Agent Activated ✅" : "SMS Agent Paused",
        description: enabled 
          ? "Auto-replying to missed calls" 
          : "Paused - won't send auto-texts",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    }
  };

  const handleDelayChange = async (value: number[]) => {
    setSmsDelay(value[0]);
  };

  const handleDelayCommit = async (value: number[]) => {
    if (!tenant) return;
    setUpdatingDelay(true);

    try {
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          sms_first_delay_seconds: value[0],
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      await refreshTenant();
      toast({
        title: "Delay Updated",
        description: `SMS will send ${value[0]} seconds after missed call`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    } finally {
      setUpdatingDelay(false);
    }
  };

  const copyPhoneNumber = () => {
    if (closeloopNumber) {
      navigator.clipboard.writeText(closeloopNumber);
      toast({
        title: "Copied!",
        description: "Phone number copied to clipboard",
      });
    }
  };

  const VoiceAgentContent = () => (
    <div className="space-y-4">
      {/* Voice Status Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`relative flex items-center justify-center h-12 w-12 rounded-xl transition-colors ${
            voiceEnabled 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}>
            <Phone className="h-6 w-6" />
            {voiceEnabled && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Voice Agent</h3>
              <Badge variant={voiceEnabled ? "default" : "secondary"} className="text-xs">
                {voiceEnabled ? "Live" : "Paused"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {voiceEnabled ? "Answering calls 24/7" : "Toggle to start answering"}
            </p>
          </div>
        </div>
        <Switch
          checked={voiceEnabled}
          onCheckedChange={handleToggleVoice}
        />
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 flex-1">
          {phoneConnected ? (
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-sm ${phoneConnected ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Phone
            </span>
            {phoneConnected && closeloopNumber && (
              <>
                <span className="text-xs text-muted-foreground truncate">
                  {closeloopNumber}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 shrink-0"
                  onClick={copyPhoneNumber}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="w-px h-4 bg-border" />
        
        <div className="flex items-center gap-2">
          {calendarConnected ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={`text-sm ${calendarConnected ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Calendar
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-10 gap-2"
          onClick={() => navigate("/app/simulator")}
        >
          <Play className="h-4 w-4" />
          Test AI
        </Button>
        
        <Button 
          variant="outline" 
          className="h-10 gap-2"
          onClick={() => navigate("/app/ai-assistant")}
        >
          <Settings2 className="h-4 w-4" />
          Configure
        </Button>
      </div>
    </div>
  );

  const SmsAgentContent = () => (
    <div className="space-y-4">
      {/* SMS Status Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`relative flex items-center justify-center h-12 w-12 rounded-xl transition-colors ${
            smsEnabled 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}>
            <MessageSquare className="h-6 w-6" />
            {smsEnabled && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">SMS Agent</h3>
              <Badge variant={smsEnabled ? "default" : "secondary"} className="text-xs">
                {smsEnabled ? "Active" : "Paused"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {smsEnabled ? "Auto-texting missed callers" : "Toggle to enable auto-texts"}
            </p>
          </div>
        </div>
        <Switch
          checked={smsEnabled}
          onCheckedChange={handleToggleSms}
        />
      </div>

      {/* Delay Setting */}
      <div className="p-4 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Response Delay</Label>
          </div>
          <span className="text-sm font-medium tabular-nums">{smsDelay}s</span>
        </div>
        <Slider
          value={[smsDelay]}
          onValueChange={handleDelayChange}
          onValueCommit={handleDelayCommit}
          min={0}
          max={60}
          step={5}
          className="w-full"
          disabled={updatingDelay}
        />
        <p className="text-xs text-muted-foreground">
          Wait {smsDelay} seconds after a missed call before sending an AI-generated text
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-10 gap-2"
          onClick={() => navigate("/app/simulator")}
        >
          <Play className="h-4 w-4" />
          Test SMS
        </Button>
        
        <Button 
          variant="outline" 
          className="h-10 gap-2"
          onClick={() => navigate("/app/ai-assistant")}
        >
          <Settings2 className="h-4 w-4" />
          Configure
        </Button>
      </div>
    </div>
  );

  // If no subscription yet, show a minimal card
  if (!planCode) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-muted text-muted-foreground">
              <Zap className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">AI Agents</h2>
              <p className="text-sm text-muted-foreground">
                Complete setup to activate your AI agents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine active state for card styling
  const isAnyActive = voiceEnabled || smsEnabled;

  return (
    <Card className={`overflow-hidden transition-all ${
      isAnyActive 
        ? "border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 shadow-lg shadow-primary/5" 
        : "border-border"
    }`}>
      <CardContent className="p-6">
        {showTabs ? (
          <Tabs defaultValue="voice" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-10 w-10 rounded-xl transition-colors ${
                  isAnyActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Zap className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-lg">AI Agents</h2>
              </div>
              <TabsList className="h-9">
                <TabsTrigger value="voice" className="gap-1.5 text-xs px-3">
                  <Phone className="h-3.5 w-3.5" />
                  Voice
                </TabsTrigger>
                <TabsTrigger value="sms" className="gap-1.5 text-xs px-3">
                  <MessageSquare className="h-3.5 w-3.5" />
                  SMS
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="voice" className="mt-0">
              <VoiceAgentContent />
            </TabsContent>
            <TabsContent value="sms" className="mt-0">
              <SmsAgentContent />
            </TabsContent>
          </Tabs>
        ) : hasVoice ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex items-center justify-center h-10 w-10 rounded-xl transition-colors ${
                voiceEnabled 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                <Phone className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-lg">Voice Agent</h2>
            </div>
            <VoiceAgentContent />
          </>
        ) : hasSms ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex items-center justify-center h-10 w-10 rounded-xl transition-colors ${
                smsEnabled 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                <MessageSquare className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-lg">SMS Agent</h2>
            </div>
            <SmsAgentContent />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
