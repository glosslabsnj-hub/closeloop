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
  Settings 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIndustryContext } from "@/hooks/useIndustryContext";

export function AgentStatusBanner() {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { terms } = useIndustryContext();
  const isLive = assistantSettings?.go_live_enabled || false;
  const phoneConnected = assistantSettings?.phone_connected || false;
  const calendarConnected = !!assistantSettings?.booking_url;

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
        title: enabled ? "AI Activated ✅" : "AI Paused",
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

  return (
    <Card className={isLive 
      ? "border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10" 
      : "border-muted"
    }>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-4 flex-1">
            <div className={`flex items-center justify-center h-12 w-12 rounded-full ${
              isLive ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <Power className="h-6 w-6" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">AI Agent</h2>
                <Badge variant={isLive ? "default" : "secondary"} className="gap-1">
                  {isLive ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
                      Live
                    </>
                  ) : (
                    "Paused"
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isLive 
                  ? `Answering calls and scheduling ${terms.bookings} 24/7`
                  : "Your AI is paused. Toggle to start answering calls."
                }
              </p>
            </div>
          </div>

          {/* Connection Health */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm">
              {phoneConnected ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={phoneConnected ? "text-foreground" : "text-muted-foreground"}>
                Phone
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-sm">
              {calendarConnected ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={calendarConnected ? "text-foreground" : "text-muted-foreground"}>
                Calendar
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/app/simulator")}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Test
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/app/ai-assistant")}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
            </Button>

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
