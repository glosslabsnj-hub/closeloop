import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Loader2, RefreshCw, Link2, Clock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SharePortalLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function SharePortalLinkDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: SharePortalLinkDialogProps) {
  const { tenant } = useAuth();
  const [portalUrl, setPortalUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generateLink = async () => {
    if (!tenant?.id) return;

    setIsGenerating(true);
    setError("");
    setCopied(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-portal-token",
        { body: { customer_id: customerId } },
      );

      if (fnError) {
        setError("Failed to generate link. Please try again.");
        return;
      }

      if (data?.token) {
        // Build URL from frontend origin (more reliable than edge function URL)
        const url = `${window.location.origin}/portal/${tenant.id}?token=${encodeURIComponent(data.token)}`;
        setPortalUrl(url);
        setExpiresAt(data.expires_at);
      } else {
        setError("Unexpected response. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      toast.success("Portal link copied to clipboard");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy — try selecting and copying manually");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setPortalUrl("");
      setExpiresAt("");
      setError("");
      setCopied(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Portal Link
          </DialogTitle>
          <DialogDescription>
            Give {customerName} a secure link to view their bookings, estimates,
            and agreements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* What it does */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>Only this customer can see their own data</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <span>Link expires after 24 hours — generate a new one anytime</span>
            </div>
          </div>

          {!portalUrl && !error && (
            <Button onClick={generateLink} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Generate Portal Link
                </>
              )}
            </Button>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={generateLink} disabled={isGenerating}>
                Try Again
              </Button>
            </div>
          )}

          {portalUrl && (
            <div className="space-y-3">
              {/* Link display + copy */}
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={portalUrl}
                  className="text-xs font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant={copied ? "default" : "outline"}
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Expiry info */}
              {expiresAt && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Expires {new Date(expiresAt).toLocaleString()}
                  </Badge>
                </div>
              )}

              {/* Regenerate */}
              <Button
                variant="ghost"
                size="sm"
                onClick={generateLink}
                disabled={isGenerating}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Generate New Link
              </Button>

              {/* How to share */}
              <p className="text-xs text-muted-foreground">
                Send this link to {customerName} via text, email, or any messaging app. They'll
                see their bookings, estimates, and agreements — nothing else.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
