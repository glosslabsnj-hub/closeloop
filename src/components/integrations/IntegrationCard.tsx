import { CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SelfSetupGuide } from "./SelfSetupGuide";

interface IntegrationCardProps {
  id: string;
  name: string;
  icon: string;
  description: string;
  isConnected?: boolean;
  isSelfSetup?: boolean;
  isLoading?: boolean;
  onConnect?: () => void;
  onTest?: () => void;
  onRequestSetup?: () => void;
}

export function IntegrationCard({
  id,
  name,
  icon,
  description,
  isConnected = false,
  isSelfSetup = false,
  isLoading = false,
  onConnect,
  onTest,
  onRequestSetup,
}: IntegrationCardProps) {
  return (
    <Card className={isConnected ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted text-2xl shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium">{name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
        </div>

        {/* Self-setup guide for DIY integrations */}
        {isSelfSetup && !isConnected && (
          <SelfSetupGuide providerId={id} />
        )}

        {/* Action row */}
        <div className="flex items-center justify-between pt-1">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
              {onTest && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onTest}
                  disabled={isLoading}
                  className="h-7 px-2 text-xs"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Test"
                  )}
                </Button>
              )}
            </div>
          ) : isSelfSetup ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onConnect}
              disabled={isLoading}
              className="gap-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onRequestSetup}
              className="gap-1"
            >
              Request Setup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
