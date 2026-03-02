import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Check, 
  Loader2, 
  AlertCircle,
  CalendarDays,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface CalendarConnectionStepProps {
  onComplete: () => void;
  isComplete: boolean;
  onSkip?: () => void;
}

type CalendarOption = 'closeloop' | 'google' | 'outlook' | 'apple';

const calendarOptions = [
  { 
    id: 'closeloop' as CalendarOption, 
    name: "Flux Receptionist Calendar",
    icon: CalendarDays,
    description: "Manage your availability directly in Flux Receptionist",
    available: true,
    recommended: true,
  },
  { 
    id: 'google' as CalendarOption, 
    name: "Google Calendar", 
    icon: "🔵",
    description: "Sync with your Google Calendar",
    available: false, // Coming soon
    oauthRequired: true,
  },
  { 
    id: 'outlook' as CalendarOption, 
    name: "Microsoft Outlook", 
    icon: "🔷",
    description: "Sync with Outlook/Microsoft 365",
    available: false,
  },
  { 
    id: 'apple' as CalendarOption, 
    name: "Apple Calendar", 
    icon: "🍎",
    description: "Sync with Apple Calendar",
    available: false,
  },
];

export function CalendarConnectionStep({ onComplete, isComplete, onSkip }: CalendarConnectionStepProps) {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { toast } = useToast();
  const { terms } = useIndustryContext();
  
  const [selectedOption, setSelectedOption] = useState<CalendarOption>('closeloop');
  const [bookingMode, setBookingMode] = useState<'auto_book' | 'pending_approval'>(() => {
    const rawMode = assistantSettings?.ai_booking_mode;
    return rawMode === 'pending_approval' || rawMode === 'pending' ? 'pending_approval' : 'auto_book';
  });
  const [saving, setSaving] = useState(false);

  const saveSettings = async (updates: Record<string, unknown>) => {
    if (!tenant) throw new Error("No tenant");

    // Check if settings exist first
    const { data: existing } = await supabase
      .from("assistant_settings")
      .select("tenant_id")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (existing) {
      // UPDATE existing row
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.id);
      if (error) throw error;
    } else {
      // INSERT new row
      const { error } = await supabase
        .from("assistant_settings")
        .insert({
          tenant_id: tenant.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    }
  };

  const handleSaveBuiltInCalendar = async () => {
    if (!tenant) return;

    setSaving(true);
    try {
      await saveSettings({
        calendar_provider: 'closeloop',
        ai_booking_mode: bookingMode,
        setup_step_calendar: true,
      });

      // Also update tenant to enable calendar sync
      await supabase
        .from("tenants")
        .update({ 
          calendar_sync_enabled: true,
          calendar_sync_provider: 'closeloop',
        })
        .eq("id", tenant.id);

      // Auto-seed availability_slots from tenant hours_json if none exist
      const { data: existingSlots } = await supabase
        .from("availability_slots")
        .select("id")
        .eq("tenant_id", tenant.id)
        .limit(1);

      if (!existingSlots || existingSlots.length === 0) {
        // Fetch tenant hours
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("hours_json")
          .eq("id", tenant.id)
          .single();

        const hoursJson = tenantData?.hours_json as Record<string, { closed?: boolean; windows?: { open: string; close: string }[] }> | null;
        if (hoursJson) {
          const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
          const slotsToInsert: { tenant_id: string; day_of_week: number; start_time: string; end_time: string; is_available: boolean }[] = [];

          for (const [dayName, config] of Object.entries(hoursJson)) {
            const dow = dayMap[dayName.toLowerCase()];
            if (dow === undefined) continue;
            if (config.closed || !config.windows?.length) {
              slotsToInsert.push({ tenant_id: tenant.id, day_of_week: dow, start_time: '00:00:00', end_time: '00:00:00', is_available: false });
            } else {
              for (const w of config.windows) {
                slotsToInsert.push({ tenant_id: tenant.id, day_of_week: dow, start_time: `${w.open}:00`, end_time: `${w.close}:00`, is_available: true });
              }
            }
          }

          if (slotsToInsert.length > 0) {
            await supabase.from("availability_slots").insert(slotsToInsert);
          }
        }
      }

      await refreshTenant();
      toast({
        title: "Calendar Set Up! ✅",
        description: `Your AI can now schedule ${terms.bookings} based on your business hours.`,
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

  const handleSkip = async () => {
    if (!tenant) return;

    setSaving(true);
    try {
      await saveSettings({
        setup_step_calendar: true,
      });

      await refreshTenant();
      toast({
        title: "Calendar Step Skipped",
        description: "You can set up your calendar later in Settings.",
      });
      onSkip?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Skip Failed",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (selectedOption === 'closeloop') {
      handleSaveBuiltInCalendar();
    } else {
      // All other options are "coming soon" - allow skip
      toast({
        title: "Coming Soon",
        description: "This calendar integration will be available soon. You can skip for now or use Flux Receptionist Calendar.",
      });
    }
  };

  const selectedOptionData = calendarOptions.find(o => o.id === selectedOption);

  if (isComplete) {
    const provider = assistantSettings?.calendar_provider || 'closeloop';
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Check className="h-5 w-5" />
            Calendar Connected
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {provider === 'closeloop' ? 'Using Flux Receptionist Calendar' : `Connected to ${provider}`}
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
          Set Up Your Calendar
        </CardTitle>
        <CardDescription>
          Your AI will schedule {terms.bookings} directly into your calendar when {terms.customers} call or text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calendar Source Selection */}
        <div className="space-y-3">
          <Label className="font-medium">Choose your calendar</Label>
          <RadioGroup 
            value={selectedOption} 
            onValueChange={(v) => setSelectedOption(v as CalendarOption)}
            className="space-y-3"
          >
            {calendarOptions.map((option) => {
              const IconComponent = typeof option.icon === 'string' ? null : option.icon;
              return (
                <label
                  key={option.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedOption === option.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem 
                    value={option.id} 
                    className="mt-1" 
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {IconComponent ? (
                        <IconComponent className="h-5 w-5 text-primary" />
                      ) : (
                        <span className="text-xl">{option.icon as string}</span>
                      )}
                      <span className="font-medium">{option.name}</span>
                      {option.recommended && (
                        <Badge variant="default" className="text-[10px]">Recommended</Badge>
                      )}
                      {!option.available && (
                        <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Booking Mode Selection - only show for built-in calendar */}
        {selectedOption === 'closeloop' && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="font-medium">When AI schedules a {terms.booking}:</Label>
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
                    <span className="font-medium text-sm">Confirm Immediately</span>
                    <Badge variant="default" className="text-[10px]">Recommended</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI confirms {terms.bookings} instantly - {terms.customer} gets immediate confirmation
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
                    AI schedules as pending - you must confirm each {terms.booking} manually
                  </p>
                </div>
              </label>
            </RadioGroup>

            {bookingMode === 'pending_approval' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Pending {terms.bookings} appear in your {terms.bookingsPageTitle} page. You must confirm before the {terms.customer} receives confirmation.
                </p>
              </div>
            )}
          </div>
        )}

        {/* What AI Does - only show for built-in calendar */}
        {selectedOption === 'closeloop' && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-medium mb-2">How AI schedules {terms.bookings}:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Checks your calendar for available time slots</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Offers available times to {terms.customers} on calls or via text</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Schedules the {terms.booking} directly into your calendar</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Sends confirmation to the {terms.customer}</span>
              </li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleContinue} 
            disabled={saving || (selectedOption !== 'closeloop' && !selectedOptionData?.available)}
            className="flex-1 gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : selectedOption === 'google' ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {saving ? "Setting up..." : 
             selectedOption === 'closeloop' ? "Use Flux Receptionist Calendar" :
             "Connect Calendar"}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            disabled={saving}
            className="text-muted-foreground"
          >
            Skip for now
          </Button>
        </div>

        {/* Help text */}
        {selectedOption === 'closeloop' && (
          <p className="text-xs text-center text-muted-foreground">
            After setup, configure your available hours in Settings → Business Hours
          </p>
        )}
      </CardContent>
    </Card>
  );
}
