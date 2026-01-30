import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useCalendarConnections,
  CALENDAR_PROVIDERS,
  type CalendarConnection,
} from "@/hooks/useCalendarConnections";
import { useTenantSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import BusinessHoursEditor, { type BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "10:00", close: "14:00", closed: true },
  sunday: { open: "10:00", close: "14:00", closed: true },
};

interface AvailableCalendar {
  id: string;
  name: string;
  primary?: boolean;
}

export function CalendarConnectionWizard({ open, onOpenChange }: CalendarConnectionWizardProps) {
  const { createConnection, connections, refetch } = useCalendarConnections();
  const { tenant, updateTenant, isUpdating } = useTenantSettings();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<CalendarConnection["provider"] | null>(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    (tenant?.hours_json as unknown as BusinessHours) || DEFAULT_HOURS
  );
  const [minLeadHours, setMinLeadHours] = useState(tenant?.min_lead_hours || 2);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(tenant?.max_advance_days || 30);
  const [bufferMinutes, setBufferMinutes] = useState(tenant?.appointment_buffer_minutes || 15);
  
  // OAuth states
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<AvailableCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncedEventsCount, setSyncedEventsCount] = useState(0);

  // Helper to process a newly detected connection
  const processNewConnection = (data: { config_json?: unknown }) => {
    const cals = (data.config_json as { available_calendars?: AvailableCalendar[] })?.available_calendars || [];
    setAvailableCalendars(cals);
    const primaryIds = cals.filter((c) => c.primary).map((c) => c.id);
    setSelectedCalendarIds(primaryIds.length > 0 ? primaryIds : cals.slice(0, 1).map((c) => c.id));
    setIsConnecting(false);
    setStep(2);
  };

  // Listen for OAuth callback messages (primary detection)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "calendar-oauth-success") {
        setIsConnecting(false);
        setAvailableCalendars(event.data.calendars || []);
        const primaryIds = (event.data.calendars || [])
          .filter((c: AvailableCalendar) => c.primary)
          .map((c: AvailableCalendar) => c.id);
        setSelectedCalendarIds(primaryIds.length > 0 ? primaryIds : event.data.calendars?.slice(0, 1).map((c: AvailableCalendar) => c.id) || []);
        refetch();
        setStep(2);
      } else if (event.data?.type === "calendar-oauth-error") {
        setIsConnecting(false);
        toast({
          title: "Connection failed",
          description: event.data.error || "Could not connect to calendar",
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refetch, toast]);

  // Focus-based fallback: detect connection when user returns to window
  useEffect(() => {
    if (!isConnecting || !selectedProvider) return;

    const handleFocus = async () => {
      const { data } = await refetch();
      const newConn = data?.find(
        (c) => c.provider === selectedProvider && c.status === "connected"
      );
      if (newConn) {
        processNewConnection(newConn);
        refetch();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isConnecting, selectedProvider, refetch]);

  // Polling fallback: check every 2s while connecting
  useEffect(() => {
    if (!isConnecting || !selectedProvider) return;

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("provider", selectedProvider)
        .eq("status", "connected")
        .maybeSingle();

      if (data) {
        clearInterval(pollInterval);
        processNewConnection(data);
        refetch();
      }
    }, 2000);

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (isConnecting) {
        setIsConnecting(false);
        toast({ title: "Connection timed out", variant: "destructive" });
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isConnecting, selectedProvider, toast, refetch]);

  // Get current connected calendar
  useEffect(() => {
    const connectedCal = connections.find(c => c.status === "connected" && (c.provider === "google" || c.provider === "microsoft"));
    if (connectedCal) {
      setCurrentConnectionId(connectedCal.id);
      const calendars = (connectedCal.config_json as any)?.available_calendars || [];
      setAvailableCalendars(calendars);
      setSelectedCalendarIds((connectedCal.config_json as any)?.selected_calendar_ids || []);
    }
  }, [connections]);

  // Track which providers have OAuth configured
  const [providerStatus, setProviderStatus] = useState<Record<string, "available" | "not_configured" | "unknown">>({
    google: "unknown",
    microsoft: "unknown",
    ics: "available",
    manual: "available",
  });
  const [showSetupHelp, setShowSetupHelp] = useState(false);
  const [setupHelpProvider, setSetupHelpProvider] = useState<string | null>(null);

  const startOAuth = async (provider: "google" | "microsoft") => {
    setIsConnecting(true);
    setSelectedProvider(provider);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in first", variant: "destructive" });
        setIsConnecting(false);
        return;
      }

      const response = await supabase.functions.invoke("calendar-oauth-start", {
        body: { provider },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Check if the response indicates OAuth is not configured
      if (response.data?.error) {
        const errorMsg = response.data.error as string;
        if (errorMsg.includes("not configured")) {
          setProviderStatus(prev => ({ ...prev, [provider]: "not_configured" }));
          setSetupHelpProvider(provider);
          setShowSetupHelp(true);
          setIsConnecting(false);
          return;
        }
        throw new Error(errorMsg);
      }

      const { auth_url } = response.data;
      if (!auth_url) {
        throw new Error("No auth URL returned");
      }

      // Mark as available since we got a valid URL
      setProviderStatus(prev => ({ ...prev, [provider]: "available" }));

      // Open popup for OAuth
      const popup = window.open(
        auth_url,
        "calendar-oauth",
        "width=600,height=700,left=100,top=100"
      );

      if (!popup) {
        toast({
          title: "Popup blocked",
          description: "Please allow popups for this site and try again",
          variant: "destructive",
        });
        setIsConnecting(false);
      }
    } catch (error: unknown) {
      console.error("OAuth start error:", error);
      const message = error instanceof Error ? error.message : "Failed to start connection";
      
      // Check if this is a "not configured" error
      if (message.includes("not configured") || message.includes("500")) {
        setProviderStatus(prev => ({ ...prev, [provider]: "not_configured" }));
        setSetupHelpProvider(provider);
        setShowSetupHelp(true);
        setIsConnecting(false);
        return;
      }
      
      toast({
        title: "Connection failed",
        description: message,
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleSelectCalendars = async () => {
    const connection = connections.find(c => c.provider === selectedProvider && c.status === "connected");
    if (!connection) {
      toast({ title: "No connection found", variant: "destructive" });
      return;
    }

    try {
      await supabase
        .from("calendar_connections")
        .update({
          config_json: {
            ...(connection.config_json as object),
            selected_calendar_ids: selectedCalendarIds,
          },
        })
        .eq("id", connection.id);

      setCurrentConnectionId(connection.id);
      refetch();
      setStep(3);
    } catch (error) {
      toast({ title: "Failed to save calendar selection", variant: "destructive" });
    }
  };

  const handleTestSync = async () => {
    if (!currentConnectionId) {
      toast({ title: "No calendar connected", variant: "destructive" });
      return;
    }

    setSyncStatus("syncing");
    try {
      const response = await supabase.functions.invoke("sync-availability", {
        body: { connection_id: currentConnectionId, days: 30 },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setSyncedEventsCount(response.data?.synced_count || 0);
      setSyncStatus("success");
    } catch (error: unknown) {
      console.error("Sync error:", error);
      setSyncStatus("error");
      const message = error instanceof Error ? error.message : "Sync failed";
      toast({ title: "Sync failed", description: message, variant: "destructive" });
    }
  };

  const handleNext = async () => {
    if (step === 1 && selectedProvider) {
      if (selectedProvider === "google" || selectedProvider === "microsoft") {
        // Start OAuth flow
        startOAuth(selectedProvider);
        return;
      } else if (selectedProvider === "ics") {
        setStep(2); // Go to ICS URL input
      } else if (selectedProvider === "manual") {
        // Create manual connection and go to hours
        await createConnection.mutateAsync({
          provider: "manual",
          auth_type: "manual",
        });
        setStep(3);
      }
    } else if (step === 2) {
      if (selectedProvider === "ics") {
        // Save ICS connection
        await createConnection.mutateAsync({
          provider: "ics",
          auth_type: "ics_url",
          config_json: { ics_url: icsUrl },
        });
        setStep(3);
      } else {
        // OAuth - save calendar selection
        await handleSelectCalendars();
      }
    } else if (step === 3) {
      setStep(4); // Go to booking rules
    } else if (step === 4) {
      // Final step - save tenant settings
      await updateTenant.mutateAsync({
        hours_json: businessHours as Record<string, never>,
        min_lead_hours: minLeadHours,
        max_advance_days: maxAdvanceDays,
        appointment_buffer_minutes: bufferMinutes,
      });
      setStep(5); // Go to test sync
    } else if (step === 5) {
      setStep(6); // Success
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      if (selectedProvider === "ics" || selectedProvider === "google" || selectedProvider === "microsoft") {
        setStep(2);
      } else {
        setStep(1);
      }
    } else if (step === 4) {
      setStep(3);
    } else if (step === 5) {
      setStep(4);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedProvider(null);
    setIcsUrl("");
    setSyncStatus("idle");
    setAvailableCalendars([]);
    setSelectedCalendarIds([]);
    onOpenChange(false);
  };

  const canProceed = () => {
    if (step === 1) return !!selectedProvider;
    if (step === 2) {
      if (selectedProvider === "ics") return icsUrl.trim().length > 0;
      return selectedCalendarIds.length > 0;
    }
    if (step === 3) return true;
    if (step === 4) return true;
    if (step === 5) return syncStatus === "success";
    return true;
  };

  const toggleCalendar = (id: string) => {
    setSelectedCalendarIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        {step < 6 && (
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Connect Your Schedule</DialogTitle>
                <DialogDescription>
                  {step === 1 && "Choose where your schedule lives"}
                  {step === 2 && (selectedProvider === "ics" ? "Enter your calendar feed URL" : "Select which calendars to sync")}
                  {step === 3 && "Set your business hours"}
                  {step === 4 && "Configure booking rules"}
                  {step === 5 && "Test the sync"}
                </DialogDescription>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex gap-1 mt-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </DialogHeader>
        )}

        {/* Step 1: Choose Provider */}
        {step === 1 && (
          <div className="py-4 space-y-4">
            {/* Prioritize ICS - works without OAuth setup */}
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Recommended: Use a Calendar Link
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Works with any calendar (Google, Outlook, Apple) without extra setup
              </p>
            </div>

            <RadioGroup
              value={selectedProvider || ""}
              onValueChange={(v) => setSelectedProvider(v as CalendarConnection["provider"])}
              className="space-y-2"
            >
              {/* Show ICS first as recommended option */}
              {CALENDAR_PROVIDERS.filter(p => p.id === "ics").map((provider) => (
                <label
                  key={provider.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProvider === provider.id
                      ? "border-primary bg-primary/5"
                      : "border-green-500/30 hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={provider.id} className="sr-only" />
                  <span className="text-2xl">{provider.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      {provider.name}
                      <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                        No setup needed
                      </Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                  {selectedProvider === provider.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </label>
              ))}
              
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground px-1">Or use direct sync (requires admin setup):</p>
              
              {/* Google and Microsoft with status indicators */}
              {CALENDAR_PROVIDERS.filter(p => ["google", "microsoft"].includes(p.id)).map((provider) => {
                const status = providerStatus[provider.id];
                const isNotConfigured = status === "not_configured";
                
                return (
                  <label
                    key={provider.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isNotConfigured 
                        ? "opacity-60 cursor-not-allowed border-border bg-muted/20"
                        : selectedProvider === provider.id
                          ? "border-primary bg-primary/5 cursor-pointer"
                          : "border-border hover:bg-muted/50 cursor-pointer"
                    }`}
                  >
                    <RadioGroupItem value={provider.id} className="sr-only" disabled={isNotConfigured} />
                    <span className="text-2xl">{provider.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium flex items-center gap-2">
                        {provider.name}
                        {isNotConfigured && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            Setup required
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                    {selectedProvider === provider.id && !isNotConfigured && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                    {isNotConfigured && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSetupHelpProvider(provider.id);
                          setShowSetupHelp(true);
                        }}
                      >
                        Learn more
                      </Button>
                    )}
                  </label>
                );
              })}
              
              {/* Manual option last */}
              {CALENDAR_PROVIDERS.filter(p => p.id === "manual").map((provider) => (
                <label
                  key={provider.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProvider === provider.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={provider.id} className="sr-only" />
                  <span className="text-2xl">{provider.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                  {selectedProvider === provider.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </label>
              ))}
            </RadioGroup>

            {/* Setup Help Dialog */}
            {showSetupHelp && (
              <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {setupHelpProvider === "google" ? "Google Calendar" : "Microsoft Outlook"} requires OAuth setup
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      To enable direct sync, an admin needs to configure OAuth credentials in the backend.
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p className="font-medium">In the meantime, you can:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Use <strong>Calendar Link (ICS)</strong> — works with any calendar</li>
                        <li>Use <strong>Manual Only</strong> — manage availability here</li>
                      </ul>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => {
                        setShowSetupHelp(false);
                        setSelectedProvider("ics");
                      }}
                    >
                      Use Calendar Link Instead
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Calendar Selection (OAuth) or ICS URL */}
        {step === 2 && (
          <div className="py-4 space-y-4">
            {selectedProvider === "ics" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="icsUrl">Calendar Feed URL</Label>
                  <Input
                    id="icsUrl"
                    type="url"
                    placeholder="https://calendar.google.com/calendar/ical/..."
                    value={icsUrl}
                    onChange={(e) => setIcsUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Most calendars have an option to export as ICS/iCal.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium mb-1">How to find your ICS URL:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Google Calendar: Settings → Share → "Secret address in iCal format"</li>
                    <li>Apple Calendar: File → Export → Copy the URL</li>
                    <li>Outlook: Settings → View all settings → Calendar → Shared calendars</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Select which calendars should block your availability:
                </p>
                
                {availableCalendars.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p>Loading calendars...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableCalendars.map((cal) => (
                      <label
                        key={cal.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedCalendarIds.includes(cal.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedCalendarIds.includes(cal.id)}
                          onCheckedChange={() => toggleCalendar(cal.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{cal.name}</p>
                          {cal.primary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Business Hours */}
        {step === 3 && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              AI will only offer appointments during these hours.
            </p>
            <BusinessHoursEditor hours={businessHours} onChange={setBusinessHours} />
          </div>
        )}

        {/* Step 4: Booking Rules */}
        {step === 4 && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Minimum notice required</Label>
              <select
                value={minLeadHours}
                onChange={(e) => setMinLeadHours(Number(e.target.value))}
                className="w-full h-11 rounded-lg border border-input bg-background px-4"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours (1 day)</option>
                <option value={48}>48 hours (2 days)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                AI won't book anything sooner than this
              </p>
            </div>

            <div className="space-y-2">
              <Label>How far in advance can people book?</Label>
              <select
                value={maxAdvanceDays}
                onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                className="w-full h-11 rounded-lg border border-input bg-background px-4"
              >
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
                <option value={60}>2 months</option>
                <option value={90}>3 months</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Buffer between appointments</Label>
              <select
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
                className="w-full h-11 rounded-lg border border-input bg-background px-4"
              >
                <option value={0}>No buffer</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Time between back-to-back appointments
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Test Sync */}
        {step === 5 && (
          <div className="py-4 space-y-4">
            <div className="text-center">
              {syncStatus === "idle" && (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Let's verify your calendar sync is working correctly.
                  </p>
                  <Button onClick={handleTestSync} size="lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Sync Now
                  </Button>
                </>
              )}

              {syncStatus === "syncing" && (
                <div className="py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Syncing your calendar...</p>
                </div>
              )}

              {syncStatus === "success" && (
                <div className="py-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="font-medium text-green-600 mb-2">Sync successful!</p>
                  <p className="text-sm text-muted-foreground">
                    Found {syncedEventsCount} busy time{syncedEventsCount !== 1 ? "s" : ""} in the next 30 days
                  </p>
                </div>
              )}

              {syncStatus === "error" && (
                <div className="py-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="font-medium text-red-600 mb-2">Sync failed</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    There was an issue syncing your calendar.
                  </p>
                  <Button onClick={handleTestSync} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 6 && (
          <div className="py-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <DialogTitle className="mb-2">Schedule Connected!</DialogTitle>
            <DialogDescription>
              AI can now see your availability and book appointments without conflicts.
            </DialogDescription>
          </div>
        )}

        <DialogFooter>
          {step < 6 ? (
            <>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={isConnecting}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isConnecting || createConnection.isPending || isUpdating}
              >
                {(isConnecting || createConnection.isPending || isUpdating) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {step === 1 && (selectedProvider === "google" || selectedProvider === "microsoft")
                  ? "Connect"
                  : step === 5
                    ? "Complete Setup"
                    : "Next"}
                {step !== 5 && !isConnecting && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
