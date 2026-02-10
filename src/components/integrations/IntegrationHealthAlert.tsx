import { AlertTriangle, RefreshCw, X, Clock, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface HealthWarning {
  id: string;
  type: "token_expiring" | "token_expired" | "webhook_failing" | "sync_error";
  integrationId: string;
  integrationName: string;
  message: string;
  actionLabel?: string;
  expiresAt?: string;
}

interface IntegrationHealthAlertProps {
  warnings: HealthWarning[];
  onReconnect: (integrationId: string) => void;
  onDismiss: (warningId: string) => void;
}

const WARNING_CONFIG: Record<HealthWarning["type"], { 
  icon: React.ReactNode; 
  variant: "default" | "destructive";
  title: string;
}> = {
  token_expiring: {
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
    title: "Connection Expiring Soon",
  },
  token_expired: {
    icon: <AlertTriangle className="h-4 w-4" />,
    variant: "destructive",
    title: "Connection Expired",
  },
  webhook_failing: {
    icon: <AlertTriangle className="h-4 w-4" />,
    variant: "destructive",
    title: "Webhook Delivery Issues",
  },
  sync_error: {
    icon: <AlertTriangle className="h-4 w-4" />,
    variant: "destructive",
    title: "Sync Error",
  },
};

export function IntegrationHealthAlert({ warnings, onReconnect, onDismiss }: IntegrationHealthAlertProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {warnings.map((warning) => {
        const config = WARNING_CONFIG[warning.type];
        return (
          <Alert key={warning.id} variant={config.variant} className="relative pr-12">
            {config.icon}
            <AlertTitle className="flex items-center gap-2">
              {config.title}
              <span className="font-normal text-muted-foreground">— {warning.integrationName}</span>
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">{warning.message}</p>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant={config.variant === "destructive" ? "outline" : "secondary"}
                  onClick={() => onReconnect(warning.integrationId)}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  {warning.actionLabel || "Reconnect Now"}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-muted-foreground"
                  onClick={() => onDismiss(warning.id)}
                >
                  Remind me later
                </Button>
              </div>
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onDismiss(warning.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        );
      })}
    </div>
  );
}

// Troubleshooting inline component for specific integrations
interface TroubleshootingCardProps {
  integrationName: string;
  errorMessage?: string;
  onReconnect: () => void;
  onContactSupport: () => void;
}

export function TroubleshootingCard({ 
  integrationName, 
  errorMessage,
  onReconnect, 
  onContactSupport 
}: TroubleshootingCardProps) {
  const commonFixes = [
    "Your account password may have changed",
    "Voxly access may have been revoked in your account settings",
    "There may be a temporary service outage",
  ];

  return (
    <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/20">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{integrationName} sync issue detected</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        {errorMessage && (
          <p className="text-sm bg-red-100 dark:bg-red-900/30 p-2 rounded font-mono text-xs">
            {errorMessage}
          </p>
        )}
        <div>
          <p className="font-medium text-sm mb-1">Common fixes:</p>
          <ol className="list-decimal list-inside text-sm space-y-0.5 text-muted-foreground">
            {commonFixes.map((fix, i) => (
              <li key={i}>{fix}</li>
            ))}
          </ol>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onReconnect} className="gap-1.5">
            <RefreshCw className="h-3 w-3" />
            Reconnect Now
          </Button>
          <Button size="sm" variant="ghost" onClick={onContactSupport} className="gap-1.5">
            <ExternalLink className="h-3 w-3" />
            Contact Support
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
