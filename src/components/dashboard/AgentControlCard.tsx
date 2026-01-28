import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Power, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Settings2,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AgentControlCard() {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isLive = assistantSettings?.go_live_enabled || false;
  const phoneConnected = assistantSettings?.phone_connected || false;
  const calendarConnected = !!(assistantSettings as any)?.booking_url;
  const closeloopNumber = assistantSettings?.closeloop_number;

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
        title: enabled ? "AI Agent Activated ✅" : "AI Agent Paused",
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

  return (
    <Card className={`overflow-hidden transition-all ${
      isLive 
        ? "border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 shadow-lg shadow-primary/5" 
        : "border-border"
    }`}>
      <CardContent className="p-6">
        {/* Main Status Row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Status Icon */}
            <div className={`relative flex items-center justify-center h-14 w-14 rounded-2xl transition-colors ${
              isLive 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              <Zap className="h-7 w-7" />
              {isLive && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
                </span>
              )}
            </div>
            
            {/* Status Text */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-lg">AI Agent</h2>
                <Badge 
                  variant={isLive ? "default" : "secondary"} 
                  className={`text-xs ${isLive ? "bg-primary" : ""}`}
                >
                  {isLive ? "Live" : "Paused"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isLive 
                  ? "Answering calls & booking appointments" 
                  : "Toggle on to start answering calls"
                }
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="flex flex-col items-end gap-1">
            <Switch
              checked={isLive}
              onCheckedChange={handleToggleLive}
              className="scale-125"
            />
            <span className="text-xs text-muted-foreground">
              {isLive ? "On" : "Off"}
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {phoneConnected ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="text-sm">
              <span className={phoneConnected ? "text-foreground font-medium" : "text-muted-foreground"}>
                Phone
              </span>
              {phoneConnected && closeloopNumber && (
                <span className="text-xs text-muted-foreground ml-1.5">
                  {closeloopNumber}
                </span>
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
            className="h-12 gap-2"
            onClick={() => navigate("/app/simulator")}
          >
            <Play className="h-4 w-4" />
            Test AI
          </Button>
          
          <Button 
            variant="outline" 
            className="h-12 gap-2"
            onClick={() => navigate("/app/ai-assistant")}
          >
            <Settings2 className="h-4 w-4" />
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
