/**
 * Phase 4: CONNECT Tools — Calendar, phone, notifications (optional)
 */
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Phone, MessageSquare, HelpCircle, ArrowRight, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface OnboardingConnectProps {
  notificationPhone: string;
  onNotificationPhoneChange: (phone: string) => void;
  calendarConnected: boolean;
  onConnectCalendar: () => void;
}

export function OnboardingConnect({
  notificationPhone,
  onNotificationPhoneChange,
  calendarConnected,
  onConnectCalendar,
}: OnboardingConnectProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Connect your tools
        </h2>
        <p className="mt-2 text-muted-foreground">
          Optional — you can do this later from your dashboard.
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
                <span className="text-xs text-primary font-medium">Recommended</span>
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
}
