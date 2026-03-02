import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Bell, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface BookingBehaviorSettingsProps {
  compact?: boolean;
  onSave?: () => void;
}

export default function BookingBehaviorSettings({ compact, onSave }: BookingBehaviorSettingsProps) {
  const { tenant, assistantSettings } = useAuth();
  const { toast } = useToast();
  const { terms } = useIndustryContext();
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const bookingLabel = capitalize(terms.booking);
  const bookingsLabel = terms.bookings;
  const pendingLabel = terms.pendingBookings;
  const customerLabel = terms.customer + "s";
  
  const [bookingMode, setBookingMode] = useState<'auto_book' | 'pending_approval'>('auto_book');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (assistantSettings) {
      // Normalize backend values to UI values
      const rawMode = assistantSettings.ai_booking_mode;
      const normalizedMode: 'auto_book' | 'pending_approval' = 
        rawMode === 'pending_approval' || rawMode === 'pending' ? 'pending_approval' : 'auto_book';
      setBookingMode(normalizedMode);
      setNotifyEmail(assistantSettings.pending_booking_notify_email ?? true);
      setNotifySms(assistantSettings.pending_booking_notify_sms ?? true);
    }
  }, [assistantSettings]);

  const handleSave = async () => {
    if (!tenant?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistant_settings')
        .update({
          ai_booking_mode: bookingMode,
          pending_booking_notify_email: notifyEmail,
          pending_booking_notify_sms: notifySms,
        })
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      toast({ title: `${bookingLabel} settings saved!` });
      onSave?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Auto-save on change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tenant?.id && assistantSettings) {
        handleSave();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [bookingMode, notifyEmail, notifySms]);

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">AI Booking Mode</span>
          </div>
          <Badge variant={bookingMode === 'auto_book' ? 'default' : 'secondary'}>
            {bookingMode === 'auto_book' ? 'Auto-Book' : 'Pending Approval'}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" />
          {bookingLabel} Behavior
        </CardTitle>
        <CardDescription>
          Control how your AI handles {bookingsLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking Mode Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">When AI schedules a {terms.booking}:</Label>
          
          <RadioGroup 
            value={bookingMode} 
            onValueChange={(value) => setBookingMode(value as 'auto_book' | 'pending_approval')}
            className="space-y-3"
          >
            <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
              bookingMode === 'auto_book' 
                ? 'border-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}>
              <RadioGroupItem value="auto_book" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Auto-Confirm {capitalize(bookingsLabel)}</span>
                  <Badge variant="default" className="text-xs">Recommended</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  AI instantly confirms {bookingsLabel} based on your availability.
                  {capitalize(customerLabel)} receive immediate confirmation.
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
              bookingMode === 'pending_approval' 
                ? 'border-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}>
              <RadioGroupItem value="pending_approval" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Require Admin Approval</span>
                  <Badge variant="secondary" className="text-xs">Manual Review</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  AI collects {terms.booking} requests, but you must confirm each one manually
                  before it's official.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Pending Approval Warning */}
        {bookingMode === 'pending_approval' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning-foreground">
                Important: Manual confirmation required
              </p>
              <p className="text-muted-foreground mt-1">
                {capitalize(pendingLabel)} will appear in your {capitalize(bookingsLabel)} page with a "Pending" status.
                You must confirm each {terms.booking} for the {terms.customer} to receive their confirmation.
              </p>
            </div>
          </div>
        )}

        {/* Notification Preferences */}
        {bookingMode === 'pending_approval' && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Notify me when {pendingLabel} arrive</Label>
            </div>
            
            <div className="space-y-3 ml-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Get an email when AI schedules a {terms.pendingBooking}</p>
                </div>
                <Switch 
                  checked={notifyEmail} 
                  onCheckedChange={setNotifyEmail}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">SMS Notifications</p>
                  <p className="text-xs text-muted-foreground">Get a text when AI schedules a {terms.pendingBooking}</p>
                </div>
                <Switch 
                  checked={notifySms} 
                  onCheckedChange={setNotifySms}
                />
              </div>
            </div>
          </div>
        )}

        {/* What AI tells customers */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <p className="text-sm font-medium">What AI tells {customerLabel}:</p>
          {bookingMode === 'auto_book' ? (
            <p className="text-sm text-muted-foreground italic">
              "Great! I've confirmed your {terms.booking} for [date/time]. You'll receive a confirmation shortly."
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              "I've submitted your {terms.booking} request for [date/time]. Someone from our team will confirm your {terms.booking} shortly."
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
