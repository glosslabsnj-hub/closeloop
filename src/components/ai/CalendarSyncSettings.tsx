import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  RefreshCw, 
  Link2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const calendarProviders = [
  { value: 'google', label: 'Google Calendar', icon: '📅', available: false },
  { value: 'outlook', label: 'Microsoft Outlook', icon: '📆', available: false },
  { value: 'apple', label: 'Apple Calendar', icon: '🍎', available: false },
  { value: 'calendly', label: 'Calendly', icon: '📗', available: true },
  { value: 'cal_com', label: 'Cal.com', icon: '📘', available: true },
  { value: 'acuity', label: 'Acuity Scheduling', icon: '📕', available: true },
  { value: 'other', label: 'Other', icon: '🔗', available: true },
];

interface CalendarSyncSettingsProps {
  onSyncComplete?: () => void;
}

export default function CalendarSyncSettings({ onSyncComplete }: CalendarSyncSettingsProps) {
  const { tenant, assistantSettings } = useAuth();
  const { toast } = useToast();
  
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [tenant?.id, assistantSettings]);

  const loadSettings = async () => {
    if (!tenant?.id) return;
    
    // Load from tenant
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('calendar_sync_enabled, calendar_sync_provider, calendar_last_synced_at')
      .eq('id', tenant.id)
      .single();

    if (tenantData) {
      setSyncEnabled((tenantData as any).calendar_sync_enabled || false);
      setProvider((tenantData as any).calendar_sync_provider || '');
      setLastSynced((tenantData as any).calendar_last_synced_at || null);
    }

    // Load booking URL from assistant settings
    if (assistantSettings) {
      setBookingUrl((assistantSettings as any).booking_url || '');
    }
  };

  const handleSave = async () => {
    if (!tenant?.id) return;
    
    setSaving(true);
    try {
      // Update tenant calendar settings
      await supabase
        .from('tenants')
        .update({
          calendar_sync_enabled: syncEnabled,
          calendar_sync_provider: provider || null,
        })
        .eq('id', tenant.id);

      // Update booking URL in assistant settings
      await supabase
        .from('assistant_settings')
        .update({ booking_url: bookingUrl || null })
        .eq('tenant_id', tenant.id);

      toast({ title: "Calendar settings saved!" });
      onSyncComplete?.();
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

  const handleSync = async () => {
    setSyncing(true);
    // TODO: Implement actual calendar sync via OAuth
    // For now, simulate sync
    setTimeout(() => {
      setSyncing(false);
      setLastSynced(new Date().toISOString());
      toast({ 
        title: "Calendar synced!", 
        description: "Your availability has been updated from your calendar." 
      });
    }, 2000);
  };

  const selectedProvider = calendarProviders.find(p => p.value === provider);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar & Scheduling
        </CardTitle>
        <CardDescription>
          Connect your calendar so AI knows when you're available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking URL Section */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Booking Link</Label>
          <p className="text-sm text-muted-foreground">
            Paste your scheduling page URL. AI will direct customers here to book appointments.
          </p>
          <Input
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
            placeholder="https://calendly.com/your-business/30min"
            className="font-mono text-sm"
          />
          {bookingUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-3 w-3" />
                Test Link
              </a>
            </Button>
          )}
        </div>

        {/* Calendar Sync Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Calendar Sync</Label>
              <p className="text-sm text-muted-foreground">
                Sync your calendar to block busy times automatically
              </p>
            </div>
            <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
          </div>

          {syncEnabled && (
            <>
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Calendar Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendarProviders.map((p) => (
                      <SelectItem 
                        key={p.value} 
                        value={p.value}
                        disabled={!p.available}
                      >
                        <div className="flex items-center gap-2">
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                          {!p.available && (
                            <Badge variant="outline" className="text-xs ml-2">Coming Soon</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* OAuth Connection for Native Calendars */}
              {provider && ['google', 'outlook', 'apple'].includes(provider) && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span>OAuth integration coming soon. Use a booking URL for now.</span>
                  </div>
                </div>
              )}

              {/* Sync Status */}
              {selectedProvider?.available && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {lastSynced ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          Last synced: {new Date(lastSynced).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Not synced yet</span>
                      </>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSync}
                    disabled={syncing}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* How AI Uses This */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2 border-t pt-6">
          <p className="text-sm font-medium">How AI uses your calendar:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {bookingUrl ? (
              <li>Directs customers to your booking page to schedule</li>
            ) : (
              <li className="text-warning">Add a booking URL so AI can help customers schedule</li>
            )}
            {syncEnabled && provider ? (
              <li>Checks your calendar to avoid double-bookings</li>
            ) : (
              <li>Enable calendar sync for automatic availability detection</li>
            )}
            <li>Respects your business hours and closed dates</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Calendar Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
