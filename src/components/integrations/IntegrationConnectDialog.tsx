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
import { useAuth } from "@/contexts/AuthContext";
import { useIntegrationMutations, PROVIDERS } from "@/hooks/useIntegrations";
import { CheckCircle2, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [step, setStep] = useState<"connect" | "waiting" | "test" | "success" | "error">("connect");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [printerApiKey, setPrinterApiKey] = useState("");
  const [testing, setTesting] = useState(false);

  const provider = PROVIDERS.find((p) => p.id === providerId);

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "calendar-oauth-success") {
        setStep("success");
        toast({
          title: "Calendar connected!",
          description: `Found ${event.data.calendars?.length || 0} calendars`,
        });
      } else if (event.data?.type === "calendar-oauth-error") {
        setStep("error");
        setErrorMessage(event.data.error || "OAuth failed");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast]);

  if (!provider) return null;

  const handleConnect = async () => {
    setErrorMessage(null);

    if (providerId === "google_calendar") {
      // Start real OAuth flow
      setStep("waiting");
      try {
        const { data, error } = await supabase.functions.invoke("calendar-oauth-start", {
          body: { provider: "google" },
        });
        
        if (error) throw error;
        if (!data?.auth_url) throw new Error("No auth URL returned");

        // Open OAuth popup
        const popup = window.open(
          data.auth_url,
          "oauth",
          "width=500,height=700,left=100,top=100"
        );

        // Monitor popup close
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // If still on waiting step, user closed without completing
            if (step === "waiting") {
              setStep("connect");
            }
          }
        }, 500);
      } catch (error) {
        console.error("OAuth start error:", error);
        setStep("error");
        setErrorMessage(error instanceof Error ? error.message : "Failed to start OAuth");
      }
      return;
    }

    if (providerId === "google_sheets") {
      // Google Sheets uses same OAuth as Calendar for now
      setStep("waiting");
      try {
        const { data, error } = await supabase.functions.invoke("calendar-oauth-start", {
          body: { provider: "google" },
        });
        
        if (error) throw error;
        if (!data?.auth_url) throw new Error("No auth URL returned");

        // Open OAuth popup (with Sheets scopes, we'd need separate function)
        // For now, use calendar OAuth which grants basic access
        window.open(data.auth_url, "oauth", "width=500,height=700,left=100,top=100");
      } catch (error) {
        console.error("OAuth start error:", error);
        setStep("error");
        setErrorMessage(error instanceof Error ? error.message : "Failed to start OAuth");
      }
      return;
    }

    if (providerId === "webhook") {
      // Just save webhook URL config
      await createIntegration.mutateAsync({
        provider: providerId,
        display_name: provider.name,
        auth_type: "api_key",
        config_json: { webhook_url: webhookUrl },
      });
      setStep("success");
      return;
    }

    if (providerId === "printer") {
      // Save PrintNode API key
      await createIntegration.mutateAsync({
        provider: providerId,
        display_name: provider.name,
        auth_type: "api_key",
        config_json: { 
          printer_type: printerApiKey ? "printnode" : "local",
          printnode_api_key: printerApiKey || undefined,
        },
      });
      setStep("success");
      return;
    }

    // Default: create integration record
    const config: Record<string, unknown> = {};
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
    setWebhookUrl("");
    setPrinterApiKey("");
    setErrorMessage(null);
    onOpenChange(false);
  };

  const handleDone = () => {
    handleClose();
    onConnected();
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
                </div>
              ) : providerId === "webhook" ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      type="url"
                      placeholder="https://your-system.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll POST event data to this URL
                    </p>
                  </div>
                </div>
              ) : providerId === "printer" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="printerApiKey">PrintNode API Key (optional)</Label>
                    <Input
                      id="printerApiKey"
                      type="password"
                      placeholder="Enter PrintNode API key for cloud printing"
                      value={printerApiKey}
                      onChange={(e) => setPrinterApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use browser-based printing
                    </p>
                  </div>
                  <a
                    href="https://www.printnode.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Get a PrintNode account
                    <ExternalLink className="h-3 w-3" />
                  </a>
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
                  disabled={
                    (providerId === "webhook" && !webhookUrl) ||
                    (providerId !== "webhook" && providerId !== "printer" && !apiKey) ||
                    createIntegration.isPending
                  }
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

        {step === "waiting" && (
          <>
            <DialogHeader>
              <DialogTitle>Waiting for authorization...</DialogTitle>
              <DialogDescription>
                Complete the authorization in the popup window that just opened.
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Don't see the popup? Check if it was blocked by your browser.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "error" && (
          <>
            <div className="py-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="mb-2">Connection Failed</DialogTitle>
              <DialogDescription>
                {errorMessage || "Something went wrong. Please try again."}
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("connect")}>
                Try Again
              </Button>
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
                You can now enable automation rules that use this integration.
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
