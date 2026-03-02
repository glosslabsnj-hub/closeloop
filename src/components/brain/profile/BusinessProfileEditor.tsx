import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";
import { updateBusinessProfile } from "@/lib/brain/writeBrainFact";
import { invalidateBrainQueries } from "@/lib/brain/invalidateBrainQueries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PreviewSentence } from "../layout/BusinessBrainSectionCard";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { getProfileExamples } from "@/lib/industryExamples";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

function parseAddressComponents(address: string): {
  line1: string;
  city: string;
  state: string;
  zip: string;
} {
  if (!address) return { line1: "", city: "", state: "", zip: "" };
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 3) {
    const stateZipPart = parts[parts.length - 1];
    const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
    if (stateZipMatch) {
      return {
        line1: parts.slice(0, -2).join(", "),
        city: parts[parts.length - 2],
        state: stateZipMatch[1].toUpperCase(),
        zip: stateZipMatch[2],
      };
    }
    return { line1: parts[0], city: parts[1], state: parts.slice(2).join(", "), zip: "" };
  }
  if (parts.length === 2) return { line1: parts[0], city: parts[1], state: "", zip: "" };
  return { line1: address, city: "", state: "", zip: "" };
}

function combineAddress(components: { line1: string; city: string; state: string; zip: string }): string {
  const { line1, city, state, zip } = components;
  const parts: string[] = [];
  if (line1) parts.push(line1);
  if (city) parts.push(city);
  if (state && zip) parts.push(`${state} ${zip}`);
  else if (state) parts.push(state);
  else if (zip) parts.push(zip);
  return parts.join(", ");
}

export function BusinessProfileEditor() {
  const { tenant, refreshTenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();
  
  const examples = getProfileExamples(businessMode);

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    phone_public: "",
    timezone: "",
    website_url: "",
    years_in_business: "",
    address_line1: "",
    address_city: "",
    address_state: "",
    address_zip: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      const addressComponents = parseAddressComponents(tenant.address || "");
      setFormData({
        name: tenant.name || "",
        tagline: tenant.tagline || "",
        phone_public: tenant.phone_public || "",
        timezone: tenant.timezone || "America/New_York",
        website_url: tenant.website_url || "",
        years_in_business: tenant.years_in_business?.toString() || "",
        address_line1: addressComponents.line1,
        address_city: addressComponents.city,
        address_state: addressComponents.state,
        address_zip: addressComponents.zip,
      });
      setIsLoading(false);
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!tenant?.id || !formData.name.trim()) {
      toast.error("Business name is required");
      return;
    }

    setIsSaving(true);
    try {
      const combinedAddress = combineAddress({
        line1: formData.address_line1.trim(),
        city: formData.address_city.trim(),
        state: formData.address_state.trim().toUpperCase(),
        zip: formData.address_zip.trim(),
      });

      await updateBusinessProfile(tenant.id, {
        name: formData.name.trim(),
        tagline: formData.tagline.trim() || undefined,
        phone_public: formData.phone_public.trim() || undefined,
        address: combinedAddress || undefined,
        timezone: formData.timezone,
      });

      const { error } = await supabase
        .from("tenants")
        .update({
          website_url: formData.website_url.trim() || null,
          years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : null,
        } as any)
        .eq("id", tenant.id);

      if (error) throw error;

      toast.success("Profile saved");
      invalidateBrainQueries(queryClient, tenant?.id);

      // Refresh the tenant in AuthContext so profile changes persist across navigation
      if (refreshTenant) {
        await refreshTenant();
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Build greeting preview
  const greetingPreview = (() => {
    const parts = [`Thanks for calling ${formData.name || "us"}!`];
    if (formData.years_in_business) {
      parts.push(`We've been serving ${formData.address_city ? `the ${formData.address_city} area` : "the area"} for ${formData.years_in_business} years.`);
    }
    parts.push("How can I help?");
    return parts.join(" ");
  })();

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      <PreviewSentence sentence={greetingPreview} />

      {/* Core Info */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={examples.businessNamePlaceholder}
            />
            <p className="text-xs text-muted-foreground">AI introduces your business by this name on every call</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Your One-Liner</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder={examples.taglinePlaceholder}
            />
            <p className="text-xs text-muted-foreground">{examples.taglineHint}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone_public}
              onChange={(e) => setFormData({ ...formData, phone_public: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="years">Years in Business</Label>
            <Input
              id="years"
              type="number"
              min="0"
              value={formData.years_in_business}
              onChange={(e) => setFormData({ ...formData, years_in_business: e.target.value })}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">AI mentions this to build trust with callers</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Address */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Business Address</Label>
        
        <div className="space-y-2">
          <Input
            value={formData.address_line1}
            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
            placeholder="Street address"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Input
              value={formData.address_city}
              onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
              placeholder="City"
            />
          </div>
          <div className="space-y-2">
            <Input
              value={formData.address_state}
              onChange={(e) => setFormData({ ...formData, address_state: e.target.value.toUpperCase() })}
              placeholder="State"
              maxLength={2}
            />
          </div>
          <div className="space-y-2">
            <Input
              value={formData.address_zip}
              onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
              placeholder="ZIP"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
