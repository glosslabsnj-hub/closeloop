import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Clock, DollarSign, Loader2, ChevronDown, ChevronRight, Check, X, ClipboardPaste, FileSpreadsheet } from "lucide-react";
import { InlineUploadButton } from "../uploads/InlineUploadButton";
import { PasteFromPOSDialog } from "../templates/PasteFromPOSDialog";
import { ServiceCSVImportDialog } from "../templates/ServiceCSVImportDialog";
import { FlatbedPricingDialog } from "./FlatbedPricingDialog";
import { createService, updateService, deleteService } from "@/lib/brain/writeBrainFact";
import { invalidateBrainQueries } from "@/lib/brain/invalidateBrainQueries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { getServiceExamples, getSlugServiceExamples, COMPLEXITY_HINTS, SLUG_COMPLEXITY_OVERRIDES, PRICE_FACTOR_HINTS, SLUG_PRICE_FACTOR_OVERRIDES } from "@/lib/industryExamples";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { getIndustryBySlug } from "@/data/industryCatalog";


type PriceType = "fixed" | "starting_at" | "quote_only";

type BookingType = "direct_book" | "estimate_first" | "consultation";

type PaymentTiming = "at_booking" | "at_service" | "deposit_then_balance" | "quote_first";

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: number;
  price_type: PriceType;
  price_amount: number | null;
  deposit_amount: number | null;
  deposit_required: boolean;
  complexity: "simple" | "complex";
  price_factors: string;
  booking_type: BookingType;
  prerequisite_note: string;
  duration_min_minutes: number | null;
  duration_max_minutes: number | null;
  required_intake_fields: string[];
  payment_timing: PaymentTiming;
}

// Essential intake fields shown for all non-food modes (minimal, always relevant)
const ESSENTIAL_INTAKE_FIELDS = ["address", "preferred_date"];

// Additional fields shown when complexity is "complex" (ask detailed questions)
const ADVANCED_INTAKE_FIELDS = [
  "property_type",
  "urgency",
  "scope_of_work",
  "access_instructions",
  "budget_range",
  "photos",
  "warranty_status",
];

// Mode-specific overrides: which advanced fields are relevant per mode
const MODE_ADVANCED_FIELDS: Record<string, string[]> = {
  service: ["property_type", "urgency", "scope_of_work", "access_instructions", "photos"],
  dispatch: ["vehicle_info", "pickup_location", "dropoff_location", "urgency"],
  medical: ["urgency", "photos"],
  sales: ["budget_range"],
  general: ["urgency"],
};

function getIntakeFieldsForMode(mode: string, complexity: "simple" | "complex"): string[] {
  if (complexity === "simple") {
    return ESSENTIAL_INTAKE_FIELDS;
  }
  const advancedForMode = MODE_ADVANCED_FIELDS[mode] ?? ADVANCED_INTAKE_FIELDS;
  return [...ESSENTIAL_INTAKE_FIELDS, ...advancedForMode];
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  duration_minutes: 60,
  price_type: "fixed",
  price_amount: null,
  deposit_amount: null,
  deposit_required: false,
  complexity: "simple",
  price_factors: "",
  booking_type: "direct_book",
  prerequisite_note: "",
  duration_min_minutes: null,
  duration_max_minutes: null,
  required_intake_fields: [],
  payment_timing: "at_service",
};

