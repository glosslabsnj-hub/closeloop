import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, Loader2, Star } from "lucide-react";
import { useServiceAgreements, ServiceAgreementWithCustomer } from "@/hooks/useServiceAgreements";
import { useCustomers } from "@/hooks/useCustomers";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Badge } from "@/components/ui/badge";

interface AgreementBuilderProps {
  agreement?: ServiceAgreementWithCustomer | null;
  onSave: () => void;
  onCancel: () => void;
}

const SERVICE_PLAN_TEMPLATES = [
  {
    name: "Basic Maintenance",
    type: "maintenance",
    price_cents: 9900,
    billing_frequency: "monthly",
    visits_per_year: 2,
    services: ["Annual inspection", "Filter replacement", "Basic tune-up"],
    discount_percent: 10,
    priority_service: false,
  },
  {
    name: "Priority Care",
    type: "priority",
    price_cents: 14900,
    billing_frequency: "monthly",
    visits_per_year: 4,
    services: ["Bi-annual inspection", "Filter replacement", "Full tune-up", "Priority scheduling", "15% parts discount"],
    discount_percent: 15,
    priority_service: true,
  },
  {
    name: "Premium Protection",
    type: "premium",
    price_cents: 24900,
    billing_frequency: "monthly",
    visits_per_year: 4,
    services: ["Quarterly inspection", "All filters included", "Full tune-up", "Same-day priority service", "20% parts discount", "No overtime charges"],
    discount_percent: 20,
    priority_service: true,
  },
];

