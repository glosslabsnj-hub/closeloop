import { CheckCircle, AlertCircle, Zap, Clock, Plus, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import type { Integration } from "@/hooks/useIntegrations";

interface IntegrationStatusDashboardProps {
  integrations: Integration[];
  automationStats: {
    totalRuns: number;
    successCount: number;
    failureCount: number;
    lastRunAt: string | null;
  };
  onAddIntegration: () => void;
  onReconnect?: (integrationId: string) => void;
  isLoading?: boolean;
}

interface ConnectionCardProps {
  name: string;
  icon: string;
  logo?: string;
  status: "connected" | "error" | "disconnected";
  lastActivity?: string | null;
  activityLabel?: string;
  onReconnect?: () => void;
}

function ConnectionCard({ name, icon, logo, status, lastActivity, activityLabel, onReconnect }: ConnectionCardProps) {
  const statusConfig = {
    connected: {
      badge: "Active",
       badgeClass: "bg-success/10 text-success border-success/30",
       icon: <CheckCircle className="h-3 w-3 text-success" />,
    },
    error: {
      badge: "Error",
       badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
       icon: <AlertCircle className="h-3 w-3 text-destructive" />,
    },
    disconnected: {
      badge: "Disconnected",
      badgeClass: "bg-muted text-muted-foreground border-muted",
      icon: null,
    },
  };

  const config = statusConfig[status];

  return (
     <Card className={`transition-all hover:shadow-md ${status === "connected" ? "border-success/30 bg-success/5" : status === "error" ? "border-destructive/30 bg-destructive/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {logo ? (
              <img 
                src={logo} 
                alt={name} 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <span className={`text-2xl fallback-icon ${logo ? 'hidden' : ''}`}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{name}</h4>
              {config.icon}
            </div>
            <Badge variant="outline" className={`text-[10px] h-5 ${config.badgeClass}`}>
              {config.badge}
            </Badge>
            {lastActivity && (
              <p className="text-[10px] text-muted-foreground">
                {activityLabel || "Last sync"}: {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
              </p>
            )}
            {status === "error" && onReconnect && (
              <Button 
                variant="ghost" 
                size="sm" 
                 className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={onReconnect}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PROVIDER_DISPLAY: Record<string, { name: string; icon: string; logo?: string }> = {
  google_calendar: { name: "Google Calendar", icon: "📅", logo: "https://cdn.brandfetch.io/id7a3kYgzR/w/400/h/400/theme/dark/icon.png" },
  google_sheets: { name: "Google Sheets", icon: "📊", logo: "https://cdn.brandfetch.io/idUqhQzFtG/w/400/h/400/theme/dark/icon.png" },
  webhook: { name: "Webhook", icon: "🔗" },
  printer: { name: "Printer", icon: "🖨️" },
  sms: { name: "SMS", icon: "💬" },
};

export function IntegrationStatusDashboard({
  integrations,
  automationStats,
  onAddIntegration,
  onReconnect,
  isLoading,
}: IntegrationStatusDashboardProps) {
  const connectedIntegrations = integrations.filter(i => i.status === "connected");
  const errorIntegrations = integrations.filter(i => i.status === "error");
  const hasAnyConnected = connectedIntegrations.length > 0;
  const hasErrors = errorIntegrations.length > 0;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-dashed">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyConnected && !hasErrors) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">No Integrations Connected Yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your tools to automate bookings, orders, and more
                </p>
              </div>
            </div>
            <Button onClick={onAddIntegration} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add Integration
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header Stats Row */}
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Your Integrations</h3>
            {hasErrors && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errorIntegrations.length} needs attention
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Some integrations have errors and need to be reconnected</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {automationStats.lastRunAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Last activity: {formatDistanceToNow(new Date(automationStats.lastRunAt), { addSuffix: true })}</span>
              </div>
            )}
            {automationStats.totalRuns > 0 && (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>{automationStats.successCount} successful today</span>
              </div>
            )}
          </div>
        </div>

        {/* Integration Cards Grid */}
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {connectedIntegrations.map((integration) => {
              const display = PROVIDER_DISPLAY[integration.provider] || { 
                name: integration.display_name, 
                icon: "⚡" 
              };
              return (
                <ConnectionCard
                  key={integration.id}
                  name={display.name}
                  icon={display.icon}
                  logo={display.logo}
                  status="connected"
                  lastActivity={integration.last_tested_at || integration.updated_at}
                />
              );
            })}

            {errorIntegrations.map((integration) => {
              const display = PROVIDER_DISPLAY[integration.provider] || { 
                name: integration.display_name, 
                icon: "⚡" 
              };
              return (
                <ConnectionCard
                  key={integration.id}
                  name={display.name}
                  icon={display.icon}
                  logo={display.logo}
                  status="error"
                  lastActivity={integration.updated_at}
                  onReconnect={() => onReconnect?.(integration.id)}
                />
              );
            })}

            {/* Add More Button */}
            <Card className="border-dashed hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group" onClick={onAddIntegration}>
              <CardContent className="p-4 flex items-center justify-center h-full min-h-[100px]">
                <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Add More</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
