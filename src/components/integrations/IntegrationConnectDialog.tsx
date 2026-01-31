import { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useIntegrationMutations, PROVIDERS } from "@/hooks/useIntegrations";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";

interface IntegrationConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  onConnected: () => void;
}

export function IntegrationConnectDialog({
  open,
  onOpenChange,
  providerId,
  onConnected,
}: IntegrationConnectDialogProps) {
  const { tenant } = useAuth();
  const { createIntegration, testIntegration } = useIntegrationMutations(tenant?.id ?? null);
  const [step, setStep] = useState<"connect" | "test" | "success">("connect");
  const [apiKey, setApiKey] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [testing, setTesting] = useState(false);

  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return null;

  const handleConnect = async () => {
    const config: Record<string, unknown> = {};
    
    if (providerId === "google_sheets" && sheetId) {
      config.sheet_id = sheetId;
    }
    if (providerId === "google_calendar" && calendarId) {
      config.calendar_id = calendarId;
    }

    await createIntegration.mutateAsync({
      provider: providerId,
      display_name: provider.name,
      auth_type: provider.authType,
      config_json: config,
    });
    
    setStep("test");
  };

  const handleTest = async () => {
    setTesting(true);
    // Simulate test - in real implementation, this would call the integration
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setTesting(false);
    setStep("success");
  };

  const handleClose = () => {
    setStep("connect");
    setApiKey("");
    setSheetId("");
    setCalendarId("");
    onOpenChange(false);
  };

  const handleDone = () => {
    handleClose();
    onConnected();
  };

  const getOAuthUrl = (provider: string): string | null => {
    // These would be real OAuth URLs in production
    switch (provider) {
      case "google_calendar":
      case "google_sheets":
        return "https://accounts.google.com/o/oauth2/auth"; // placeholder
      default:
        return null;
    }
  };

  const isOAuth = ["google_calendar", "google_sheets"].includes(providerId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        {step === "connect" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-2xl">
                  {provider.icon}
                </div>
                <div>
                  <DialogTitle>Connect {provider.name}</DialogTitle>
                  <DialogDescription>{provider.description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {isOAuth ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Click below to connect your Google account securely.
                  </p>
                  <Button onClick={handleConnect} disabled={createIntegration.isPending}>
                    {createIntegration.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Connect with Google
                  </Button>
                  
                  {providerId === "google_sheets" && (
                    <div className="mt-4 text-left">
                      <Label htmlFor="sheetId">Sheet ID (optional)</Label>
                      <Input
                        id="sheetId"
                        placeholder="From your sheet URL"
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank to create a new sheet
                      </p>
                    </div>
                  )}
                  
                  {providerId === "google_calendar" && (
                    <div className="mt-4 text-left">
                      <Label htmlFor="calendarId">Calendar ID (optional)</Label>
                      <Input
                        id="calendarId"
                        placeholder="primary"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank to use your primary calendar
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <a
                    href="https://docs.closeloop.com/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Where do I find my API key?
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {!isOAuth && (
                <Button
                  onClick={handleConnect}
                  disabled={!apiKey || createIntegration.isPending}
                >
                  {createIntegration.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Connect
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {step === "test" && (
          <>
            <DialogHeader>
              <DialogTitle>Test Connection</DialogTitle>
              <DialogDescription>
                Let's make sure everything is working correctly.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <Button onClick={handleTest} disabled={testing} size="lg">
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Run Test"
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("success")}>
                Skip test
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <div className="py-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <DialogTitle className="mb-2">{provider.name} Connected!</DialogTitle>
              <DialogDescription>
                You can now enable routing rules that use this integration.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button onClick={handleDone} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
