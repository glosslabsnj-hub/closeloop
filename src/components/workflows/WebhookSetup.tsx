import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Link2, Zap, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookSetupProps {
  currentUrl: string;
  onSave: (url: string) => void;
  isLoading?: boolean;
  samplePayload?: Record<string, unknown>;
}

export function WebhookSetup({
  currentUrl,
  onSave,
  isLoading = false,
  samplePayload,
}: WebhookSetupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState(currentUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleOpen = () => {
    setUrl(currentUrl);
    setTestResult(null);
    setIsOpen(true);
  };

  const handleSave = () => {
    onSave(url);
    setIsOpen(false);
    toast({ title: "Webhook URL saved" });
  };

  const handleTest = async () => {
    if (!url) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      // Simulate a test request (in production, this would call an edge function)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // For demo purposes, assume success if URL is valid format
      if (url.startsWith("http://") || url.startsWith("https://")) {
        setTestResult("success");
        toast({ title: "Test successful", description: "Webhook endpoint responded correctly" });
      } else {
        setTestResult("error");
        toast({ title: "Test failed", description: "Invalid URL format", variant: "destructive" });
      }
    } catch (error) {
      setTestResult("error");
      toast({ title: "Test failed", description: "Could not reach webhook endpoint", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyPayload = () => {
    const payload = samplePayload || {
      event: "call.ended",
      timestamp: new Date().toISOString(),
      customer_name: "John Doe",
      customer_phone: "+15551234567",
      summary: "Customer inquired about availability for next week",
      outcome: "booked",
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const isConfigured = !!currentUrl;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Settings2 className="h-3 w-3 mr-1" />
        {isConfigured ? "Configure" : "Set up webhook"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Webhook Integration</DialogTitle>
            <DialogDescription>
              Send data to your CRM, Zapier, or any external service
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="url" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">
                <Link2 className="h-4 w-4 mr-2" />
                Custom URL
              </TabsTrigger>
              <TabsTrigger value="zapier">
                <Zap className="h-4 w-4 mr-2" />
                Zapier
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  placeholder="https://your-service.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a POST request with JSON data to this URL
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={!url || isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : testResult === "success" ? (
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-1" />
                  )}
                  Test Webhook
                </Button>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Sample Payload</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPayload}
                    className="h-6 px-2 text-xs"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    Copy
                  </Button>
                </div>
                <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
                  {JSON.stringify(
                    samplePayload || {
                      event: "call.ended",
                      customer_name: "John Doe",
                      summary: "...",
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="zapier" className="space-y-4 mt-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Zap className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Connect with Zapier</h4>
                    <p className="text-sm text-muted-foreground">
                      Use Zapier to connect with 5,000+ apps
                    </p>
                  </div>
                </div>

                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Go to Zapier and create a new Zap</li>
                  <li>Choose "Webhooks by Zapier" as your trigger</li>
                  <li>Select "Catch Hook" as the event</li>
                  <li>Copy the webhook URL Zapier provides</li>
                  <li>Paste it in the "Custom URL" tab above</li>
                </ol>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open("https://zapier.com/apps/webhook", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Zapier
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
