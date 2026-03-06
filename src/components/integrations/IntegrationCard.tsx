import { CheckCircle, Loader2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SelfSetupGuide } from "./SelfSetupGuide";

interface IntegrationCardProps {
  id: string;
  name: string;
  icon: string;
  logo?: string;
  description: string;
  isConnected?: boolean;
  isSelfSetup?: boolean;
  isLoading?: boolean;
  comingSoon?: boolean;
  onConnect?: () => void;
  onTest?: () => void;
  onRequestSetup?: () => void;
}

export function IntegrationCard({
  id,
  name,
  icon,
  logo,
  description,
  isConnected = false,
  isSelfSetup = false,
  isLoading = false,
  comingSoon = false,
  onConnect,
  onTest,
  onRequestSetup,
}: IntegrationCardProps) {
  return (
    <Card className={isConnected ? "border-primary/30 bg-primary/5" : comingSoon ? "border-border/30 opacity-80" : "border-border/50"}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 overflow-hidden">
            {logo ? (
              <img
                src={logo}
                alt={name}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <span className={`text-2xl fallback-icon ${logo ? 'hidden' : ''}`}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium">{name}</h3>
              {comingSoon && (
                <Badge variant="outline" className="gap-1 text-[10px] h-4 text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  Coming soon
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
        </div>

        {/* Self-setup guide for DIY integrations (not coming soon) */}
        {isSelfSetup && !isConnected && !comingSoon && (
          <SelfSetupGuide providerId={id} />
        )}

        {/* Coming soon: show webhook alternative note */}
        {comingSoon && !isConnected && (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5">
            Use our <strong>Custom Connection</strong> (webhook) to connect via Zapier or Make in the meantime.
          </p>
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
          ) : comingSoon ? (
            <Badge variant="secondary" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              Coming soon
            </Badge>
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
