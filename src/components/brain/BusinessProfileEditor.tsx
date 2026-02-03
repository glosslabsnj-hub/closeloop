import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, MapPin, Building2, AlertTriangle } from "lucide-react";
import { updateBusinessProfile } from "@/lib/brain/writeBrainFact";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ServiceAreaPreview } from "@/components/debug/ServiceAreaPreview";
import { Link } from "react-router-dom";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

// Parse existing address into components (best effort)
function parseAddressComponents(address: string): {
  line1: string;
  city: string;
  state: string;
  zip: string;
} {
  if (!address) {
    return { line1: "", city: "", state: "", zip: "" };
  }

  // Try to parse "123 Main St, City, ST 12345" format
  const parts = address.split(",").map((p) => p.trim());

  if (parts.length >= 3) {
    // Assume: street, city, state+zip
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

    return {
      line1: parts[0],
      city: parts[1],
      state: parts.slice(2).join(", "),
      zip: "",
    };
  }

  if (parts.length === 2) {
    return { line1: parts[0], city: parts[1], state: "", zip: "" };
  }

  return { line1: address, city: "", state: "", zip: "" };
}

// Combine address components back into a single string
function combineAddress(components: {
  line1: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const { line1, city, state, zip } = components;
  const parts: string[] = [];

  if (line1) parts.push(line1);
  if (city) parts.push(city);

  if (state && zip) {
    parts.push(`${state} ${zip}`);
  } else if (state) {
    parts.push(state);
  } else if (zip) {
    parts.push(zip);
  }

  return parts.join(", ");
}

export function BusinessProfileEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    phone_public: "",
    timezone: "",
    website_url: "",
    years_in_business: "",
    // Address components
    address_line1: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    address_country: "US",
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
        website_url: (tenant as any).website_url || "",
        years_in_business: (tenant as any).years_in_business?.toString() || "",
        address_line1: addressComponents.line1,
        address_city: addressComponents.city,
        address_state: addressComponents.state,
        address_zip: addressComponents.zip,
        address_country: "US", // Default to US
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
      // Combine address components into single address string
      const combinedAddress = combineAddress({
        line1: formData.address_line1.trim(),
        city: formData.address_city.trim(),
        state: formData.address_state.trim().toUpperCase(),
        zip: formData.address_zip.trim(),
      });

      // Update profile with core fields
      await updateBusinessProfile(tenant.id, {
        name: formData.name.trim(),
        tagline: formData.tagline.trim() || undefined,
        phone_public: formData.phone_public.trim() || undefined,
        address: combinedAddress || undefined,
        timezone: formData.timezone,
      });

      // Update additional fields directly
      const { error } = await supabase
        .from("tenants")
        .update({
          website_url: formData.website_url.trim() || null,
          years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : null,
        } as any)
        .eq("id", tenant.id);

      if (error) throw error;

      toast.success("Business profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update business profile";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Get combined address preview
  const addressPreview = combineAddress({
    line1: formData.address_line1,
    city: formData.address_city,
    state: formData.address_state,
    zip: formData.address_zip,
  });

  const hasAddress = addressPreview.trim().length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading profile...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Profile
          </CardTitle>
          <CardDescription>
            Your business identity and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Plumbing"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Fast, reliable service"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Public Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone_public}
                onChange={(e) => setFormData({ ...formData, phone_public: e.target.value })}
                placeholder="+1 (555) 123-4567"
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

          {/* Additional Business Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://www.yourbusiness.com"
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
              <p className="text-xs text-muted-foreground">
                The AI uses this to build caller trust
              </p>
            </div>
          </div>

          <Separator />

          {/* Address Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-medium">Business Address</Label>
              </div>
              {!hasAddress && (
                <Badge variant="outline" className="text-destructive border-destructive/50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Street Address</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="address_city">City</Label>
                  <Input
                    id="address_city"
                    value={formData.address_city}
                    onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                    placeholder="Springfield"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_state">State</Label>
                  <Input
                    id="address_state"
                    value={formData.address_state}
                    onChange={(e) => setFormData({ ...formData, address_state: e.target.value.toUpperCase() })}
                    placeholder="IL"
                    maxLength={2}
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_zip">ZIP Code</Label>
                  <Input
                    id="address_zip"
                    value={formData.address_zip}
                    onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                    placeholder="62701"
                  />
                </div>
              </div>
            </div>

            {/* Address Preview */}
            {hasAddress && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Address Preview:</p>
                <p className="text-sm font-medium">{addressPreview}</p>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Service Area Preview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service Area Preview
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/business-brain" onClick={() => {
                // Navigate to service-area section
                window.location.href = "/app/business-brain#service-area";
              }}>
                Configure
              </Link>
            </Button>
          </CardTitle>
          <CardDescription>
            What the AI tells callers about your service area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceAreaPreview />
        </CardContent>
      </Card>
    </div>
  );
}
