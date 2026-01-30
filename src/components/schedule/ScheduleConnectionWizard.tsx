import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Clock,
  AlertTriangle,
  Mail,
  Link2,
  CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCalendarConnections, CALENDAR_PROVIDERS } from "@/hooks/useCalendarConnections";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Provider options for the wizard
interface ProviderOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  popular?: boolean;
  authType: "oauth" | "api_key" | "ics_url" | "manual";
  status: "available" | "coming_soon" | "api_key";
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: "google",
    name: "Google Calendar",
    icon: "📅",
    description: "Perfect for Gmail/Google Workspace users",
    popular: true,
    authType: "oauth",
    status: "available",
  },
  {
    id: "calendly",
    name: "Calendly",
    icon: "🗓️",
    description: "If you use Calendly for bookings",
    authType: "api_key",
    status: "api_key",
  },
  {
    id: "square",
    name: "Square Appointments",
    icon: "⬛",
    description: "For Square users with appointment scheduling",
    authType: "api_key",
    status: "api_key",
  },
  {
    id: "jobber",
    name: "Jobber",
    icon: "🔧",
    description: "For field service businesses using Jobber",
    authType: "api_key",
    status: "api_key",
  },
  {
    id: "microsoft",
    name: "Microsoft Outlook",
    icon: "📧",
    description: "For Outlook/Office 365 calendars",
    authType: "oauth",
    status: "available",
  },
  {
    id: "ics",
    name: "Calendar Link (ICS)",
    icon: "🔗",
    description: "Import from any calendar with a share link",
    authType: "ics_url",
    status: "available",
  },
  {
    id: "not_sure",
    name: "I'm not sure",
    icon: "❓",
    description: "Let us help you figure out what to connect",
    authType: "manual",
    status: "available",
  },
];

