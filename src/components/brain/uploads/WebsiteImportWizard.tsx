import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Loader2, Check, X, AlertCircle, Sparkles } from "lucide-react";
import { createService, createFAQ } from "@/lib/brain/writeBrainFact";
import { invalidateBrainQueries } from "@/lib/brain/invalidateBrainQueries";
import { toast } from "sonner";

interface ExtractedData {
  business_name: string | null;
  phone: string | null;
  address: string | null;
  hours: Record<string, { open: string; close: string; is_open: boolean }> | null;
  services: Array<{
    name: string;
    description: string;
    price_amount: number | null;
    duration_minutes: number | null;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  description: string | null;
}

type WizardStep = "input" | "loading" | "preview" | "applying" | "done";

interface WebsiteImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebsiteImportWizard({ open, onOpenChange }: WebsiteImportWizardProps) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState("");
  const [step, setStep] = useState<WizardStep>("input");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [selectedFaqs, setSelectedFaqs] = useState<Set<number>>(new Set());
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });

  const resetWizard = () => {
    setUrl("");
    setStep("input");
    setExtractedData(null);
    setError(null);
    setSelectedServices(new Set());
    setSelectedFaqs(new Set());
    setApplyProgress({ current: 0, total: 0 });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(resetWizard, 300);
  };

  const handleFetch = async () => {
    if (!tenant?.id || !url.trim()) return;

    const trimmedUrl = url.trim();
    // Basic URL validation
    if (!/^https?:\/\/.+\..+/.test(trimmedUrl) && !/^[a-zA-Z0-9].*\..+/.test(trimmedUrl)) {
      setError("Please enter a valid website URL");
      return;
    }

    const fullUrl = trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`;

    setStep("loading");
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke("import-business-website", {
        body: { url: fullUrl, tenant_id: tenant.id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to import website");
      }

      const data = response.data as ExtractedData;
      setExtractedData(data);

      // Pre-select all items
      if (data.services) {
        setSelectedServices(new Set(data.services.map((_, i) => i)));
      }
      if (data.faqs) {
        setSelectedFaqs(new Set(data.faqs.map((_, i) => i)));
      }

      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Failed to extract data from website");
      setStep("input");
    }
  };

  const handleApply = async () => {
    if (!tenant?.id || !extractedData) return;

    setStep("applying");
    const servicesToCreate = extractedData.services.filter((_, i) => selectedServices.has(i));
    const faqsToCreate = extractedData.faqs.filter((_, i) => selectedFaqs.has(i));
    const total = servicesToCreate.length + faqsToCreate.length;
    setApplyProgress({ current: 0, total });

    let created = 0;
    let errors = 0;

    // Create services
    for (const svc of servicesToCreate) {
      try {
        await createService(tenant.id, {
          name: svc.name,
          description: svc.description || undefined,
          price_amount: svc.price_amount ?? undefined,
          price_type: svc.price_amount ? "fixed" : "quote_only",
          duration_minutes: svc.duration_minutes ?? 60,
        });
        created++;
      } catch {
        errors++;
      }
      setApplyProgress({ current: created + errors, total });
    }

    // Create FAQs
    for (const faq of faqsToCreate) {
      try {
        await createFAQ(tenant.id, {
          question: faq.question,
          answer: faq.answer,
        });
        created++;
      } catch {
        errors++;
      }
      setApplyProgress({ current: created + errors, total });
    }

    // Update tenant fields if extracted
    if (extractedData.business_name || extractedData.address || extractedData.hours) {
      try {
        const updates: Record<string, unknown> = {};
        if (extractedData.hours) updates.hours_json = extractedData.hours;
        if (extractedData.address) updates.address = extractedData.address;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("tenants")
            .update(updates)
            .eq("id", tenant.id);
        }
      } catch {
        // Non-critical
      }
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["services"] });
    queryClient.invalidateQueries({ queryKey: ["business-faqs"] });
    invalidateBrainQueries(queryClient, tenant.id);

    if (errors > 0) {
      toast.success(`Imported ${created} items (${errors} skipped)`);
    } else {
      toast.success(`Successfully imported ${created} items from website`);
    }

    setStep("done");
  };

  const toggleService = (index: number) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleFaq = (index: number) => {
    setSelectedFaqs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Import from Website
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Enter your business website URL and we'll extract your services, FAQs, and more."}
            {step === "loading" && "Scanning your website..."}
            {step === "preview" && "Review what we found. Uncheck anything you don't want to import."}
            {step === "applying" && "Importing your data..."}
            {step === "done" && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        {/* Step: URL Input */}
        {step === "input" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.yourbusiness.com"
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleFetch} disabled={!url.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Scan Website
              </Button>
            </div>
          </div>
        )}

        {/* Step: Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extracting business data from your website...</p>
            <p className="text-xs text-muted-foreground">This usually takes 10-20 seconds</p>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && extractedData && (
          <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
            <div className="space-y-4 pr-4">
              {/* Business Info */}
              {(extractedData.business_name || extractedData.address) && (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-sm font-medium">Business Info</p>
                  {extractedData.business_name && (
                    <p className="text-sm text-muted-foreground">Name: {extractedData.business_name}</p>
                  )}
                  {extractedData.address && (
                    <p className="text-sm text-muted-foreground">Address: {extractedData.address}</p>
                  )}
                  {extractedData.phone && (
                    <p className="text-sm text-muted-foreground">Phone: {extractedData.phone}</p>
                  )}
                </div>
              )}

              {/* Services */}
              {extractedData.services.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Services ({selectedServices.size}/{extractedData.services.length})</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => {
                        if (selectedServices.size === extractedData.services.length) {
                          setSelectedServices(new Set());
                        } else {
                          setSelectedServices(new Set(extractedData.services.map((_, i) => i)));
                        }
                      }}
                    >
                      {selectedServices.size === extractedData.services.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  {extractedData.services.map((svc, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedServices.has(i)}
                        onCheckedChange={() => toggleService(i)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{svc.name}</span>
                          {svc.price_amount && (
                            <Badge variant="secondary" className="text-xs">${svc.price_amount}</Badge>
                          )}
                          {svc.duration_minutes && (
                            <Badge variant="outline" className="text-xs">{svc.duration_minutes}min</Badge>
                          )}
                        </div>
                        {svc.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{svc.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* FAQs */}
              {extractedData.faqs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">FAQs ({selectedFaqs.size}/{extractedData.faqs.length})</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => {
                        if (selectedFaqs.size === extractedData.faqs.length) {
                          setSelectedFaqs(new Set());
                        } else {
                          setSelectedFaqs(new Set(extractedData.faqs.map((_, i) => i)));
                        }
                      }}
                    >
                      {selectedFaqs.size === extractedData.faqs.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  {extractedData.faqs.map((faq, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedFaqs.has(i)}
                        onCheckedChange={() => toggleFaq(i)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{faq.question}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{faq.answer}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedData.services.length === 0 && extractedData.faqs.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No services or FAQs found on this website.</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different URL or add your data manually.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Preview Actions */}
        {step === "preview" && extractedData && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setStep("input"); setError(null); }}>
              <X className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={handleApply}
              disabled={selectedServices.size + selectedFaqs.size === 0}
            >
              <Check className="h-4 w-4 mr-1" />
              Import {selectedServices.size + selectedFaqs.size} Items
            </Button>
          </div>
        )}

        {/* Step: Applying */}
        {step === "applying" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Importing... {applyProgress.current}/{applyProgress.total}
            </p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium">Import complete!</p>
            <p className="text-xs text-muted-foreground">Your Business Brain has been updated with the imported data.</p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
