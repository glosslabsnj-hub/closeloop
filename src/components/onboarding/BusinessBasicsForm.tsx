import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BusinessHoursEditor, { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { AlertCircle } from "lucide-react";
import { useIndustryContext } from "@/hooks/useIndustryContext";

export interface BusinessBasicsData {
  businessName: string;
  tagline: string;
  phoneNumber: string;
  address: string;
  timezone: string;
  hoursJson: BusinessHours;
}

interface BusinessBasicsFormProps {
  data: BusinessBasicsData;
  onChange: (data: BusinessBasicsData) => void;
}

// Common US timezones (can be extended)
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Mountain Time - Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Puerto_Rico", label: "Atlantic Time - Puerto Rico" },
];

/**
 * Business Basics Form - Step D of Onboarding
 *
 * Collects essential business information:
 * - Business name (required)
 * - Tagline (optional)
 * - Phone number (required)
 * - Address (optional)
 * - Timezone (required)
 * - Business hours (required)
 *
 * UI only - no database writes. Validation logic included.
 */
export default function BusinessBasicsForm({ data, onChange }: BusinessBasicsFormProps) {
  const { terminology } = useIndustryContext();
  const apptLabelPlural = terminology.appointmentLabel === "appointment" ? "appointments" : `${terminology.appointmentLabel}s`;
  const updateField = <K extends keyof BusinessBasicsData>(
    field: K,
    value: BusinessBasicsData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  // Validation helpers (for parent to use)
  const hasBusinessName = data.businessName.trim().length > 0;
  const hasPhoneNumber = data.phoneNumber.trim().length > 0;
  const hasTimezone = data.timezone.length > 0;

  return (
    <div className="space-y-6">
      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName">
          Business Name <span className="text-rose-400">*</span>
        </Label>
        <Input
          id="businessName"
          placeholder="e.g. Smith's Plumbing Service"
          value={data.businessName}
          onChange={(e) => updateField("businessName", e.target.value)}
          className={!hasBusinessName && data.businessName.length > 0 ? "border-rose-400" : ""}
        />
        {!hasBusinessName && data.businessName.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-rose-400">
            <AlertCircle className="h-3 w-3" />
            <span>Business name is required</span>
          </div>
        )}
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <Label htmlFor="tagline">
          Tagline <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="tagline"
          placeholder="e.g. Your trusted local plumber since 1995"
          value={data.tagline}
          onChange={(e) => updateField("tagline", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          A short slogan or value proposition
        </p>
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">
          Phone Number <span className="text-rose-400">*</span>
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder="e.g. (555) 123-4567"
          value={data.phoneNumber}
          onChange={(e) => updateField("phoneNumber", e.target.value)}
          className={!hasPhoneNumber && data.phoneNumber.length > 0 ? "border-rose-400" : ""}
        />
        {!hasPhoneNumber && data.phoneNumber.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-rose-400">
            <AlertCircle className="h-3 w-3" />
            <span>Phone number is required</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          This will be your public business number
        </p>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">
          Business Address <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea
          id="address"
          placeholder="e.g. 123 Main St, Springfield, IL 62701"
          value={data.address}
          onChange={(e) => updateField("address", e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Your physical business location (if applicable)
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label htmlFor="timezone">
          Timezone <span className="text-rose-400">*</span>
        </Label>
        <Select
          value={data.timezone}
          onValueChange={(value) => updateField("timezone", value)}
        >
          <SelectTrigger
            id="timezone"
            className={!hasTimezone ? "border-rose-400" : ""}
          >
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!hasTimezone && (
          <div className="flex items-center gap-1 text-xs text-rose-400">
            <AlertCircle className="h-3 w-3" />
            <span>Timezone is required</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Used for scheduling and business hours
        </p>
      </div>

      {/* Business Hours */}
      <div className="space-y-2">
        <Label>
          Business Hours <span className="text-rose-400">*</span>
        </Label>
        <div className="rounded-lg border p-4">
          <BusinessHoursEditor
            hours={data.hoursJson}
            onChange={(hours) => updateField("hoursJson", hours)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {`When your business is available to take calls and ${apptLabelPlural}`}
        </p>
      </div>
    </div>
  );
}

/**
 * Validation function for parent components
 */
export function validateBusinessBasics(data: BusinessBasicsData): boolean {
  return (
    data.businessName.trim().length > 0 &&
    data.phoneNumber.trim().length > 0 &&
    data.timezone.length > 0
  );
}
