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
  useCalendarSync,
  CALENDAR_PROVIDERS,
  useAvailableSlots,
  type CalendarConnection,
  type BookingBehavior,
} from "@/hooks/useCalendarConnections";
import { useTenantSettings, useAssistantSettings } from "@/hooks/useSettings";
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
  Clock,
  CalendarCheck,
  Send,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { format, addDays } from "date-fns";

interface CalendarConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import { DEFAULT_BUSINESS_HOURS } from "@/lib/hoursUtils";

const DEFAULT_HOURS = DEFAULT_BUSINESS_HOURS;

interface AvailableCalendar {
  id: string;
  name: string;
  primary?: boolean;
}

// Step definitions for wizard
const WIZARD_STEPS_FULL = [
  { id: 1, label: "Provider" },
  { id: 2, label: "Connect" },
  { id: 3, label: "Hours" },
  { id: 4, label: "Rules" },
  { id: 5, label: "Behavior" },
  { id: 6, label: "Test" },
];

const WIZARD_STEPS_INTERNAL = [
  { id: 1, label: "Provider" },
  { id: 3, label: "Hours" },
  { id: 4, label: "Rules" },
  { id: 5, label: "Behavior" },
];

const WIZARD_STEPS_SQUARE = [
  { id: 1, label: "Provider" },
  { id: 3, label: "Hours" },
  { id: 4, label: "Rules" },
  { id: 5, label: "Behavior" },
  { id: 6, label: "Test" },
];

