import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { createService } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  ClipboardPaste,
  Wand2,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
} from "lucide-react";

interface PasteFromPOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedService {
  name: string;
  description: string;
  duration_minutes: number;
  price_amount: number | null;
  price_type: "fixed" | "starting_at" | "quote_only";
  selected: boolean;
}

export function PasteFromPOSDialog({ open, onOpenChange }: PasteFromPOSDialogProps) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [pastedText, setPastedText] = useState("");
  const [parsedServices, setParsedServices] = useState<ParsedService[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!pastedText.trim() || !tenant?.id) return;

    setIsParsing(true);
    setParseError(null);
    setParsedServices([]);

    try {
      const { data, error } = await supabase.functions.invoke("parse-services-text", {
        body: { text: pastedText.trim(), tenantId: tenant.id },
      });

      if (error) throw error;

      if (!data?.services || data.services.length === 0) {
        setParseError("No services could be extracted from the text. Try a different format.");
        return;
      }

      setParsedServices(
        data.services.map((s: any) => ({
          name: s.name || "",
          description: s.description || "",
          duration_minutes: s.duration_minutes || 60,
          price_amount: s.price_amount ?? null,
          price_type: s.price_type || "fixed",
          selected: true,
        }))
      );
    } catch (err: any) {
      console.error("Parse error:", err);
      setParseError(err.message || "Failed to parse text. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const toggleService = (index: number) => {
    setParsedServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleImport = async () => {
    if (!tenant?.id) return;
    const selected = parsedServices.filter((s) => s.selected);
    if (selected.length === 0) return;

    setIsImporting(true);
    let success = 0;
    let failed = 0;

    for (const svc of selected) {
      try {
        await createService(tenant.id, {
          name: svc.name,
          description: svc.description || undefined,
          duration_minutes: svc.duration_minutes,
          price_type: svc.price_type,
          price_amount: svc.price_amount ?? undefined,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setIsImporting(false);
    setResult({ success, failed });
    queryClient.invalidateQueries({ queryKey: ["services"] });
    queryClient.invalidateQueries({ queryKey: ["business-context"] });
    toast.success(`${success} service${success !== 1 ? "s" : ""} imported!`);
  };

  const handleClose = () => {
    setPastedText("");
    setParsedServices([]);
    setResult(null);
    setParseError(null);
    onOpenChange(false);
  };

  const selectedCount = parsedServices.filter((s) => s.selected).length;

  const formatPrice = (svc: ParsedService) => {
    if (svc.price_type === "quote_only") return "Quote";
    if (svc.price_amount == null) return "—";
    const prefix = svc.price_type === "starting_at" ? "From " : "";
    return `${prefix}$${svc.price_amount}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Paste from POS (Square, Clover, etc.)
          </DialogTitle>
          <DialogDescription>
            Copy your service list from your POS system and paste it below. AI will parse it into individual services.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Paste */}
          {parsedServices.length === 0 && !result && (
            <>
              <Textarea
                placeholder={`Paste your service list here...\n\nExample:\nFull Detail - Starting at $250 (3-4 hours)\nInterior Detail - $150 (2 hours)\nExterior Wash & Wax - $75 (1 hour)\nPaint Correction - Quote required`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[200px] resize-none font-mono text-sm"
                disabled={isParsing}
              />

              {parseError && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}

              <Button
                onClick={handleParse}
                disabled={isParsing || !pastedText.trim()}
                className="w-full"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing with AI...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Parse Services
                  </>
                )}
              </Button>
            </>
          )}

          {/* Step 2: Preview */}
          {parsedServices.length > 0 && !result && (
            <>
              <p className="text-sm text-muted-foreground">
                Found {parsedServices.length} services. Deselect any you don't want to import.
              </p>
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium w-8"></th>
                      <th className="text-left p-2 font-medium">Service</th>
                      <th className="text-left p-2 font-medium">Price</th>
                      <th className="text-left p-2 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedServices.map((svc, i) => (
                      <tr
                        key={i}
                        className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${
                          !svc.selected ? "opacity-40" : ""
                        }`}
                        onClick={() => toggleService(i)}
                      >
                        <td className="p-2 text-center">
                          {svc.selected ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="p-2">
                          <div className="font-medium">{svc.name}</div>
                          {svc.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {svc.description}
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-xs">
                            {formatPrice(svc)}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {svc.duration_minutes}min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setParsedServices([]);
                  setParseError(null);
                }}
              >
                ← Back to paste
              </Button>
            </>
          )}

          {/* Step 3: Result */}
          {result && (
            <div className="bg-primary/10 text-primary p-4 rounded-md flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                {result.success} service{result.success !== 1 ? "s" : ""} imported
                {result.failed > 0 && `, ${result.failed} failed`}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? "Done" : "Cancel"}
          </Button>
          {parsedServices.length > 0 && !result && (
            <Button onClick={handleImport} disabled={isImporting || selectedCount === 0}>
              {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {selectedCount} Service{selectedCount !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
