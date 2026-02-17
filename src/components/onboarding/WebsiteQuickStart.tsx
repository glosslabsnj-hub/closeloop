/**
 * WebsiteQuickStart — Pre-phase splash screen for website import during onboarding.
 * Users can paste their website URL to auto-fill onboarding data, or skip to start from scratch.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WebsiteExtractionResult } from "@/lib/mapWebsiteImportToOnboarding";

interface WebsiteQuickStartProps {
  onImportComplete: (result: WebsiteExtractionResult) => void;
  onSkip: () => void;
}

type QuickStartState = "idle" | "loading" | "success" | "error";

export function WebsiteQuickStart({ onImportComplete, onSkip }: WebsiteQuickStartProps) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<QuickStartState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<WebsiteExtractionResult | null>(null);

  const handleScan = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Prepend https:// if no protocol
    const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    setState("loading");
    setErrorMessage("");

    try {
      const { data, error } = await supabase.functions.invoke("import-business-website", {
        body: { url: normalizedUrl },
      });

      if (error) {
        setState("error");
        setErrorMessage(error.message || "Failed to scan website. Please try again.");
        return;
      }

      if (!data?.success || !data?.extracted) {
        setState("error");
        setErrorMessage(data?.error || "Could not extract business data from this website.");
        return;
      }

      const extracted = data.extracted as WebsiteExtractionResult;
      setResult(extracted);
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && state !== "loading") {
      handleScan();
    }
  };

  const serviceCount = result?.services?.length ?? 0;
  const faqCount = result?.faqs?.length ?? 0;
  const hasHours = !!result?.hours;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Let's get your AI set up
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Import from your website to auto-fill your services, hours, and FAQs — or start from scratch.
        </p>
      </div>

      {/* Import Card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4 text-primary" />
            Import from your website
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="yourbusiness.com"
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
              className="gap-2 min-w-[130px]"
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  Scan Website
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {state === "loading" && (
            <p className="text-sm text-muted-foreground">
              Scanning your website... this usually takes 10-20 seconds.
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
                    Found {serviceCount} service{serviceCount !== 1 ? "s" : ""}
                    {faqCount > 0 && `, ${faqCount} FAQ${faqCount !== 1 ? "s" : ""}`}
                    {hasHours && ", business hours"}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onImportComplete(result)}
                className="w-full gap-2"
              >
                Continue with this data
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            We'll extract public info from your website. You can review and edit everything in the next steps.
          </p>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="flex-1 border-t" />
      </div>

      {/* Skip */}
      <div className="text-center space-y-2">
        <Button variant="outline" onClick={onSkip} className="gap-2">
          Start from scratch
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-sm text-muted-foreground">
          Pick your industry and we'll load templates to get you started.
        </p>
      </div>
    </div>
  );
}
