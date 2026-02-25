import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface A2PBusinessData {
  legalBusinessName: string;
  ein: string;
  entityType: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  websiteUrl: string;
}

export function getDefaultA2PData(): A2PBusinessData {
  return {
    legalBusinessName: "",
    ein: "",
    entityType: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    websiteUrl: "",
  };
}

const ENTITY_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "non_profit", label: "Non-Profit" },
] as const;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
] as const;

interface Props {
  value: A2PBusinessData;
  onChange: (data: A2PBusinessData) => void;
  businessName?: string;
  userEmail?: string;
  userDisplayName?: string;
}

export function A2PBusinessFields({ value, onChange, businessName, _userEmail, _userDisplayName }: Props) {
  const update = <K extends keyof A2PBusinessData>(key: K, val: A2PBusinessData[K]) => {
    onChange({ ...value, [key]: val });
  };

  // Pre-fill on first render if empty
  if (!value.legalBusinessName && businessName) {
    // Don't call onChange during render — handled by parent
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Business identity for SMS
        </h2>
        <p className="mt-2 text-muted-foreground">
          We need these details to activate text messaging on your business number. This information is used for carrier compliance and is never shared publicly.
        </p>
      </div>

      {/* Legal Business Name */}
      <div className="space-y-2">
        <Label htmlFor="legal-name">Legal Business Name</Label>
        <Input
          id="legal-name"
          placeholder={businessName || "e.g. Acme Services LLC"}
          value={value.legalBusinessName}
          onChange={(e) => update("legalBusinessName", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          As registered with your state — may differ from your display name
        </p>
      </div>

      {/* Entity Type + EIN side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Business Entity Type</Label>
          <Select value={value.entityType} onValueChange={(v) => update("entityType", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((et) => (
                <SelectItem key={et.value} value={et.value}>
                  {et.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ein">EIN / Tax ID</Label>
          <Input
            id="ein"
            placeholder="XX-XXXXXXX"
            value={value.ein}
            onChange={(e) => {
              // Auto-format EIN: XX-XXXXXXX
              let raw = e.target.value.replace(/\D/g, "").slice(0, 9);
              if (raw.length > 2) raw = raw.slice(0, 2) + "-" + raw.slice(2);
              update("ein", raw);
            }}
            maxLength={10}
          />
          <p className="text-xs text-muted-foreground">
            {value.entityType === "sole_proprietorship"
              ? "Optional for sole proprietors — skip if you don't have one"
              : "9-digit federal tax ID number"}
          </p>
        </div>
      </div>

      {/* Structured Address */}
      <div className="space-y-3">
        <Label>Business Address</Label>
        <Input
          placeholder="Street address"
          value={value.streetAddress}
          onChange={(e) => update("streetAddress", e.target.value)}
        />
        <div className="grid grid-cols-6 gap-2">
          <div className="col-span-3">
            <Input
              placeholder="City"
              value={value.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <Select value={value.state} onValueChange={(v) => update("state", v)}>
              <SelectTrigger>
                <SelectValue placeholder="ST" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((st) => (
                  <SelectItem key={st} value={st}>{st}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Input
              placeholder="ZIP Code"
              value={value.zipCode}
              onChange={(e) => update("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
              maxLength={5}
            />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-3">
        <Label>Contact Person</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="First name"
            value={value.contactFirstName}
            onChange={(e) => update("contactFirstName", e.target.value)}
          />
          <Input
            placeholder="Last name"
            value={value.contactLastName}
            onChange={(e) => update("contactLastName", e.target.value)}
          />
        </div>
        <Input
          placeholder="Contact email"
          type="email"
          value={value.contactEmail}
          onChange={(e) => update("contactEmail", e.target.value)}
        />
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website-url">Website URL</Label>
        <Input
          id="website-url"
          placeholder="https://www.yourbusiness.com"
          value={value.websiteUrl}
          onChange={(e) => update("websiteUrl", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Required by carriers to verify your business
        </p>
      </div>
    </div>
  );
}
