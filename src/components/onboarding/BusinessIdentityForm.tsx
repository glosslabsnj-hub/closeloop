import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import IndustrySelector from "./IndustrySelector";
import { type IndustryCatalogEntry } from "@/data/industryCatalog";

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

export interface BusinessIdentity {
  businessName: string;
  tagline: string;
  industry: string; // Now using slug from industryCatalog
  customIndustry: string;
  phoneNumber: string;
  websiteUrl: string;
  address: string;
  yearsInBusiness: number | null;
  timezone: string;
  // New fields for business mode tracking
  businessMode?: string;
  enabledModules?: string[];
}

interface BusinessIdentityFormProps {
  data: BusinessIdentity;
  onChange: (data: BusinessIdentity) => void;
}

export default function BusinessIdentityForm({ data, onChange }: BusinessIdentityFormProps) {
  const update = (field: keyof BusinessIdentity, value: string | number | null | string[]) => {
    onChange({ ...data, [field]: value });
  };

  const handleIndustryChange = (slug: string, industry: IndustryCatalogEntry) => {
    // When industry changes, also update business mode and enabled modules
    onChange({
      ...data,
      industry: slug,
      customIndustry: slug === "other" ? data.customIndustry : "",
      businessMode: industry.businessMode,
      enabledModules: industry.enabledModules,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name *</Label>
        <Input
          id="businessName"
          placeholder="e.g., Mike's Auto Care"
          value={data.businessName}
          onChange={(e) => update('businessName', e.target.value)}
          autoFocus
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline / Slogan</Label>
        <Input
          id="tagline"
          placeholder="e.g., Quality service you can trust"
          value={data.tagline}
          onChange={(e) => update('tagline', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">What makes your business different?</p>
      </div>
      
      {/* Industry Selector - Full Width */}
      <IndustrySelector
        value={data.industry}
        onChange={handleIndustryChange}
      />
      
      {data.industry === "other" && (
        <div className="space-y-2">
          <Label htmlFor="customIndustry">What's your industry? *</Label>
          <Input
            id="customIndustry"
            placeholder="e.g., Window Tinting, Boat Detailing"
            value={data.customIndustry}
            onChange={(e) => update('customIndustry', e.target.value)}
          />
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Business phone *</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="(555) 123-4567"
            value={data.phoneNumber}
            onChange={(e) => update('phoneNumber', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Years in Business</Label>
          <Input
            type="number"
            min={0}
            placeholder="e.g., 10"
            value={data.yearsInBusiness ?? ''}
            onChange={(e) => update('yearsInBusiness', e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Website</Label>
        <Input
          id="websiteUrl"
          type="url"
          placeholder="https://yourwebsite.com"
          value={data.websiteUrl}
          onChange={(e) => update('websiteUrl', e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Business address / Service area</Label>
        <Textarea
          id="address"
          placeholder="123 Main St, City, State or 'We serve the greater Austin area'"
          value={data.address}
          onChange={(e) => update('address', e.target.value)}
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Timezone</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={data.timezone}
          onChange={(e) => update('timezone', e.target.value)}
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
