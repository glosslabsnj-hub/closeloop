import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Send } from "lucide-react";

const SERVICE_OPTIONS = [
  "Marketing",
  "Web Design",
  "SEO",
  "IT Services",
  "Consulting",
  "Telecom",
];

const EXPECTED_CLIENT_OPTIONS = [
  { value: "1-5", label: "1-5 clients" },
  { value: "6-15", label: "6-15 clients" },
  { value: "16-50", label: "16-50 clients" },
  { value: "50+", label: "50+ clients" },
];

const REFERRAL_OPTIONS = [
  "Google",
  "Social Media",
  "Referral",
  "Conference",
  "Other",
];

function expectedClientsToNumber(value: string): number {
  const map: Record<string, number> = { "1-5": 5, "6-15": 15, "16-50": 50, "50+": 100 };
  return map[value] ?? 0;
}

export function AgencyApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const expectedClientsRaw = formData.get("expected_clients") as string;

    const payload = {
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string || undefined,
      company_name: formData.get("company_name") as string,
      company_website: formData.get("company_website") as string || undefined,
      expected_clients: expectedClientsToNumber(expectedClientsRaw),
      current_client_count: formData.get("current_client_count")
        ? Number(formData.get("current_client_count"))
        : undefined,
      services_offered: selectedServices,
      referral_source: formData.get("referral_source") as string || undefined,
      message: formData.get("message") as string || undefined,
    };

    try {
      const { error: fnError } = await supabase.functions.invoke(
        "submit-agency-application",
        { body: payload }
      );

      if (fnError) {
        // Try to parse the error body for a user-friendly message
        try {
          const parsed = JSON.parse(fnError.message);
          setError(parsed.error || "Failed to submit. Please try again.");
        } catch {
          setError(fnError.message || "Failed to submit. Please try again.");
        }
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="apply" className="py-20 md:py-28">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Received!</h2>
            <p className="text-muted-foreground">
              We'll review your application and get back to you within 24 hours.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="apply" className="py-20 md:py-28">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Apply to Become a Partner
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Fill out the form below and we'll get you set up within 24 hours.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl rounded-2xl border bg-card p-6 md:p-10 shadow-lg space-y-6"
        >
          {/* Name + Email */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" name="full_name" required placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required placeholder="jane@agency.com" />
            </div>
          </div>

          {/* Phone + Company */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input id="company_name" name="company_name" required placeholder="Acme Agency" />
            </div>
          </div>

          {/* Website + Expected Clients */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_website">Company Website</Label>
              <Input id="company_website" name="company_website" placeholder="https://acme.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_clients">Expected Clients (first 6 months) *</Label>
              <Select name="expected_clients" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {EXPECTED_CLIENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current clients */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_client_count">Current Clients You Manage</Label>
              <Input
                id="current_client_count"
                name="current_client_count"
                type="number"
                min={0}
                placeholder="e.g. 20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral_source">How Did You Hear About Us?</Label>
              <Select name="referral_source">
                <SelectTrigger>
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Services offered (multi-select chips) */}
          <div className="space-y-2">
            <Label>Services Your Agency Offers</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((svc) => (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleService(svc)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                    selectedServices.includes(svc)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  {svc}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              rows={3}
              placeholder="Tell us about your agency and what you're looking for..."
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Application
              </>
            )}
          </Button>
        </form>
      </div>
    </section>
  );
}
