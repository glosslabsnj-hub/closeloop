import React, { useMemo } from "react";
/**
 * Phase 6: CONNECT Tools — Calendar, phone, notifications + mode-aware integrations
 */
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Phone, MessageSquare, HelpCircle, ArrowRight, Check, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

/** Mode-aware integration suggestions shown during onboarding */
const MODE_INTEGRATIONS: Record<BusinessMode, { id: string; name: string; icon: string; description: string; tag?: string }[]> = {
  service: [
    { id: "jobber", name: "Jobber", icon: "🔧", description: "Sync jobs, clients & scheduling", tag: "Popular" },
    { id: "quickbooks", name: "QuickBooks", icon: "📒", description: "Invoicing & payments" },
    { id: "stripe_connect", name: "Stripe", icon: "💳", description: "Accept online payments" },
  ],
  dispatch: [
    { id: "jobber", name: "Jobber", icon: "🔧", description: "Dispatch & job management", tag: "Popular" },
    { id: "quickbooks", name: "QuickBooks", icon: "📒", description: "Invoicing & payments" },
    { id: "stripe_connect", name: "Stripe", icon: "💳", description: "Accept online payments" },
  ],
  food: [
    { id: "square_pos", name: "Square", icon: "⬛", description: "POS, orders & payments", tag: "Popular" },
    { id: "stripe_connect", name: "Stripe", icon: "💳", description: "Accept online payments" },
  ],
  medical: [
    { id: "quickbooks", name: "QuickBooks", icon: "📒", description: "Billing & invoicing" },
    { id: "stripe_connect", name: "Stripe", icon: "💳", description: "Accept copays online" },
  ],
  sales: [
    { id: "hubspot", name: "HubSpot", icon: "🟠", description: "CRM & lead management", tag: "Popular" },
    { id: "stripe_connect", name: "Stripe", icon: "💳", description: "Accept payments" },
    { id: "quickbooks", name: "QuickBooks", icon: "📒", description: "Invoicing & accounting" },
  ],
  general: [
    { id: "quickbooks", name: "QuickBooks", icon: "📒", description: "Invoicing & payments" },
    { id: "stripe_connect", name: "Stripe", icon: "💳", description: "Accept online payments" },
    { id: "hubspot", name: "HubSpot", icon: "🟠", description: "CRM & marketing" },
  ],
};

interface OnboardingConnectProps {
  businessMode: BusinessMode;
  notificationPhone: string;
  onNotificationPhoneChange: (phone: string) => void;
  calendarConnected: boolean;
  onConnectCalendar: () => void;
  onConnectIntegration?: (providerId: string) => void;
  connectedIntegrations?: string[];
}

export const OnboardingConnect = React.memo(function OnboardingConnect({
  businessMode,
  notificationPhone,
  onNotificationPhoneChange,
  calendarConnected,
  onConnectCalendar,
  onConnectIntegration,
  connectedIntegrations = [],
}: OnboardingConnectProps) {
  const modeIntegrations = useMemo(
    () => MODE_INTEGRATIONS[businessMode] || MODE_INTEGRATIONS.general,
    [businessMode],
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Connect your tools
        </h2>
        <p className="mt-2 text-muted-foreground">
          Optional — you can set all of these up later from your dashboard.
        </p>
      </div>

      {/* Calendar Connection */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Calendar</p>
                <Badge variant="default" className="text-xs">Recommended</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                So the AI can check your availability before booking
              </p>
            </div>
          </div>
          <Button
            variant={calendarConnected ? "secondary" : "outline"}
            className="w-full gap-2"
            onClick={onConnectCalendar}
            disabled={calendarConnected}
          >
            {calendarConnected ? (
              <>
                <Check className="h-4 w-4" />
                Calendar Connected
              </>
            ) : (
              <>
                Connect Google Calendar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Mode-Aware Integration Suggestions */}
      {modeIntegrations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Recommended for your business</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">
                      Connect these tools so your AI can work with your existing systems.
                      You can add more integrations later.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-2">
              {modeIntegrations.map((integration) => {
                const isConnected = connectedIntegrations.includes(integration.id);
                return (
                  <Card key={integration.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl shrink-0">{integration.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{integration.name}</p>
                            {integration.tag && (
                              <Badge variant="secondary" className="text-xs">{integration.tag}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                        <Button
                          variant={isConnected ? "secondary" : "ghost"}
                          size="sm"
                          className="shrink-0 gap-1.5"
                          disabled={isConnected}
                          onClick={() => onConnectIntegration?.(integration.id)}
                        >
                          {isConnected ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Connected
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-3.5 w-3.5" />
                              Connect
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Phone Number Info */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">AI Phone Number</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                We'll automatically assign a local number when you go live
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            A phone number will be provisioned for you automatically in the next step.
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* SMS Notifications */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">SMS Notifications</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[200px]">Get a text alert whenever your AI books an appointment or captures a lead.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Get alerts for new bookings and important calls
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notification-phone" className="text-xs">Your mobile number</Label>
            <Input
              id="notification-phone"
              placeholder="(555) 123-4567"
              value={notificationPhone}
              onChange={(e) => onNotificationPhoneChange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
