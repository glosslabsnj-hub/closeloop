import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, Loader2, ExternalLink, Link2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarConnectionStepProps {
  onComplete: () => void;
  isComplete: boolean;
  onSkip?: () => void;
}

const calendarProviders = [
  { id: "calendly", name: "Calendly", icon: "📅", placeholder: "https://calendly.com/yourname" },
  { id: "cal_com", name: "Cal.com", icon: "🗓️", placeholder: "https://cal.com/yourname" },
  { id: "acuity", name: "Acuity Scheduling", icon: "📆", placeholder: "https://acuityscheduling.com/..." },
  { id: "google", name: "Google Calendar", icon: "🔵", placeholder: "Coming soon - use booking link", disabled: true },
  { id: "outlook", name: "Outlook/Microsoft 365", icon: "🔷", placeholder: "Coming soon - use booking link", disabled: true },
  { id: "other", name: "Other Booking System", icon: "🔗", placeholder: "https://your-booking-link.com" },
];

export function CalendarConnectionStep({ onComplete, isComplete, onSkip }: CalendarConnectionStepProps) {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { toast } = useToast();
  
  const [selectedProvider, setSelectedProvider] = useState<string>("calendly");
  const [bookingUrl, setBookingUrl] = useState((assistantSettings as any)?.booking_url || "");
  const [bookingMode, setBookingMode] = useState<'auto_book' | 'pending_approval'>(
    (assistantSettings as any)?.ai_booking_mode || 'auto_book'
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!tenant) return;

    if (!bookingUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Enter booking URL",
        description: "Please enter your booking link",
      });
      return;
    }

    // Basic URL validation
    if (!bookingUrl.startsWith("http")) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("assistant_settings")
        .upsert({
          tenant_id: tenant.id,
          booking_url: bookingUrl.trim(),
          calendar_provider: selectedProvider,
          ai_booking_mode: bookingMode,
          setup_step_calendar: true,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "tenant_id",
        });

      if (error) throw error;

      await refreshTenant();
      toast({
        title: "Calendar Connected! ✅",
        description: "Your AI can now direct customers to book appointments.",
      });
      onComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedProviderData = calendarProviders.find(p => p.id === selectedProvider);

  if (isComplete) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Check className="h-5 w-5" />
            Calendar Connected
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {(assistantSettings as any)?.booking_url}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Connect Your Calendar
        </CardTitle>
        <CardDescription>
          Your AI will direct customers to book appointments using your scheduling link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label>What do you use for scheduling?</Label>
          <RadioGroup 
            value={selectedProvider} 
            onValueChange={setSelectedProvider}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {calendarProviders.map((provider) => (
              <div key={provider.id}>
                <RadioGroupItem
                  value={provider.id}
                  id={provider.id}
                  className="peer sr-only"
                  disabled={provider.disabled}
                />
                <Label
                  htmlFor={provider.id}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all
                    peer-checked:border-primary peer-checked:bg-primary/5
                    hover:border-primary/50 hover:bg-muted/50
                    ${provider.disabled ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <span className="text-2xl mb-1">{provider.icon}</span>
                  <span className="text-xs font-medium text-center">{provider.name}</span>
                  {provider.disabled && (
                    <Badge variant="secondary" className="text-[10px] mt-1">Soon</Badge>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Booking URL Input */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="booking-url">Your Booking Link</Label>
          <Input
            id="booking-url"
            type="url"
            placeholder={selectedProviderData?.placeholder || "https://your-booking-link.com"}
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Paste the link where customers can book appointments with you
          </p>
        </div>

        {/* Booking Mode Selection */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="font-medium">How should AI handle bookings?</Label>
          <RadioGroup 
            value={bookingMode} 
            onValueChange={(value) => setBookingMode(value as 'auto_book' | 'pending_approval')}
            className="space-y-2"
          >
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              bookingMode === 'auto_book' 
                ? 'border-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}>
              <RadioGroupItem value="auto_book" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Auto-Book Appointments</span>
                  <Badge variant="default" className="text-[10px]">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI confirms appointments instantly based on your availability
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              bookingMode === 'pending_approval' 
                ? 'border-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}>
              <RadioGroupItem value="pending_approval" className="mt-1" />
              <div className="flex-1">
                <span className="font-medium text-sm">Require My Approval</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI schedules as pending - you confirm each booking manually
                </p>
              </div>
            </label>
          </RadioGroup>

          {bookingMode === 'pending_approval' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                You'll need to confirm each appointment in your Bookings page before the customer receives confirmation.
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">What your AI will do:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Answer questions about availability</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Send customers your booking link via text</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                {bookingMode === 'auto_book' 
                  ? 'Confirm appointments automatically'
                  : 'Schedule appointments as pending for your review'
                }
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSave} 
            disabled={saving || !bookingUrl.trim()}
            className="flex-1 gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Connect Calendar"}
          </Button>
          
          {onSkip && (
            <Button 
              variant="ghost" 
              onClick={onSkip}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
        </div>

        {/* Help link */}
        <div className="text-center">
          <a 
            href="https://calendly.com/signup" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Don't have a booking system? Create a free Calendly account
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
