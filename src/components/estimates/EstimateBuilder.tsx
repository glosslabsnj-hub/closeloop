import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, Send, CreditCard, Loader2, Layers } from "lucide-react";
import { useEstimates, EstimateLineItem, PricingOption, EstimateWithCustomer } from "@/hooks/useEstimates";
import { useCustomers } from "@/hooks/useCustomers";
import { useFinancing, formatFinancingAmount } from "@/hooks/useFinancing";
import { Badge } from "@/components/ui/badge";

interface EstimateBuilderProps {
  estimate?: EstimateWithCustomer | null;
  onSave: () => void;
  onCancel: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const DEFAULT_PRICING_OPTIONS: PricingOption[] = [
  { id: generateId(), name: "Basic", description: "Essential services", line_items: [], total_cents: 0 },
  { id: generateId(), name: "Standard", description: "Recommended option", line_items: [], total_cents: 0 },
  { id: generateId(), name: "Premium", description: "Full service package", line_items: [], total_cents: 0 },
];

function LineItemsEditor({
  lineItems,
  onChange,
}: {
  lineItems: EstimateLineItem[];
  onChange: (items: EstimateLineItem[]) => void;
}) {
  const updateLineItem = (id: string, field: keyof EstimateLineItem, value: string | number) => {
    onChange(
      lineItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unit_price_cents") {
          updated.total_cents = updated.quantity * updated.unit_price_cents;
        }
        return updated;
      })
    );
  };

  const addLineItem = () => {
    onChange([
      ...lineItems,
      { id: generateId(), name: "", description: "", quantity: 1, unit_price_cents: 0, total_cents: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      onChange(lineItems.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Line Items</Label>
        <Button variant="outline" size="sm" onClick={addLineItem}>
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-sm font-medium border-b">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y">
            {lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <div className="col-span-5">
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateLineItem(item.id, "name", e.target.value)}
                    className="mb-1"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={item.description || ""}
                    onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={(item.unit_price_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateLineItem(item.id, "unit_price_cents", Math.round(parseFloat(e.target.value || "0") * 100))
                    }
                    className="text-right"
                  />
                </div>
                <div className="col-span-2 text-right font-medium">{formatCurrency(item.total_cents)}</div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EstimateBuilder({ estimate, onSave, onCancel }: EstimateBuilderProps) {
  const { createEstimate, updateEstimate, sendEstimate } = useEstimates();
  const { customers = [] } = useCustomers();
  const { slug } = useIndustryContext();

  const estimatePlaceholder = useMemo(() => {
    const examples: Record<string, string> = {
      plumbing: "Whole-House Repipe",
      hvac: "HVAC System Replacement",
      electrical: "Panel Upgrade",
      roofing: "Roof Replacement",
      painting: "Exterior Painting",
      landscaping: "Backyard Renovation",
      auto_repair: "Transmission Rebuild",
    };
    return `e.g., ${examples[slug || ""] || "Service Estimate"}`;
  }, [slug]);
  const { isConnected: financingAvailable, createApplication } = useFinancing();

  // Form state
  const [title, setTitle] = useState(estimate?.title || "");
  const [customerId, setCustomerId] = useState(estimate?.customer_id || "");
  const [usePricingOptions, setUsePricingOptions] = useState(!!estimate?.pricing_options?.length);
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>(
    estimate?.line_items || [
      { id: generateId(), name: "", description: "", quantity: 1, unit_price_cents: 0, total_cents: 0 },
    ]
  );
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>(
    estimate?.pricing_options || DEFAULT_PRICING_OPTIONS.map(opt => ({
      ...opt,
      id: generateId(),
      line_items: [{ id: generateId(), name: "", description: "", quantity: 1, unit_price_cents: 0, total_cents: 0 }],
    }))
  );
  const [activeOptionTab, setActiveOptionTab] = useState(pricingOptions[1]?.id || pricingOptions[0]?.id);
  const [taxRate, setTaxRate] = useState(estimate?.tax_rate_percent || 0);
  const [discountCents, setDiscountCents] = useState(estimate?.discount_cents || 0);
  const [validDays, setValidDays] = useState(30);
  const [customerNotes, setCustomerNotes] = useState(estimate?.customer_notes || "");
  const [internalNotes, setInternalNotes] = useState(estimate?.internal_notes || "");

  // Calculate totals based on mode
  const calculateTotal = (items: EstimateLineItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total_cents, 0);
    const taxAmount = Math.round(((subtotal - discountCents) * taxRate) / 100);
    return subtotal - discountCents + taxAmount;
  };

  const subtotal = usePricingOptions
    ? pricingOptions.find(o => o.id === activeOptionTab)?.line_items.reduce((sum, item) => sum + item.total_cents, 0) || 0
    : lineItems.reduce((sum, item) => sum + item.total_cents, 0);
  const taxAmount = Math.round(((subtotal - discountCents) * taxRate) / 100);
  const total = subtotal - discountCents + taxAmount;

  // Update pricing option line items
  const updatePricingOptionLineItems = (optionId: string, items: EstimateLineItem[]) => {
    setPricingOptions((options) =>
      options.map((opt) =>
        opt.id === optionId
          ? { ...opt, line_items: items, total_cents: items.reduce((sum, item) => sum + item.total_cents, 0) }
          : opt
      )
    );
  };

  // Update pricing option metadata
  const updatePricingOption = (optionId: string, field: "name" | "description", value: string) => {
    setPricingOptions((options) =>
      options.map((opt) => (opt.id === optionId ? { ...opt, [field]: value } : opt))
    );
  };

  // Calculate valid until date
  const getValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + validDays);
    return date.toISOString().split("T")[0];
  };

  // Save estimate
  const handleSave = async (sendAfterSave = false) => {
    const validItems = usePricingOptions
      ? pricingOptions[1]?.line_items.filter((item) => item.name.trim()) || []
      : lineItems.filter((item) => item.name.trim());

    if (validItems.length === 0 && !usePricingOptions) {
      return; // TODO: Show error
    }

    // Prepare pricing options with calculated totals
    const preparedOptions = usePricingOptions
      ? pricingOptions.map((opt) => ({
          ...opt,
          total_cents: calculateTotal(opt.line_items),
        }))
      : undefined;

    const estimateData = {
      customer_id: customerId || undefined,
      title: title || undefined,
      line_items: usePricingOptions ? pricingOptions[1]?.line_items || [] : lineItems.filter(item => item.name.trim()),
      pricing_options: preparedOptions,
      tax_rate_percent: taxRate,
      discount_cents: discountCents,
      valid_until: getValidUntil(),
      customer_notes: customerNotes || undefined,
      internal_notes: internalNotes || undefined,
    };

    if (estimate) {
      await updateEstimate.mutateAsync({
        id: estimate.id,
        ...estimateData,
      });
    } else {
      const newEstimate = await createEstimate.mutateAsync(estimateData);

      if (sendAfterSave && customerId) {
        await sendEstimate.mutateAsync({
          estimateId: newEstimate.id,
        });
      }
    }

    onSave();
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Estimate Title (Optional)</Label>
          <Input
            id="title"
            placeholder={estimatePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer">Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.full_name || customer.phone_e164 || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pricing Mode Toggle */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Good-Better-Best Pricing</p>
                <p className="text-sm text-muted-foreground">
                  Offer multiple pricing tiers to increase close rates
                </p>
              </div>
            </div>
            <Switch checked={usePricingOptions} onCheckedChange={setUsePricingOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Line Items / Pricing Options */}
      {usePricingOptions ? (
        <div className="space-y-4">
          <Tabs value={activeOptionTab} onValueChange={setActiveOptionTab}>
            <TabsList className="grid w-full grid-cols-3">
              {pricingOptions.map((option, index) => (
                <TabsTrigger key={option.id} value={option.id} className="relative">
                  {option.name}
                  {index === 1 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Popular
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {pricingOptions.map((option) => (
              <TabsContent key={option.id} value={option.id} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Option Name</Label>
                    <Input
                      value={option.name}
                      onChange={(e) => updatePricingOption(option.id, "name", e.target.value)}
                      placeholder="e.g., Basic, Standard, Premium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={option.description || ""}
                      onChange={(e) => updatePricingOption(option.id, "description", e.target.value)}
                      placeholder="Brief description of this option"
                    />
                  </div>
                </div>

                <LineItemsEditor
                  lineItems={option.line_items}
                  onChange={(items) => updatePricingOptionLineItems(option.id, items)}
                />

                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Option Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculateTotal(option.line_items))}</p>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      ) : (
        <LineItemsEditor lineItems={lineItems} onChange={setLineItems} />
      )}

      {/* Totals (for single pricing mode) */}
      {!usePricingOptions && (
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>Discount</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(discountCents / 100).toFixed(2)}
                  onChange={(e) => setDiscountCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                  className="w-24 h-8 text-right"
                />
              </div>
              <span className="text-destructive">-{formatCurrency(discountCents)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>Tax</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-16 h-8 text-right"
                />
                <span>%</span>
              </div>
              <span>{formatCurrency(taxAmount)}</span>
            </div>

            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerNotes">Notes for Customer</Label>
          <Textarea
            id="customerNotes"
            placeholder="These notes will be visible on the estimate..."
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="internalNotes">Internal Notes</Label>
          <Textarea
            id="internalNotes"
            placeholder="Private notes (not shown to customer)..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Valid For */}
      <div className="flex items-center gap-4">
        <Label>Valid for</Label>
        <Select value={validDays.toString()} onValueChange={(v) => setValidDays(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Financing Option */}
      {financingAvailable && total >= 50000 && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Offer Financing</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFinancingAmount(total)} with Wisetack
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                Increase close rate by 30%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {financingAvailable && total >= 50000 && customerId && (
            <Button
              variant="outline"
              onClick={async () => {
                const customer = customers.find((c) => c.id === customerId);
                if (!customer?.email) return;

                await createApplication.mutateAsync({
                  customer_id: customerId,
                  estimate_id: estimate?.id,
                  amount_cents: total,
                  customer_email: customer.email,
                  customer_phone: customer.phone_e164 || undefined,
                  customer_name: customer.full_name || undefined,
                  description: title || "Service Estimate",
                });
              }}
              disabled={createApplication.isPending}
              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            >
              {createApplication.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Offer Financing
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={createEstimate.isPending || updateEstimate.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={createEstimate.isPending || updateEstimate.isPending || !customerId}
          >
            <Send className="h-4 w-4 mr-2" />
            Save & Send
          </Button>
        </div>
      </div>
    </div>
  );
}
