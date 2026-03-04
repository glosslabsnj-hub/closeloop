import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessHours } from "./BusinessHoursEditor";
import BusinessHoursEditor from "./BusinessHoursEditor";
import { useIndustryContext } from "@/hooks/useIndustryContext";

export interface BookingPolicies {
  businessHours: BusinessHours;
  minLeadHours: number;
  maxAdvanceDays: number;
  appointmentBufferMinutes: number;
}

interface BookingPoliciesEditorProps {
  data: BookingPolicies;
  onChange: (data: BookingPolicies) => void;
}

const leadTimeOptions = [
  { value: 0, label: 'No minimum' },
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 4, label: '4 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours (1 day)' },
  { value: 48, label: '48 hours (2 days)' },
  { value: 72, label: '72 hours (3 days)' },
];

const maxAdvanceOptions = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
];

const bufferOptions = [
  { value: 0, label: 'No buffer' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
];

export default function BookingPoliciesEditor({ data, onChange }: BookingPoliciesEditorProps) {
  const { terminology } = useIndustryContext();
  const apptLabel = terminology.appointmentLabel;
  const apptLabelPlural = apptLabel === "appointment" ? "appointments" : `${apptLabel}s`;
  const update = (field: keyof BookingPolicies, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Business Hours */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Business Hours</Label>
        <BusinessHoursEditor
          hours={data.businessHours}
          onChange={(hours) => update('businessHours', hours)}
        />
      </div>
      
      {/* Booking Rules */}
      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
        <h4 className="font-medium text-sm">Booking Rules</h4>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Minimum notice required</Label>
            <Select
              value={data.minLeadHours.toString()}
              onValueChange={(value) => update('minLeadHours', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadTimeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How much advance notice do you need?</p>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Max booking window</Label>
            <Select
              value={data.maxAdvanceDays.toString()}
              onValueChange={(value) => update('maxAdvanceDays', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maxAdvanceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How far in advance can customers book?</p>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Buffer between {apptLabelPlural}</Label>
            <Select
              value={data.appointmentBufferMinutes.toString()}
              onValueChange={(value) => update('appointmentBufferMinutes', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bufferOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Time between back-to-back {apptLabelPlural}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