// Extracted outside ServiceCatalogEditor to prevent focus loss on re-render
function ServiceForm({
  formData,
  onChange,
  onSave,
  onCancel,
  isSaving,
  isNew = false,
  serviceExamples,
  businessMode,
  complexityHints,
}: {
  formData: ServiceFormData;
  onChange: (field: keyof ServiceFormData, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isNew?: boolean;
  serviceExamples: ReturnType<typeof getServiceExamples>;
  businessMode: string;
  complexityHints: { simple: string; complex: string };
}) {
  const { terms, slug } = useIndustryContext();
  const priceFactorHint = (slug && SLUG_PRICE_FACTOR_OVERRIDES[slug])
    || PRICE_FACTOR_HINTS[businessMode]
    || PRICE_FACTOR_HINTS.general;
  return (
    <div className="p-4 space-y-4 border-t bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs capitalize">{serviceExamples.serviceName} Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder={serviceExamples.serviceNamePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">How long does this take? (minutes)</Label>
          <Input
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => onChange("duration_minutes", parseInt(e.target.value) || 60)}
            placeholder="60"
          />
          <p className="text-xs text-muted-foreground">{serviceExamples.durationHint}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder={serviceExamples.descriptionPlaceholder}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">How should AI quote this?</Label>
          <Select
            value={formData.price_type}
            onValueChange={(v) => onChange("price_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Quote exact price</SelectItem>
              <SelectItem value="starting_at">Quote "starting at" price</SelectItem>
              <SelectItem value="quote_only">Don't quote - offer callback</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formData.price_type === "fixed" && "AI says: \"That's $X\""}
            {formData.price_type === "starting_at" && "AI says: \"Starting at $X, depending on...\""}
            {formData.price_type === "quote_only" && "AI says: \"I'd need to have someone call you with a quote\""}
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.price_amount ?? ""}
            onChange={(e) => onChange("price_amount", e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="150.00"
            disabled={formData.price_type === "quote_only"}
          />
        </div>
      </div>

      {/* Price Factors — shown when price varies */}
      {(formData.price_type === "starting_at" || formData.price_type === "quote_only") && (
        <div className="space-y-2">
          <Label className="text-xs">What makes the price vary? <span className="text-muted-foreground">(AI will explain this to callers)</span></Label>
          <Textarea
            value={formData.price_factors}
            onChange={(e) => onChange("price_factors", e.target.value)}
            placeholder={priceFactorHint}
            rows={2}
          />
        </div>
      )}

      {/* Complexity Toggle — hidden for food mode */}
      {businessMode !== "food" && (
        <div className="space-y-2">
          <Label className="text-xs">How should the AI handle this?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={formData.complexity === "simple" ? "default" : "outline"}
              size="sm"
              onClick={() => onChange("complexity", "simple")}
              className="flex-1"
            >
              Quick confirmation
            </Button>
            <Button
              type="button"
              variant={formData.complexity === "complex" ? "default" : "outline"}
              size="sm"
              onClick={() => onChange("complexity", "complex")}
              className="flex-1"
            >
              Ask detailed questions
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {formData.complexity === "simple"
              ? `Quick: ${complexityHints.simple}`
              : `Detailed: ${complexityHints.complex}`
            }
          </p>
        </div>
      )}

      {/* Booking Type — hidden for food mode */}
      {businessMode !== "food" && (
        <div className="space-y-2">
          <Label className="text-xs">What happens when someone calls for this?</Label>
          <Select
            value={formData.booking_type}
            onValueChange={(v) => onChange("booking_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct_book">Book it directly</SelectItem>
              <SelectItem value="estimate_first">Schedule an estimate visit first</SelectItem>
              <SelectItem value="consultation">Take their info for a callback</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formData.booking_type === "direct_book" && `AI will check availability and book the ${terms.booking} on the call.`}
            {formData.booking_type === "estimate_first" && `AI will book an estimate visit instead of the full ${terms.booking}. Good for ${terms.bookings} that need an on-site quote.`}
            {formData.booking_type === "consultation" && "AI will collect details and schedule a callback. Good for custom or complex projects."}
          </p>
        </div>
      )}

      {/* Prerequisite note — shown when not direct_book */}
      {businessMode !== "food" && formData.booking_type !== "direct_book" && (
        <div className="space-y-2">
          <Label className="text-xs">Any prerequisites the AI should mention?</Label>
          <Input
            value={formData.prerequisite_note}
            onChange={(e) => onChange("prerequisite_note", e.target.value)}
            placeholder="e.g., Requires on-site estimate first, Permit needed (adds 2 weeks)"
          />
        </div>
      )}

      {/* Required Intake Fields — adapts to complexity */}
      {businessMode !== "food" && (
        <div className="space-y-2">
          <Label className="text-xs">Required info to collect before booking</Label>
          <p className="text-[11px] text-muted-foreground">
            {formData.complexity === "simple"
              ? "Essentials only — toggle to \"Ask detailed questions\" above for more options"
              : "AI will ask for these before scheduling this service"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {getIntakeFieldsForMode(businessMode, formData.complexity).map((field) => {
              const selected = formData.required_intake_fields.includes(field);
              return (
                <Badge
                  key={field}
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => {
                    const next = selected
                      ? formData.required_intake_fields.filter((f) => f !== field)
                      : [...formData.required_intake_fields, field];
                    onChange("required_intake_fields", next);
                  }}
                >
                  {field.replace(/_/g, " ")}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Duration Range — collapsible enhancement */}
      {(formData.duration_min_minutes !== null || formData.duration_max_minutes !== null) ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Min duration (minutes)</Label>
            <Input
              type="number"
              value={formData.duration_min_minutes ?? ""}
              onChange={(e) => onChange("duration_min_minutes", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Max duration (minutes)</Label>
            <Input
              type="number"
              value={formData.duration_max_minutes ?? ""}
              onChange={(e) => onChange("duration_max_minutes", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="180"
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            AI will say "typically {formData.duration_minutes} minutes, but can range from {formData.duration_min_minutes || '?'} to {formData.duration_max_minutes || '?'} minutes"
          </p>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            onChange("duration_min_minutes", Math.max(15, Math.round(formData.duration_minutes * 0.5)));
            onChange("duration_max_minutes", Math.round(formData.duration_minutes * 2));
          }}
        >
          <Clock className="h-3 w-3 mr-1" />
          + Add duration range (for variable-length jobs)
        </Button>
      )}

      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.deposit_required}
            onCheckedChange={(checked) => onChange("deposit_required", checked)}
          />
          <Label className="text-sm">Collect deposit to confirm?</Label>
        </div>
        {formData.deposit_required && (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Deposit ($):</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.deposit_amount ?? ""}
              onChange={(e) => onChange("deposit_amount", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="50.00"
              className="w-24 h-8"
            />
          </div>
        )}
      </div>

      {/* Payment Timing — hidden for food mode */}
      {businessMode !== "food" && (
        <div className="space-y-2">
          <Label className="text-xs">When is payment collected?</Label>
          <Select
            value={formData.payment_timing}
            onValueChange={(v) => onChange("payment_timing", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="at_service">At time of service</SelectItem>
              <SelectItem value="at_booking">At booking (prepay)</SelectItem>
              <SelectItem value="deposit_then_balance">Deposit now, balance at service</SelectItem>
              <SelectItem value="quote_first">After quote approval</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formData.payment_timing === "at_service" && "AI says: \"Payment is collected when we complete the service.\""}
            {formData.payment_timing === "at_booking" && "AI says: \"Payment is required to confirm your booking.\""}
            {formData.payment_timing === "deposit_then_balance" && "AI says: \"A deposit holds your spot, and the balance is due at service.\""}
            {formData.payment_timing === "quote_first" && "AI says: \"We'll provide a quote first, and payment is due after you approve it.\""}
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving || !formData.name.trim()}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          {isNew ? "Add Service" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

export function ServiceCatalogEditor() {
  const { tenant } = useAuth();
  const { services, isLoading } = useServices();
  const { businessMode } = useTenantConfig();
  const { terms, _config, slug } = useIndustryContext();
  const queryClient = useQueryClient();

  const serviceExamples = slug
    ? getSlugServiceExamples(businessMode, slug)
    : getServiceExamples(businessMode);

  const complexityHints = (slug && SLUG_COMPLEXITY_OVERRIDES[slug])
    || COMPLEXITY_HINTS[businessMode]
    || COMPLEXITY_HINTS.general;

  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<any | null>(null);
  const [editingFormData, setEditingFormData] = useState<Record<string, ServiceFormData>>({});
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newServiceData, setNewServiceData] = useState<ServiceFormData>(defaultFormData);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [flatbedDialogOpen, setFlatbedDialogOpen] = useState(false);
  const [seedingFromCatalog, setSeedingFromCatalog] = useState(false);

  // Industry catalog entry for this tenant (used to seed services when catalog is empty)
  const catalogEntry = slug ? getIndustryBySlug(slug) : null;
  const catalogServices = catalogEntry?.services ?? [];

  const seedFromCatalog = async () => {
    if (!tenant?.id || catalogServices.length === 0) return;
    setSeedingFromCatalog(true);
    try {
      for (const svc of catalogServices) {
        await createService(tenant.id, {
          name: svc.name,
          price_type: svc.priceType as "fixed" | "starting_at" | "quote_only",
          price_amount: svc.price > 0 ? svc.price : undefined,
          duration_minutes: svc.duration,
          is_active: true,
        });
      }
      await invalidateBrainQueries(queryClient, tenant.id);
      toast.success(`${catalogServices.length} ${catalogEntry?.name} services added`);
    } catch {
      toast.error("Failed to seed services — please add manually");
    } finally {
      setSeedingFromCatalog(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const formatPrice = (service: any) => {
    if (service.price_type === "quote_only") return "Quote Required";
    if (!service.price_amount) return "Not Set";
    const prefix = service.price_type === "starting_at" ? "From " : "";
    return `${prefix}$${service.price_amount}`;
  };

  const toggleService = (serviceId: string, service: any) => {
    if (expandedServiceId === serviceId) {
      setExpandedServiceId(null);
    } else {
      setExpandedServiceId(serviceId);
      // Initialize form data for this service if not already done
      if (!editingFormData[serviceId]) {
        setEditingFormData(prev => ({
          ...prev,
          [serviceId]: {
            name: service.name,
            description: service.description || "",
            duration_minutes: service.duration_minutes,
            price_type: service.price_type,
            price_amount: service.price_amount ? Number(service.price_amount) : null,
            deposit_amount: service.deposit_amount ? Number(service.deposit_amount) : null,
            deposit_required: service.deposit_required || false,
            complexity: service.complexity || "simple",
            price_factors: service.price_factors || "",
            booking_type: service.booking_type || "direct_book",
            prerequisite_note: service.prerequisite_note || "",
            duration_min_minutes: service.duration_min_minutes ?? null,
            duration_max_minutes: service.duration_max_minutes ?? null,
            required_intake_fields: Array.isArray((service as any).required_intake_fields) ? (service as any).required_intake_fields : [],
            payment_timing: (service as any).payment_timing || "at_service",
          }
        }));
      }
    }
    // Close new service form if open
    setIsCreatingNew(false);
  };

  const updateFormField = (serviceId: string, field: keyof ServiceFormData, value: any) => {
    setEditingFormData(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: value,
      }
    }));
  };

  const handleSave = async (serviceId: string) => {
    if (!tenant?.id) return;
    const formData = editingFormData[serviceId];
    if (!formData || !formData.name.trim()) return;

    setSavingServiceId(serviceId);
    try {
      await updateService(serviceId, tenant.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        duration_minutes: formData.duration_minutes,
        price_type: formData.price_type,
        price_amount: formData.price_amount,
        deposit_amount: formData.deposit_amount,
        deposit_required: formData.deposit_required,
        complexity: formData.complexity,
        price_factors: formData.price_factors.trim() || undefined,
        booking_type: formData.booking_type,
        prerequisite_note: formData.prerequisite_note.trim() || undefined,
        duration_min_minutes: formData.duration_min_minutes,
        duration_max_minutes: formData.duration_max_minutes,
        required_intake_fields: formData.required_intake_fields.length > 0 ? formData.required_intake_fields : undefined,
        payment_timing: formData.payment_timing,
      } as any);
      toast.success("Service updated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      invalidateBrainQueries(queryClient, tenant?.id);
      setExpandedServiceId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save service");
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleCreateNew = async () => {
    if (!tenant?.id || !newServiceData.name.trim()) return;

    // Detect if this is a towing service (check if name contains "tow")
    const isTowingService = /tow/i.test(newServiceData.name.trim());

    // For dispatch mode towing services, show flatbed pricing dialog
    if (isTowingService && businessMode === "dispatch") {
      setFlatbedDialogOpen(true);
      return;
    }

    // Otherwise, create service normally
    await executeCreateService(false);
  };

  const executeCreateService = async (createSeparate: boolean, flatbedPrice?: number, wheelLiftPrice?: number) => {
    if (!tenant?.id || !newServiceData.name.trim()) return;

    setSavingServiceId("new");
    try {
      if (createSeparate && flatbedPrice !== undefined && wheelLiftPrice !== undefined) {
        // Create two services: Wheel Lift and Flatbed
        const baseName = newServiceData.name.trim().replace(/\s*-\s*(wheel\s*lift|flatbed|hook|truck)$/i, "");

        await createService(tenant.id, {
          name: `${baseName} - Wheel Lift`,
          description: newServiceData.description.trim() || "Standard towing method for rear-wheel drive vehicles",
          duration_minutes: newServiceData.duration_minutes,
          price_type: newServiceData.price_type,
          price_amount: wheelLiftPrice,
          deposit_amount: newServiceData.deposit_amount,
          deposit_required: newServiceData.deposit_required,
          complexity: newServiceData.complexity,
          price_factors: newServiceData.price_factors.trim() || undefined,
          booking_type: newServiceData.booking_type,
          prerequisite_note: newServiceData.prerequisite_note.trim() || undefined,
          duration_min_minutes: newServiceData.duration_min_minutes,
          duration_max_minutes: newServiceData.duration_max_minutes,
          required_intake_fields: newServiceData.required_intake_fields.length > 0 ? newServiceData.required_intake_fields : undefined,
          payment_timing: newServiceData.payment_timing,
        } as any);

        await createService(tenant.id, {
          name: `${baseName} - Flatbed`,
          description: newServiceData.description.trim() || "Recommended for AWD, luxury, exotic, and modified vehicles",
          duration_minutes: newServiceData.duration_minutes + 15, // Flatbed takes slightly longer
          price_type: newServiceData.price_type,
          price_amount: flatbedPrice,
          deposit_amount: newServiceData.deposit_amount,
          deposit_required: newServiceData.deposit_required,
          complexity: newServiceData.complexity,
          price_factors: newServiceData.price_factors.trim() || undefined,
          booking_type: newServiceData.booking_type,
          prerequisite_note: newServiceData.prerequisite_note.trim() || undefined,
          duration_min_minutes: newServiceData.duration_min_minutes ? newServiceData.duration_min_minutes + 15 : null,
          duration_max_minutes: newServiceData.duration_max_minutes ? newServiceData.duration_max_minutes + 15 : null,
          required_intake_fields: newServiceData.required_intake_fields.length > 0 ? newServiceData.required_intake_fields : undefined,
          payment_timing: newServiceData.payment_timing,
        } as any);

        toast.success("Created 2 services: Wheel Lift and Flatbed");
      } else {
        // Create single service
        await createService(tenant.id, {
          name: newServiceData.name.trim(),
          description: newServiceData.description.trim() || undefined,
          duration_minutes: newServiceData.duration_minutes,
          price_type: newServiceData.price_type,
          price_amount: newServiceData.price_amount,
          deposit_amount: newServiceData.deposit_amount,
          deposit_required: newServiceData.deposit_required,
          complexity: newServiceData.complexity,
          price_factors: newServiceData.price_factors.trim() || undefined,
          booking_type: newServiceData.booking_type,
          prerequisite_note: newServiceData.prerequisite_note.trim() || undefined,
          duration_min_minutes: newServiceData.duration_min_minutes,
          duration_max_minutes: newServiceData.duration_max_minutes,
          required_intake_fields: newServiceData.required_intake_fields.length > 0 ? newServiceData.required_intake_fields : undefined,
          payment_timing: newServiceData.payment_timing,
        } as any);
        toast.success("Service created");
      }

      queryClient.invalidateQueries({ queryKey: ["services"] });
      invalidateBrainQueries(queryClient, tenant?.id);
      setIsCreatingNew(false);
      setNewServiceData(defaultFormData);
    } catch (error: any) {
      toast.error(error.message || "Failed to create service");
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !deletingService) return;

    try {
      await deleteService(deletingService.id, tenant.id);
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      invalidateBrainQueries(queryClient, tenant?.id);
      setDeleteDialogOpen(false);
      setDeletingService(null);
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("bookings_service_id_fkey") || msg.includes("violates foreign key")) {
        toast.error("This service has bookings — deactivate it instead.", {
          action: {
            label: "Deactivate",
            onClick: () => {
              handleToggleActive(deletingService, { stopPropagation: () => {} } as React.MouseEvent);
              setDeleteDialogOpen(false);
              setDeletingService(null);
            },
          },
          duration: 8000,
        });
      } else {
        toast.error(msg || "Failed to delete service");
      }
    }
  };

  const handleToggleActive = async (service: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenant?.id) return;

    try {
      await updateService(service.id, tenant.id, {
        is_active: !service.is_active,
      });
      toast.success(service.is_active ? "Service deactivated" : "Service activated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      invalidateBrainQueries(queryClient, tenant?.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to update service");
    }
  };

  const startCreatingNew = () => {
    setIsCreatingNew(true);
    setExpandedServiceId(null);
    setNewServiceData(defaultFormData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading services...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build AI quote preview from first service
  const firstService = services?.[0];
  const _aiQuotePreview = firstService
    ? `Our ${firstService.name.toLowerCase()} ${
        firstService.price_type === "starting_at" 
          ? `starts at $${firstService.price_amount}` 
          : firstService.price_type === "quote_only"
          ? "requires a custom quote"
          : `is $${firstService.price_amount}`
      }${firstService.duration_minutes ? ` and takes about ${formatDuration(firstService.duration_minutes)}` : ""}.`
    : "I can tell you about our services and pricing.";

  // ServiceForm is now extracted as a top-level component above

  return (
    <div className="space-y-6">
      {/* Compact upload action */}
      <InlineUploadButton
        contentType="services"
        variant="prominent"
        onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["services"] })}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{terms.services.charAt(0).toUpperCase() + terms.services.slice(1)} Catalog</h3>
          <p className="text-sm text-muted-foreground">
            {services?.length
              ? `${services.length} ${serviceExamples.serviceName}${services.length !== 1 ? 's' : ''} listed • The AI only quotes what's here — add everything you offer`
              : `Add your ${terms.services} so the AI can quote prices and book ${terms.bookings}`
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(businessMode === "food" || businessMode === "sales") && (
            <Button variant="outline" size="sm" onClick={() => setPasteDialogOpen(true)}>
              <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />
              {businessMode === "food" ? "Paste from POS" : "Paste from List"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setCsvDialogOpen(true)}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            CSV Import
          </Button>
          <Button onClick={startCreatingNew} disabled={isCreatingNew}>
            <Plus className="h-4 w-4 mr-2" />
            {terms.addService}
          </Button>
        </div>
      </div>

      {/* New Service Form */}
      {isCreatingNew && (
        <Card>
          <div className="px-4 py-3 flex items-center gap-3 bg-primary/5 border-b">
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm capitalize">New {serviceExamples.serviceName}</span>
          </div>
          <ServiceForm
            formData={newServiceData}
            onChange={(field, value) => setNewServiceData(prev => ({ ...prev, [field]: value }))}
            onSave={handleCreateNew}
            onCancel={() => {
              setIsCreatingNew(false);
              setNewServiceData(defaultFormData);
            }}
            isSaving={savingServiceId === "new"}
            isNew
            serviceExamples={serviceExamples}
            businessMode={businessMode}
            complexityHints={complexityHints}
          />
        </Card>
      )}

      {/* Services List */}
      {services && services.length > 0 ? (
        <div className="space-y-2">
          {services.map((service) => {
            const isExpanded = expandedServiceId === service.id;
            const formData = editingFormData[service.id];

            return (
              <Collapsible
                key={service.id}
                open={isExpanded}
                onOpenChange={() => toggleService(service.id, service)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{service.name}</span>
                            {!service.is_active && (
                              <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-medium">{formatPrice(service)}</span>
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Clock className="h-3 w-3" />
                            {formatDuration(service.duration_minutes)}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingService(service);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {formData && (
                      <ServiceForm
                        formData={formData}
                        onChange={(field, value) => updateFormField(service.id, field, value)}
                        onSave={() => handleSave(service.id)}
                        onCancel={() => setExpandedServiceId(null)}
                        isSaving={savingServiceId === service.id}
                        serviceExamples={serviceExamples}
                        businessMode={businessMode}
                        complexityHints={complexityHints}
                      />
                    )}
                    <div className="px-4 py-2 border-t bg-muted/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => handleToggleActive(service, { stopPropagation: () => {} } as any)}
                        />
                        <Label className="text-xs text-muted-foreground">
                          {service.is_active ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : !isCreatingNew && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">No {terms.services} yet</h3>
                <p className="text-sm text-muted-foreground">
                  Add every {terms.service} you offer. The AI will only mention what's listed here — it won't quote {terms.services} you haven't added.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                {catalogServices.length > 0 && (
                  <Button onClick={seedFromCatalog} disabled={seedingFromCatalog} variant="default">
                    {seedingFromCatalog ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Load {catalogServices.length} {catalogEntry?.name} services
                  </Button>
                )}
                <Button onClick={startCreatingNew} variant={catalogServices.length > 0 ? "outline" : "default"}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingService?.name}"? This action cannot be undone. Services with existing bookings will be deactivated instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* POS Paste Dialog */}
      <PasteFromPOSDialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen} />

      {/* CSV Import Dialog */}
      <ServiceCSVImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} />

      {/* Flatbed Pricing Dialog */}
      <FlatbedPricingDialog
        open={flatbedDialogOpen}
        onOpenChange={setFlatbedDialogOpen}
        serviceName={newServiceData.name.trim()}
        basePrice={newServiceData.price_amount}
        onConfirm={executeCreateService}
      />
    </div>
  );
}