export function CalendarConnectionWizard({ open, onOpenChange }: CalendarConnectionWizardProps) {
  const { createConnection, connections, refetch } = useCalendarConnections();
  const { sync: syncCalendar } = useCalendarSync();
  const { tenant, updateTenant, isUpdating } = useTenantSettings();
  const { settings: assistantSettings, updateSettings: updateAssistantSettings } = useAssistantSettings();
  const { toast } = useToast();
  const { terminology } = useIndustryContext();
  const apptLabel = terminology.appointmentLabel; // "job", "appointment", "visit", etc.
  
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<CalendarConnection["provider"] | "internal" | null>(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    (tenant?.hours_json as unknown as BusinessHours) || DEFAULT_HOURS
  );
  const [minLeadHours, setMinLeadHours] = useState(tenant?.min_lead_hours || 2);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(tenant?.max_advance_days || 30);
  const [bufferMinutes, setBufferMinutes] = useState(tenant?.appointment_buffer_minutes || 15);
  
  // Booking behavior state
  const [bookingBehavior, setBookingBehavior] = useState<BookingBehavior>(
    (assistantSettings as Record<string, unknown>)?.ai_booking_mode === "auto_book" ? "auto_book" : "pending_approval"
  );
  
  // OAuth states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingCalendars, setIsRefreshingCalendars] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<AvailableCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncedEventsCount, setSyncedEventsCount] = useState(0);

  // Test booking state
  const [testSlots, setTestSlots] = useState<{ slot_start: string; slot_end: string }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [testBookingSlot, setTestBookingSlot] = useState<string | null>(null);
  const [isTestingBooking, setIsTestingBooking] = useState(false);
  const [testBookingResult, setTestBookingResult] = useState<"success" | "error" | null>(null);

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
      if (selectedProvider === "square") {
        // Square uses the integrations table, not calendar_connections
        const { data } = await supabase
          .from("integrations")
          .select("id, status, config_json")
          .eq("provider", "square_pos")
          .eq("status", "connected")
          .maybeSingle();

        if (data) {
          clearInterval(pollInterval);
          setIsConnecting(false);
          toast({ title: "Square connected!", description: "Your Square Appointments are now synced." });
          // Also create a calendar_connection record so availability sync knows about it
          await createConnection.mutateAsync({
            provider: "square" as any,
            auth_type: "oauth",
            config_json: { integration_id: data.id },
          });
          setStep(3); // Skip calendar selection, go to hours
          refetch();
        }
      } else {
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
      const configJson = connectedCal.config_json as Record<string, unknown> | null;
      const calendars = (configJson?.available_calendars as AvailableCalendar[]) || [];
      setAvailableCalendars(calendars);
      setSelectedCalendarIds((configJson?.selected_calendar_ids as string[]) || []);
    }
  }, [connections]);

  // API key input for Calendly
  const [calendlyApiKey, setCalendlyApiKey] = useState("");
  const [isVerifyingCalendly, setIsVerifyingCalendly] = useState(false);

  // Track which providers have OAuth configured
  const [providerStatus, setProviderStatus] = useState<Record<string, "available" | "not_configured" | "coming_soon" | "unknown">>({
    google: "unknown",
    microsoft: "unknown",
    square: "available",
    calendly: "available",
    jobber: "coming_soon",
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
        body: { provider, tenant_id: tenant?.id },
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
      const result = await syncCalendar(currentConnectionId);
      setSyncedEventsCount(result.syncedCount);
      setSyncStatus("success");

      // After sync, load available slots
      await loadTestSlots();
    } catch {
      setSyncStatus("error");
    }
  };

  const loadTestSlots = async () => {
    setIsLoadingSlots(true);
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, 7);
      
      const { data, error } = await supabase.rpc("fn_compute_available_slots", {
        _tenant_id: tenant?.id,
        _start_date: format(startDate, "yyyy-MM-dd"),
        _end_date: format(endDate, "yyyy-MM-dd"),
        _duration_minutes: 60,
        _buffer_minutes: bufferMinutes || 0,
        _business_hours: (businessHours as unknown as Record<string, never>) || null,
      });

      if (error) throw error;
      
      // Take first 5 slots
      setTestSlots((data || []).slice(0, 5));
    } catch (error) {
      console.error("Failed to load slots:", error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleTestBooking = async (slotStart: string) => {
    setTestBookingSlot(slotStart);
    setIsTestingBooking(true);
    setTestBookingResult(null);
    
    try {
      // Just verify the slot is still available
      const startDate = new Date(slotStart);
      const endDate = addDays(startDate, 1);
      
      const { data, error } = await supabase.rpc("fn_compute_available_slots", {
        _tenant_id: tenant?.id,
        _start_date: format(startDate, "yyyy-MM-dd"),
        _end_date: format(endDate, "yyyy-MM-dd"),
        _duration_minutes: 60,
        _buffer_minutes: bufferMinutes || 0,
        _business_hours: (businessHours as unknown as Record<string, never>) || null,
      });

      if (error) throw error;
      
      const isAvailable = (data || []).some(
        (s: { slot_start: string }) => s.slot_start === slotStart
      );

      if (isAvailable) {
        setTestBookingResult("success");
        toast({ title: "Slot is available!", description: "AI would book this time successfully." });
      } else {
        setTestBookingResult("error");
        toast({ title: "Slot conflict detected", description: "This time is no longer available.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Test booking error:", error);
      setTestBookingResult("error");
    } finally {
      setIsTestingBooking(false);
    }
  };

  const handleRefreshCalendars = async () => {
    const connection = connections.find(c => 
      (c.provider === "google" || c.provider === "microsoft") && c.status === "connected"
    );
    if (!connection) {
      toast({ title: "No calendar connected", variant: "destructive" });
      return;
    }

    setIsRefreshingCalendars(true);
    try {
      const response = await supabase.functions.invoke("refresh-calendar-list", {
        body: { connection_id: connection.id, tenant_id: tenant?.id },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const freshCalendars = response.data?.calendars || [];
      setAvailableCalendars(freshCalendars);
      
      // Keep existing selections that still exist
      const validSelections = selectedCalendarIds.filter(id => 
        freshCalendars.some((c: AvailableCalendar) => c.id === id)
      );
      // If no selections remain, select the primary
      if (validSelections.length === 0) {
        const primaryIds = freshCalendars.filter((c: AvailableCalendar) => c.primary).map((c: AvailableCalendar) => c.id);
        setSelectedCalendarIds(primaryIds.length > 0 ? primaryIds : freshCalendars.slice(0, 1).map((c: AvailableCalendar) => c.id));
      } else {
        setSelectedCalendarIds(validSelections);
      }

      await refetch();
      toast({ title: "Calendars refreshed", description: `Found ${freshCalendars.length} calendar(s)` });
    } catch (error: unknown) {
      console.error("Refresh calendars error:", error);
      const message = error instanceof Error ? error.message : "Failed to refresh";
      toast({ title: "Refresh failed", description: message, variant: "destructive" });
    } finally {
      setIsRefreshingCalendars(false);
    }
  };

  const handleNext = async () => {
    if (step === 1 && selectedProvider) {
      if (selectedProvider === "google" || selectedProvider === "microsoft") {
        // Start OAuth flow
        startOAuth(selectedProvider);
        return;
      } else if (selectedProvider === "square") {
        // Start Square OAuth via integration system
        setIsConnecting(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast({ title: "Please log in first", variant: "destructive" });
            setIsConnecting(false);
            return;
          }
          const response = await supabase.functions.invoke("integration-oauth-start", {
            body: { provider: "square_pos", tenant_id: tenant?.id },
          });
          if (response.error || response.data?.error) {
            throw new Error(response.data?.error || response.error?.message || "Failed to start Square OAuth");
          }
          if (response.data?.url) {
            window.open(response.data.url, "_blank", "width=600,height=700");
          }
        } catch (err) {
          console.error("Square OAuth error:", err);
          toast({ title: "Failed to start Square connection", description: String(err), variant: "destructive" });
          setIsConnecting(false);
        }
        return;
      } else if (selectedProvider === "calendly") {
        setStep(2); // Go to Calendly API key input
      } else if (selectedProvider === "ics") {
        setStep(2); // Go to ICS URL input
      } else if (selectedProvider === "manual" || selectedProvider === "internal") {
        // Internal-only or manual: skip connect + test, go straight to hours
        if (selectedProvider === "internal") {
          // No calendar_connection needed for internal-only
          setStep(3);
        } else {
          await createConnection.mutateAsync({
            provider: "manual",
            auth_type: "manual",
          });
          setStep(3);
        }
      }
    } else if (step === 2) {
      if (selectedProvider === "calendly") {
        // Verify & save Calendly Personal Access Token
        if (!calendlyApiKey.trim()) {
          toast({ title: "Please enter your Personal Access Token", variant: "destructive" });
          return;
        }
        setIsVerifyingCalendly(true);
        try {
          const { data: vData, error: vError } = await supabase.functions.invoke("calendly-proxy", {
            body: { action: "verify_token", api_key: calendlyApiKey, tenant_id: tenant?.id },
          });
          if (vError || !vData?.valid) {
            toast({ title: "Invalid token", description: "Please double-check your Calendly Personal Access Token.", variant: "destructive" });
            setIsVerifyingCalendly(false);
            return;
          }
          toast({ title: `✓ Calendly verified`, description: `Connected as ${vData.user?.name || vData.user?.email}` });
          await createConnection.mutateAsync({
            provider: "calendly" as any,
            auth_type: "api_key",
            config_json: {
              api_key: calendlyApiKey,
              scheduling_url: vData.user?.scheduling_url,
              calendly_user_uri: vData.user?.uri,
              calendly_user_name: vData.user?.name,
              calendly_user_email: vData.user?.email,
            },
          });
          setStep(3);
        } catch (err) {
          console.error("Calendly verify error:", err);
          toast({ title: "Connection failed", variant: "destructive" });
        } finally {
          setIsVerifyingCalendly(false);
        }
      } else if (selectedProvider === "ics") {
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
      // Save tenant settings then go to behavior
      await updateTenant.mutateAsync({
        hours_json: businessHours as Record<string, never>,
        min_lead_hours: minLeadHours,
        max_advance_days: maxAdvanceDays,
        appointment_buffer_minutes: bufferMinutes,
      });
      setStep(5); // Go to booking behavior
    } else if (step === 5) {
      // Save booking behavior
      await updateAssistantSettings.mutateAsync({
        ai_booking_mode: bookingBehavior,
      });
      // Internal-only: skip test sync, go straight to success
      if (selectedProvider === "internal" || selectedProvider === "manual") {
        setStep(7); // Success
      } else {
        setStep(6); // Go to test
      }
    } else if (step === 6) {
      setStep(7); // Success
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
    } else if (step === 6) {
      setStep(5);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedProvider(null);
    setIcsUrl("");
    setSyncStatus("idle");
    setAvailableCalendars([]);
    setSelectedCalendarIds([]);
    setTestSlots([]);
    setTestBookingResult(null);
    onOpenChange(false);
  };

  const canProceed = () => {
    if (step === 1) return !!selectedProvider;
    if (step === 2) {
      if (selectedProvider === "ics") return icsUrl.trim().length > 0;
      if (selectedProvider === "calendly") return calendlyApiKey.trim().length > 0;
      return selectedCalendarIds.length > 0;
    }
    if (step === 3) return true;
    if (step === 4) return true;
    if (step === 5) return true;
    if (step === 6) {
      // Internal/manual providers skip test sync
      if (selectedProvider === "internal" || selectedProvider === "manual") return true;
      return syncStatus === "success";
    }
    return true;
  };

  const toggleCalendar = (id: string) => {
    setSelectedCalendarIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Choose where your schedule lives";
      case 2:
        if (selectedProvider === "ics") return "Enter your calendar feed URL";
        if (selectedProvider === "calendly") return "Connect your Calendly account";
        return "Select which calendars to sync";
      case 3: return "Set your business hours";
      case 4: return "Configure booking rules";
      case 5: return "Choose booking behavior";
      case 6: return "Test your setup";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        {step <= 6 && (
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Connect Your Schedule</DialogTitle>
                <DialogDescription>{getStepTitle()}</DialogDescription>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex gap-1 mt-4">
              {(selectedProvider === "internal" || selectedProvider === "manual" ? WIZARD_STEPS_INTERNAL : selectedProvider === "square" ? WIZARD_STEPS_SQUARE : WIZARD_STEPS_FULL).map((s) => (
                <div key={s.id} className="flex-1 space-y-1">
                  <div
                    className={`h-1 rounded-full transition-colors ${
                      s.id <= step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  <p className={`text-[10px] text-center ${s.id === step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                </div>
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
              onValueChange={(v) => setSelectedProvider(v as CalendarConnection["provider"] | "internal")}
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
              <p className="text-xs text-muted-foreground px-1">Direct calendar sync:</p>
              
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


              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground px-1">Booking platforms:</p>

              {/* Calendly — live, API key */}
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedProvider === "calendly"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="calendly" className="sr-only" />
                <span className="text-2xl">🗓️</span>
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2">
                    Calendly
                    <Badge variant="secondary" className="text-xs">API Key</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">Sync with your Calendly schedule</p>
                </div>
                {selectedProvider === "calendly" && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </label>

              {/* Square Appointments — OAuth via integration system */}
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedProvider === "square"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="square" className="sr-only" />
                <span className="text-2xl">⬜</span>
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2">
                    Square Appointments
                    <Badge variant="secondary" className="text-xs">OAuth</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">Sync with Square Appointments</p>
                </div>
                {selectedProvider === "square" && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </label>

              {/* Jobber - still coming soon */}
              {CALENDAR_PROVIDERS.filter(p => p.id === "jobber").map((provider) => (
                <label
                  key={provider.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 cursor-not-allowed opacity-60"
                >
                  <RadioGroupItem value={provider.id} className="sr-only" disabled />
                  <span className="text-2xl">{provider.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      {provider.name}
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                </label>
              ))}
              
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground px-1">No external calendar:</p>
              
              {/* Internal Only option */}
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedProvider === "internal"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="internal" className="sr-only" />
                <span className="text-2xl">🏠</span>
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2">
                    Internal Only
                    <Badge variant="secondary" className="text-xs">No sync needed</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Manage availability directly in Flux Receptionist — no external calendar needed
                  </p>
                </div>
                {selectedProvider === "internal" && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </label>

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

        {/* Step 2: Calendar Selection (OAuth), ICS URL, or Calendly API Key */}
        {step === 2 && (
          <div className="py-4 space-y-4">
            {selectedProvider === "calendly" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="calendlyToken">Personal Access Token</Label>
                  <Input
                    id="calendlyToken"
                    type="password"
                    placeholder="eyJraWQiOi..."
                    value={calendlyApiKey}
                    onChange={(e) => setCalendlyApiKey(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll verify this instantly and store it securely.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <p className="font-medium">How to get your token:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground ml-1">
                    <li>Go to <span className="font-mono text-xs">calendly.com</span> → sign in</li>
                    <li>Click your avatar → <strong>Integrations</strong></li>
                    <li>Select <strong>API & Webhooks</strong></li>
                    <li>Click <strong>Generate New Token</strong> and copy it here</li>
                  </ol>
                  <a
                    href="https://calendly.com/integrations/api_webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary text-xs mt-1 hover:underline"
                  >
                    Open Calendly API settings
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </>
            ) : selectedProvider === "ics" ? (
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Select which calendars should block your availability:
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshCalendars}
                    disabled={isRefreshingCalendars}
                    className="text-xs"
                  >
                    {isRefreshingCalendars ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Refresh list
                  </Button>
                </div>
                
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
              AI will only offer {apptLabel}s during these hours.
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
                <option value={0}>No minimum</option>
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
              <Label>Buffer between {apptLabel}s</Label>
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
                Time between back-to-back {apptLabel}s
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Booking Behavior */}
        {step === 5 && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose how AI handles booking confirmations
            </p>
            
            <RadioGroup
              value={bookingBehavior}
              onValueChange={(v) => setBookingBehavior(v as BookingBehavior)}
              className="space-y-3"
            >
              <label
                className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  bookingBehavior === "auto_book"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="auto_book" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">Auto-Book</span>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI confirms {apptLabel}s instantly and syncs to your calendar.
                    Best for established businesses with predictable schedules.
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="h-3 w-3" /> Adds to calendar
                    </span>
                    <span className="flex items-center gap-1">
                      <Send className="h-3 w-3" /> Sends confirmation
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  bookingBehavior === "pending_approval"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="pending_approval" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Pending Approval</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI collects booking details but waits for your approval before confirming. 
                    Good for complex services or when you need manual review.
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Creates request
                    </span>
                    <span className="flex items-center gap-1">
                      You approve manually
                    </span>
                  </div>
                </div>
              </label>
            </RadioGroup>

            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>💡 You can change this anytime in Settings → Booking Delivery</p>
            </div>
          </div>
        )}

        {/* Step 6: Test Sync */}
        {step === 6 && (
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
                <div className="py-4 space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="font-medium text-green-600 mb-2">Sync successful!</p>
                  <p className="text-sm text-muted-foreground">
                    Found {syncedEventsCount} busy time{syncedEventsCount !== 1 ? "s" : ""} in the next 30 days
                  </p>

                  {/* Available Slots Test */}
                  <Separator className="my-4" />
                  
                  <div className="text-left">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-sm">Next 5 Available Slots</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadTestSlots}
                        disabled={isLoadingSlots}
                      >
                        {isLoadingSlots ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    {isLoadingSlots ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </div>
                    ) : testSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No available slots found in the next 7 days
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {testSlots.map((slot, i) => {
                          const startDate = new Date(slot.slot_start);
                          const isSelected = testBookingSlot === slot.slot_start;
                          const showSuccess = isSelected && testBookingResult === "success";
                          
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                showSuccess 
                                  ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                                  : "border-border"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {format(startDate, "EEEE, MMM d")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(startDate, "h:mm a")}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant={showSuccess ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => handleTestBooking(slot.slot_start)}
                                disabled={isTestingBooking}
                              >
                                {isTestingBooking && isSelected ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : showSuccess ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                                    Available
                                  </>
                                ) : (
                                  "Test Book"
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

        {/* Step 7: Success */}
        {step === 7 && (
          <div className="py-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <DialogTitle className="mb-2">Schedule Connected!</DialogTitle>
            <DialogDescription>
              AI can now see your availability and book {apptLabel}s without conflicts.
            </DialogDescription>
            
            <div className="mt-6 p-4 rounded-lg bg-muted/50 text-left space-y-2">
              <p className="text-sm font-medium">Your setup:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {selectedProvider === "ics" ? "Calendar link connected" : 
                   selectedProvider === "manual" ? "Manual availability mode" :
                   selectedProvider === "internal" ? "Internal availability management" : 
                   `${selectedProvider} calendar synced`}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Business hours configured
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Booking mode: {bookingBehavior === "auto_book" ? "Auto-Book" : "Pending Approval"}
                </li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {step <= 6 ? (
            <>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={isConnecting}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isConnecting || isVerifyingCalendly || createConnection.isPending || isUpdating}
              >
                {(isConnecting || isVerifyingCalendly || createConnection.isPending || isUpdating) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {step === 1 && (selectedProvider === "google" || selectedProvider === "microsoft" || selectedProvider === "square")
                  ? "Connect"
                  : step === 2 && selectedProvider === "calendly"
                    ? (isVerifyingCalendly ? "Verifying..." : "Verify & Connect")
                    : step === 6
                      ? "Complete Setup"
                      : "Next"}
                {step !== 6 && !isConnecting && !isVerifyingCalendly && <ArrowRight className="h-4 w-4 ml-2" />}
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