const SALES_PLAN_TEMPLATES = [
  {
    name: "Standard Purchase",
    type: "standard",
    price_cents: 0,
    billing_frequency: "annually",
    visits_per_year: 1,
    services: ["Vehicle purchase", "Standard warranty", "Title transfer"],
    discount_percent: 0,
    priority_service: false,
  },
  {
    name: "Financing Plan",
    type: "financing",
    price_cents: 0,
    billing_frequency: "monthly",
    visits_per_year: 1,
    services: ["Vehicle purchase", "Financing arranged", "Extended warranty option", "GAP coverage option"],
    discount_percent: 0,
    priority_service: false,
  },
  {
    name: "Premium Deal",
    type: "premium",
    price_cents: 0,
    billing_frequency: "monthly",
    visits_per_year: 1,
    services: ["Vehicle purchase", "Financing arranged", "Extended warranty included", "GAP coverage included", "Free first service"],
    discount_percent: 5,
    priority_service: true,
  },
];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function AgreementBuilder({ agreement, onSave, onCancel }: AgreementBuilderProps) {
  const { createAgreement, updateAgreement } = useServiceAgreements();
  const { customers } = useCustomers();
  const { businessMode } = useTenantConfig();
  const isSales = businessMode === "sales";
  const isMedical = businessMode === "medical";
  const isEditing = !!agreement;

  const PLAN_TEMPLATES = isSales ? SALES_PLAN_TEMPLATES : SERVICE_PLAN_TEMPLATES;
  const defaultPlanType = isSales ? "standard" : "maintenance";
  const planNamePlaceholder = isSales
    ? "e.g., Standard Purchase Agreement"
    : isMedical
    ? "e.g., Annual Care Plan"
    : "e.g., Annual Maintenance Plan";
  const servicesLabel = isSales ? "Items / Features Included" : isMedical ? "Services & Benefits" : "Services Included";
  const visitsLabel = isSales ? "Appointments / Follow-ups" : "Visits Per Year";
  const discountLabel = isSales ? "Customer Discount %" : "Service Discount %";

  // Form state
  const [customerId, setCustomerId] = useState(agreement?.customer_id || "");
  const [planName, setPlanName] = useState(agreement?.plan_name || "");
  const [planType, setPlanType] = useState(agreement?.plan_type || defaultPlanType);
  const [priceCents, setPriceCents] = useState(agreement?.price_cents || 9900);
  const [billingFrequency, setBillingFrequency] = useState(agreement?.billing_frequency || "monthly");
  const [startDate, setStartDate] = useState(
    agreement?.start_date || new Date().toISOString().split("T")[0]
  );
  const [autoRenew, setAutoRenew] = useState(agreement?.auto_renew ?? true);
  const [servicesIncluded, setServicesIncluded] = useState<string[]>(
    agreement?.services_included || []
  );
  const [visitsPerYear, setVisitsPerYear] = useState(agreement?.visits_per_year || 2);
  const [discountPercent, setDiscountPercent] = useState(agreement?.discount_percent || 0);
  const [priorityService, setPriorityService] = useState(agreement?.priority_service || false);
  const [customerNotes, setCustomerNotes] = useState(agreement?.customer_notes || "");
  const [internalNotes, setInternalNotes] = useState(agreement?.internal_notes || "");
  const [terms, setTerms] = useState(agreement?.terms || "");
  const [newService, setNewService] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const applyTemplate = (template: typeof PLAN_TEMPLATES[0]) => {
    setPlanName(template.name);
    setPlanType(template.type);
    setPriceCents(template.price_cents);
    setBillingFrequency(template.billing_frequency);
    setVisitsPerYear(template.visits_per_year);
    setServicesIncluded(template.services);
    setDiscountPercent(template.discount_percent);
    setPriorityService(template.priority_service);
  };

  const addService = () => {
    if (newService.trim()) {
      setServicesIncluded([...servicesIncluded, newService.trim()]);
      setNewService("");
    }
  };

  const removeService = (index: number) => {
    setServicesIncluded(servicesIncluded.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!customerId || !planName) return;

    setIsSaving(true);
    try {
      if (isEditing && agreement) {
        await updateAgreement.mutateAsync({
          id: agreement.id,
          customer_id: customerId,
          plan_name: planName,
          plan_type: planType,
          price_cents: priceCents,
          billing_frequency: billingFrequency,
          start_date: startDate,
          auto_renew: autoRenew,
          services_included: servicesIncluded,
          visits_per_year: visitsPerYear,
          discount_percent: discountPercent,
          priority_service: priorityService,
          customer_notes: customerNotes || undefined,
          internal_notes: internalNotes || undefined,
          terms: terms || undefined,
        });
      } else {
        await createAgreement.mutateAsync({
          customer_id: customerId,
          plan_name: planName,
          plan_type: planType,
          price_cents: priceCents,
          billing_frequency: billingFrequency,
          start_date: startDate,
          auto_renew: autoRenew,
          services_included: servicesIncluded,
          visits_per_year: visitsPerYear,
          discount_percent: discountPercent,
          priority_service: priorityService,
          customer_notes: customerNotes || undefined,
          internal_notes: internalNotes || undefined,
          terms: terms || undefined,
        });
      }
      onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Templates */}
      {!isEditing && (
        <div className="space-y-2">
          <Label>Quick Start Templates</Label>
          <div className="grid grid-cols-3 gap-2">
            {PLAN_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => applyTemplate(template)}
                className="relative p-3 border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{template.name}</span>
                  {template.priority_service && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                {isSales ? (
                  <p className="text-sm text-muted-foreground mt-1">Custom pricing</p>
                ) : (
                  <p className="text-lg font-bold mt-1">
                    {formatCurrency(template.price_cents)}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {template.visits_per_year} {isSales ? "appointment(s)" : "visits/year"}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Customer Selection */}
      <div className="space-y-2">
        <Label htmlFor="customer">{isSales ? "Prospect / Buyer *" : "Customer *"}</Label>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger>
            <SelectValue placeholder={isSales ? "Select a prospect" : "Select a customer"} />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.full_name || customer.phone_e164 || "Unnamed Customer"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Plan Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="planName">Plan Name *</Label>
          <Input
            id="planName"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder={planNamePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="planType">Plan Type</Label>
          <Select value={planType} onValueChange={setPlanType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {isSales ? (
                <>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="financing">Financing</SelectItem>
                  <SelectItem value="lease">Lease</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={(priceCents / 100).toFixed(2)}
              onChange={(e) => setPriceCents(Math.round(parseFloat(e.target.value || "0") * 100))}
              className="pl-7"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequency">Billing Frequency</Label>
          <Select value={billingFrequency} onValueChange={setBillingFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      {/* Services & Benefits */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="visits">{visitsLabel}</Label>
          <Input
            id="visits"
            type="number"
            min="1"
            value={visitsPerYear}
            onChange={(e) => setVisitsPerYear(parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount">{discountLabel}</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            max="100"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch id="autoRenew" checked={autoRenew} onCheckedChange={setAutoRenew} />
          <Label htmlFor="autoRenew">Auto-renew</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="priority" checked={priorityService} onCheckedChange={setPriorityService} />
          <Label htmlFor="priority">Priority scheduling</Label>
        </div>
      </div>

      {/* Services / Items Included */}
      <div className="space-y-2">
        <Label>{servicesLabel}</Label>
        <div className="flex gap-2">
          <Input
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            placeholder={isSales ? "Add an item or feature..." : isMedical ? "Add a service or benefit..." : "Add a service..."}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
          />
          <Button type="button" variant="outline" onClick={addService}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {servicesIncluded.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {servicesIncluded.map((service, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {service}
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="customerNotes">Customer Notes (visible to customer)</Label>
        <Textarea
          id="customerNotes"
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          placeholder="Any notes for the customer..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="internalNotes">Internal Notes (staff only)</Label>
        <Textarea
          id="internalNotes"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Internal notes..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !customerId || !planName}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Update Agreement" : "Create Agreement"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
