import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WebsiteExtractionResult } from "@/lib/mapWebsiteImportToOnboarding";

interface CreateDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: WebsiteExtractionResult) => void;
  isCreating: boolean;
}

type ScanState = "idle" | "loading" | "success" | "error";

export function CreateDemoDialog({
  open,
  onOpenChange,
  onConfirm,
  isCreating,
}: CreateDemoDialogProps) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<WebsiteExtractionResult | null>(null);

  const handleScan = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    setState("loading");
    setErrorMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("import-business-website", {
        body: { url: normalizedUrl },
      });

      if (error) {
        setState("error");
        setErrorMessage(error.message || "Failed to scan website.");
        return;
      }

      if (!data?.success || !data?.extracted) {
        setState("error");
        setErrorMessage(data?.error || "Could not extract business data.");
        return;
      }

      setResult(data.extracted as WebsiteExtractionResult);
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Unexpected error.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && state !== "loading") handleScan();
  };

  const handleConfirm = () => {
    if (result) onConfirm(result);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setUrl("");
      setState("idle");
      setResult(null);
      setErrorMessage("");
    }
    onOpenChange(val);
  };

  const serviceCount = result?.services?.length ?? 0;
  const faqCount = result?.faqs?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Demo Profile</DialogTitle>
          <DialogDescription>
            Paste a business website to auto-generate a demo profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4 text-primary" />
            Website URL
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={state === "loading"}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={handleScan}
              disabled={state === "loading" || !url.trim()}
              className="gap-2 min-w-[120px]"
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  Scan
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {state === "loading" && (
            <p className="text-sm text-muted-foreground">
              Scanning website... this usually takes 10-20 seconds.
            </p>
          )}

          {state === "error" && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {state === "success" && result && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">{result.business_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {serviceCount} service{serviceCount !== 1 ? "s" : ""}
                    {faqCount > 0 && `, ${faqCount} FAQ${faqCount !== 1 ? "s" : ""}`}
                    {result.hours && ", business hours"}
                  </p>
                  {result.suggested_business_mode && (
                    <p className="text-xs text-muted-foreground">
                      Mode: {result.suggested_business_mode} · Industry: {result.suggested_industry}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleConfirm}
                disabled={isCreating}
                className="w-full gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Demo Profile
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
