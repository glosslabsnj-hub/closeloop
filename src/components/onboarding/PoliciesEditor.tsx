import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface BusinessPolicies {
  cancellationPolicy: string;
  depositPolicy: string;
  refundPolicy: string;
  paymentMethods: string[];
  aiNeverPromise: string[];
}

interface PoliciesEditorProps {
  data: BusinessPolicies;
  onChange: (data: BusinessPolicies) => void;
}

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'check', label: 'Check' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'applepay', label: 'Apple Pay' },
  { value: 'financing', label: 'Financing Available' },
];

export default function PoliciesEditor({ data, onChange }: PoliciesEditorProps) {
  const update = (field: keyof BusinessPolicies, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const togglePaymentMethod = (method: string) => {
    const current = data.paymentMethods || [];
    if (current.includes(method)) {
      update('paymentMethods', current.filter(m => m !== method));
    } else {
      update('paymentMethods', [...current, method]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cancellation Policy */}
      <div className="space-y-2">
        <Label>Cancellation Policy</Label>
        <Textarea
          value={data.cancellationPolicy}
          onChange={(e) => update('cancellationPolicy', e.target.value)}
          placeholder="e.g., Free cancellation up to 24 hours before appointment. Less than 24 hours notice may incur a $50 fee."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">The AI will explain this when asked</p>
      </div>
      
      {/* Deposit Policy */}
      <div className="space-y-2">
        <Label>Deposit Policy</Label>
        <Textarea
          value={data.depositPolicy}
          onChange={(e) => update('depositPolicy', e.target.value)}
          placeholder="e.g., We require a 25% deposit to secure your appointment. Deposit is applied to your final bill."
          rows={3}
        />
      </div>
      
      {/* Refund Policy */}
      <div className="space-y-2">
        <Label>Refund Policy</Label>
        <Textarea
          value={data.refundPolicy}
          onChange={(e) => update('refundPolicy', e.target.value)}
          placeholder="e.g., 100% satisfaction guaranteed. If you're not happy, we'll make it right or refund your money."
          rows={3}
        />
      </div>
      
      {/* Payment Methods */}
      <div className="space-y-3">
        <Label>Payment Methods Accepted</Label>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethodOptions.map((method) => (
            <label
              key={method.value}
              className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={(data.paymentMethods || []).includes(method.value)}
                onCheckedChange={() => togglePaymentMethod(method.value)}
              />
              <span className="text-sm">{method.label}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* AI Guardrails */}
      <div className="space-y-2">
        <Label>Things AI should NEVER promise</Label>
        <Textarea
          value={(data.aiNeverPromise || []).join('\n')}
          onChange={(e) => update('aiNeverPromise', e.target.value.split('\n').filter(Boolean))}
          placeholder="Enter each item on a new line, e.g.:
Same-day appointments
Price matching
Free services
Work outside our service area"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">One per line. AI will never agree to these.</p>
      </div>
    </div>
  );
}