interface ScheduleConnectionWizardProps {
  embedded?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function ScheduleConnectionWizard({ embedded = false, onComplete, onSkip }: ScheduleConnectionWizardProps) {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { connections, createConnection, refetch, hasConnectedCalendar } = useCalendarConnections();
  
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  
  // "I'm not sure" flow answers
  const [hasPublicBookingLink, setHasPublicBookingLink] = useState<boolean | null>(null);
  const [usesGmail, setUsesGmail] = useState<boolean | null>(null);
  
  // API key flow
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  
  // ICS URL flow
  const [icsUrl, setIcsUrl] = useState("");

  // Filter providers by search
  const filteredProviders = PROVIDER_OPTIONS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "calendar-oauth-success") {
        setIsConnecting(false);
        refetch();
        setStep(4); // Success step
        toast({ title: "Calendar connected!", description: "Your schedule is now synced." });
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

  // Polling fallback for OAuth
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
        setIsConnecting(false);
        refetch();
        setStep(4);
        toast({ title: "Calendar connected!" });
      }
    }, 2000);

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

  const startOAuth = async (provider: "google" | "microsoft") => {
    setIsConnecting(true);
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

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      const { auth_url } = response.data;
      if (!auth_url) throw new Error("No auth URL returned");

      const popup = window.open(auth_url, "calendar-oauth", "width=600,height=700,left=100,top=100");
      if (!popup) {
        toast({
          title: "Popup blocked",
          description: "Please allow popups for this site",
          variant: "destructive",
        });
        setIsConnecting(false);
      }
    } catch (error: unknown) {
      console.error("OAuth error:", error);
      const message = error instanceof Error ? error.message : "Connection failed";
      toast({ title: "Connection failed", description: message, variant: "destructive" });
      setIsConnecting(false);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    
    if (providerId === "not_sure") {
      setStep(2); // Go to "not sure" questions
    } else if (providerId === "google" || providerId === "microsoft") {
      setStep(3); // Go to OAuth connect step
    } else if (providerId === "ics") {
      setStep(3); // Go to ICS URL input
    } else {
      // API key providers (Calendly, Square, Jobber)
      setStep(3); // Go to API key input
    }
  };

  const handleNotSureNext = () => {
    // Determine recommendation based on answers
    if (usesGmail) {
      setSelectedProvider("google");
      setStep(3);
    } else if (hasPublicBookingLink) {
      // Recommend ICS or webhook
      setSelectedProvider("ics");
      setStep(3);
    } else {
      // Recommend manual busy blocks
      setSelectedProvider("manual");
      handleManualSetup();
    }
  };

  const handleManualSetup = async () => {
    try {
      await createConnection.mutateAsync({
        provider: "manual",
        auth_type: "manual",
      });
      setStep(4);
    } catch (error) {
      console.error("Manual setup error:", error);
    }
  };

  const handleICSConnect = async () => {
    if (!icsUrl) {
      toast({ title: "Please enter an ICS URL", variant: "destructive" });
      return;
    }
    
    setIsConnecting(true);
    try {
      await createConnection.mutateAsync({
        provider: "ics",
        auth_type: "ics_url",
        config_json: { ics_url: icsUrl },
      });
      
      // Trigger sync
      const conn = connections.find(c => c.provider === "ics");
      if (conn) {
        await supabase.functions.invoke("sync-availability", {
          body: { connection_id: conn.id, days: 30 },
        });
      }
      
      setStep(4);
    } catch (error) {
      console.error("ICS connect error:", error);
      toast({ title: "Failed to connect calendar", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleApiKeyConnect = async () => {
    if (!apiKey) {
      toast({ title: "Please enter your API key", variant: "destructive" });
      return;
    }
    
    setIsConnecting(true);
    try {
      await createConnection.mutateAsync({
        provider: selectedProvider as any,
        auth_type: "api_key",
        config_json: { 
          api_key: apiKey,
          webhook_url: webhookUrl || undefined,
        },
      });
      setStep(4);
    } catch (error) {
      console.error("API key connect error:", error);
      toast({ title: "Failed to connect", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate("/app/dashboard");
    }
  };

  const handleTestAvailability = () => {
    navigate("/debug/availability");
  };

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">What do you use to manage bookings?</h2>
              <p className="text-muted-foreground">
                Connect your calendar so AI never double-books your appointments
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for your tool..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Provider Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedProvider === provider.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => handleProviderSelect(provider.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}</span>
                          {provider.popular && (
                            <Badge variant="secondary" className="text-[10px]">Popular</Badge>
                          )}
                          {provider.status === "coming_soon" && (
                            <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
                          )}
                          {provider.status === "api_key" && (
                            <Badge variant="outline" className="text-[10px]">API Key</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {onSkip && (
              <div className="text-center pt-2">
                <Button variant="ghost" onClick={onSkip}>
                  Skip for now
                </Button>
              </div>
            )}
          </div>
        );

      case 2:
        // "I'm not sure" flow
        return (
          <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Let's figure this out together</h2>
              <p className="text-muted-foreground">
                Answer a couple of quick questions
              </p>
            </div>

            <div className="space-y-6">
              {/* Question 1 */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <Label className="text-base font-medium mb-3 block">
                  Do you have a public booking link customers use?
                </Label>
                <RadioGroup
                  value={hasPublicBookingLink === null ? "" : hasPublicBookingLink ? "yes" : "no"}
                  onValueChange={(v) => setHasPublicBookingLink(v === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="booking-yes" />
                    <Label htmlFor="booking-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="booking-no" />
                    <Label htmlFor="booking-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Question 2 */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <Label className="text-base font-medium mb-3 block flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Do you use Gmail or Google Workspace?
                </Label>
                <RadioGroup
                  value={usesGmail === null ? "" : usesGmail ? "yes" : "no"}
                  onValueChange={(v) => setUsesGmail(v === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="gmail-yes" />
                    <Label htmlFor="gmail-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="gmail-no" />
                    <Label htmlFor="gmail-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Button
              onClick={handleNotSureNext}
              disabled={hasPublicBookingLink === null || usesGmail === null}
              className="w-full"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {/* Recommendation preview */}
            {usesGmail === true && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <p className="font-medium text-primary">Recommendation: Google Calendar</p>
                <p className="text-muted-foreground">
                  Since you use Gmail, Google Calendar is the easiest option!
                </p>
              </div>
            )}

            {usesGmail === false && hasPublicBookingLink === false && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <p className="font-medium text-amber-600">Recommendation: Manual Busy Blocks</p>
                <p className="text-muted-foreground">
                  You can manage your availability directly in CloseLoop
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        // Connect step (varies by provider)
        return (
          <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {/* Google / Microsoft OAuth */}
            {(selectedProvider === "google" || selectedProvider === "microsoft") && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    Connect {selectedProvider === "google" ? "Google Calendar" : "Outlook"}
                  </h2>
                  <p className="text-muted-foreground">
                    This prevents the AI from booking over your real appointments
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={() => startOAuth(selectedProvider as "google" | "microsoft")}
                  disabled={isConnecting}
                  className="w-full max-w-xs"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect {selectedProvider === "google" ? "Google" : "Outlook"}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  You'll be redirected to sign in with {selectedProvider === "google" ? "Google" : "Microsoft"}
                </p>
              </div>
            )}

            {/* ICS URL */}
            {selectedProvider === "ics" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold mb-2">Add Calendar Link</h2>
                  <p className="text-muted-foreground">
                    Paste your calendar's sharing URL (ICS format)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ics-url">Calendar URL</Label>
                  <Input
                    id="ics-url"
                    type="url"
                    placeholder="https://calendar.example.com/feed.ics"
                    value={icsUrl}
                    onChange={(e) => setIcsUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in your calendar app's "Share" or "Export" settings
                  </p>
                </div>

                <Button
                  onClick={handleICSConnect}
                  disabled={!icsUrl || isConnecting}
                  className="w-full"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Calendar"
                  )}
                </Button>
              </div>
            )}

            {/* API Key providers (Calendly, Square, Jobber) */}
            {(selectedProvider === "calendly" || selectedProvider === "square" || selectedProvider === "jobber") && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold mb-2">
                    Connect {PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.name}
                  </h2>
                  <p className="text-muted-foreground">
                    Enter your API key to sync busy times
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  {selectedProvider === "calendly" && (
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Webhook URL (optional)</Label>
                      <Input
                        id="webhook-url"
                        type="url"
                        placeholder="https://..."
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        For real-time sync, add a webhook that posts to CloseLoop
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium mb-1">Where to find your API key:</p>
                  {selectedProvider === "calendly" && (
                    <p className="text-muted-foreground">
                      Calendly → Integrations → API & Webhooks → Copy Personal Access Token
                    </p>
                  )}
                  {selectedProvider === "square" && (
                    <p className="text-muted-foreground">
                      Square Dashboard → Apps → Production Credentials → Access Token
                    </p>
                  )}
                  {selectedProvider === "jobber" && (
                    <p className="text-muted-foreground">
                      Jobber → Settings → API → Generate new token
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleApiKeyConnect}
                  disabled={!apiKey || isConnecting}
                  className="w-full"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            )}

            {/* Manual */}
            {selectedProvider === "manual" && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Manual Busy Blocks</h2>
                <p className="text-muted-foreground">
                  You can add busy times manually in CloseLoop whenever you need to block off time
                </p>
                <Button onClick={handleManualSetup} disabled={createConnection.isPending}>
                  {createConnection.isPending ? "Setting up..." : "Continue with Manual"}
                </Button>
              </div>
            )}
          </div>
        );

      case 4:
        // Success step
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Schedule Connected!</h2>
              <p className="text-muted-foreground">
                Your AI will now avoid double-booking appointments
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 text-left space-y-2">
              <p className="font-medium flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                What happens now:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>Busy events sync to your CloseLoop schedule</li>
                <li>AI only offers slots that are actually free</li>
                <li>No more overlapping appointments</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleTestAvailability} variant="outline" className="flex-1">
                Test Availability
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <Button onClick={handleComplete} className="flex-1">
                Done
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // If already connected, show status
  if (hasConnectedCalendar && step === 1) {
    return (
      <div className={embedded ? "" : "max-w-lg mx-auto"}>
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Schedule Connected</h3>
              <p className="text-sm text-muted-foreground">
                Your calendar is syncing and the AI won't double-book
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleTestAvailability}>
                Test Availability
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Change Source
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (embedded) {
    return renderStep();
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}
