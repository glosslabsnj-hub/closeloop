/**
 * Additional Services Editor
 * 
 * Allows businesses to configure secondary/additional services they offer
 * beyond their core business (e.g., body work for a tow company).
 * 
 * The AI adapts its behavior based on the detail level configured:
 * - Full pricing: AI can quote prices directly
 * - Basic info only: AI mentions service and offers callback
 * 
 * Industry-aware: Suggests relevant add-on services based on business type
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useTenantConfig } from "@/hooks/useTenantConfig";
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
import { Plus, Trash2, Loader2, Info, Lightbulb, ChevronDown, ChevronRight, Check, X, Wrench, PhoneCall, DollarSign, Sparkles } from "lucide-react";
import { createService, updateService, deleteService } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PriceType = "fixed" | "starting_at" | "quote_only";

interface ServiceFormData {
  name: string;
  description: string;
  service_category: string;
  price_type: PriceType;
  price_amount: number | null;
  duration_minutes: number;
}

interface AdditionalServiceSuggestion {
  name: string;
  description: string;
  category: string;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  service_category: "",
  price_type: "quote_only",
  price_amount: null,
  duration_minutes: 60,
};

// ============================================================================
// INDUSTRY-AWARE SUGGESTIONS
// ============================================================================

// Map industries to relevant add-on services
const INDUSTRY_ADDON_SUGGESTIONS: Record<string, AdditionalServiceSuggestion[]> = {
  // Towing & Dispatch industries
  towing: [
    { name: "Auto Repair", description: "General mechanical repairs and diagnostics", category: "Auto Repair" },
    { name: "Body Work", description: "Collision repair, dent removal, and paint work", category: "Body Work" },
    { name: "Detailing", description: "Interior/exterior cleaning and detailing services", category: "Detailing" },
    { name: "Vehicle Storage", description: "Short and long-term vehicle storage", category: "Storage" },
    { name: "Tire Services", description: "New tires, mounting, balancing, and rotation", category: "Maintenance" },
    { name: "Battery Sales", description: "New battery installation and testing", category: "Maintenance" },
    { name: "Impound Release", description: "Vehicle release and impound lot services", category: "Impound" },
  ],
  roadside: [
    { name: "Auto Repair", description: "General mechanical repairs", category: "Auto Repair" },
    { name: "Tire Services", description: "New tires and tire repairs", category: "Maintenance" },
    { name: "Battery Replacement", description: "New battery sales and installation", category: "Maintenance" },
    { name: "Windshield Repair", description: "Chip and crack repairs", category: "Glass" },
  ],
  
  // Auto Detailing
  detailing: [
    { name: "Ceramic Coating", description: "Long-lasting paint protection", category: "Protection" },
    { name: "Paint Correction", description: "Swirl and scratch removal", category: "Correction" },
    { name: "Window Tinting", description: "Automotive window film installation", category: "Add-on Services" },
    { name: "PPF Installation", description: "Paint protection film application", category: "Protection" },
    { name: "Headlight Restoration", description: "Foggy headlight lens restoration", category: "Restoration" },
    { name: "Odor Removal", description: "Deep cleaning and odor elimination", category: "Specialty" },
    { name: "Leather Conditioning", description: "Leather cleaning and conditioning", category: "Interior" },
  ],
  
  // HVAC
  hvac: [
    { name: "Duct Cleaning", description: "Air duct cleaning and sanitization", category: "Maintenance" },
    { name: "Air Quality Testing", description: "Indoor air quality assessment", category: "Specialty" },
    { name: "Thermostat Installation", description: "Smart thermostat setup", category: "Add-on Services" },
    { name: "Maintenance Plans", description: "Annual service and maintenance agreements", category: "Plans" },
    { name: "Insulation Services", description: "Attic and wall insulation", category: "Specialty" },
    { name: "UV Light Installation", description: "Air purification systems", category: "Add-on Services" },
  ],
  
  // Plumbing
  plumbing: [
    { name: "Water Heater Services", description: "Installation, repair, and maintenance", category: "Specialty" },
    { name: "Drain Cleaning", description: "Professional drain clearing and jetting", category: "Maintenance" },
    { name: "Sewer Line Services", description: "Inspection, repair, and replacement", category: "Specialty" },
    { name: "Water Treatment", description: "Filtration and softener systems", category: "Add-on Services" },
    { name: "Gas Line Services", description: "Gas line installation and repair", category: "Specialty" },
    { name: "Fixture Installation", description: "Faucets, toilets, and fixtures", category: "Installation" },
  ],
  
  // Electrical
  electrical: [
    { name: "Panel Upgrades", description: "Electrical panel replacement and upgrades", category: "Specialty" },
    { name: "EV Charger Installation", description: "Electric vehicle charging stations", category: "Installation" },
    { name: "Generator Installation", description: "Backup generator setup", category: "Installation" },
    { name: "Smart Home Wiring", description: "Home automation and smart device setup", category: "Add-on Services" },
    { name: "Lighting Design", description: "Custom lighting installation", category: "Add-on Services" },
    { name: "Surge Protection", description: "Whole-home surge protection", category: "Protection" },
  ],
  
  // Salon/Spa
  salon: [
    { name: "Makeup Services", description: "Professional makeup application", category: "Beauty" },
    { name: "Skincare Treatments", description: "Facials and skin treatments", category: "Skincare" },
    { name: "Nail Services", description: "Manicures and pedicures", category: "Nails" },
    { name: "Waxing", description: "Hair removal services", category: "Beauty" },
    { name: "Lash Extensions", description: "Eyelash extension application", category: "Beauty" },
    { name: "Bridal Packages", description: "Wedding day beauty services", category: "Special Events" },
  ],
  spa: [
    { name: "Massage Therapy", description: "Various massage modalities", category: "Wellness" },
    { name: "Body Treatments", description: "Wraps, scrubs, and body care", category: "Wellness" },
    { name: "Couples Packages", description: "Side-by-side treatments", category: "Special Events" },
    { name: "Aromatherapy", description: "Essential oil treatments", category: "Add-on Services" },
  ],
  
  // Cleaning
  cleaning: [
    { name: "Deep Cleaning", description: "Intensive one-time cleaning", category: "Specialty" },
    { name: "Move-In/Move-Out", description: "Cleaning for moves", category: "Specialty" },
    { name: "Carpet Cleaning", description: "Professional carpet shampooing", category: "Specialty" },
    { name: "Window Cleaning", description: "Interior and exterior windows", category: "Add-on Services" },
    { name: "Organizing Services", description: "Home organization", category: "Add-on Services" },
    { name: "Pressure Washing", description: "Exterior surface cleaning", category: "Exterior" },
  ],
  
  // Landscaping
  landscaping: [
    { name: "Irrigation Systems", description: "Sprinkler installation and repair", category: "Installation" },
    { name: "Tree Services", description: "Trimming, removal, and planting", category: "Specialty" },
    { name: "Hardscaping", description: "Patios, walkways, and retaining walls", category: "Construction" },
    { name: "Outdoor Lighting", description: "Landscape lighting design", category: "Add-on Services" },
    { name: "Snow Removal", description: "Winter snow and ice services", category: "Seasonal" },
    { name: "Pest Control", description: "Lawn pest treatment", category: "Maintenance" },
  ],
  
  // Auto Repair/Mechanic
  auto_repair: [
    { name: "Detailing", description: "Interior/exterior detailing", category: "Detailing" },
    { name: "Body Work", description: "Collision and dent repair", category: "Body Work" },
    { name: "Window Tinting", description: "Automotive tinting", category: "Add-on Services" },
    { name: "Fleet Services", description: "Commercial fleet maintenance", category: "Commercial" },
    { name: "Performance Upgrades", description: "Performance parts and tuning", category: "Specialty" },
    { name: "Vehicle Inspections", description: "State inspections and pre-purchase", category: "Inspection" },
  ],
  
  // Medical/Healthcare
  medical: [
    { name: "Lab Services", description: "On-site lab work and testing", category: "Diagnostics" },
    { name: "Telemedicine", description: "Virtual consultations", category: "Virtual Care" },
    { name: "Wellness Programs", description: "Preventive care and wellness", category: "Wellness" },
    { name: "Physical Therapy", description: "Rehabilitation services", category: "Therapy" },
  ],
  medspa: [
    { name: "IV Therapy", description: "Vitamin and hydration infusions", category: "Wellness" },
    { name: "Weight Management", description: "Medical weight loss programs", category: "Wellness" },
    { name: "Skincare Products", description: "Professional-grade skincare", category: "Retail" },
    { name: "Membership Plans", description: "Monthly treatment packages", category: "Plans" },
  ],
  
  // Photography
  photography: [
    { name: "Videography", description: "Professional video services", category: "Video" },
    { name: "Photo Editing", description: "Advanced retouching and editing", category: "Post-Production" },
    { name: "Prints & Albums", description: "Professional printing services", category: "Products" },
    { name: "Drone Photography", description: "Aerial photography", category: "Specialty" },
  ],
  
  // Fitness
  fitness: [
    { name: "Nutrition Coaching", description: "Meal planning and nutrition advice", category: "Wellness" },
    { name: "Online Training", description: "Virtual workout programs", category: "Virtual" },
    { name: "Group Classes", description: "Small group training sessions", category: "Classes" },
    { name: "Recovery Services", description: "Stretching, massage, recovery", category: "Wellness" },
  ],
  
  // Pet Services
  pet_grooming: [
    { name: "Pet Boarding", description: "Overnight pet care", category: "Boarding" },
    { name: "Pet Sitting", description: "In-home pet sitting", category: "Care" },
    { name: "Pet Photography", description: "Professional pet photos", category: "Specialty" },
    { name: "Pet Products", description: "Premium pet supplies", category: "Retail" },
  ],
  
  // Locksmith
  locksmith: [
    { name: "Safe Services", description: "Safe opening and installation", category: "Specialty" },
    { name: "Security Systems", description: "Security system installation", category: "Installation" },
    { name: "Access Control", description: "Commercial access systems", category: "Commercial" },
    { name: "Key Duplication", description: "Key copying services", category: "Services" },
  ],

  // Pest Control
  pest_control: [
    { name: "Wildlife Removal", description: "Humane removal of birds, bats, raccoons, etc.", category: "Specialty" },
    { name: "Exclusion Services", description: "Sealing entry points to prevent re-infestation", category: "Prevention" },
    { name: "Moisture Control", description: "Crawl space moisture barriers and dehumidifiers", category: "Prevention" },
    { name: "Annual Inspection", description: "Full property pest and termite inspection", category: "Inspection" },
    { name: "Organic / Eco-Friendly Treatment", description: "Pet and kid-safe plant-based treatments", category: "Specialty" },
  ],
};

// Map business_mode to default suggestions when no specific industry match
const MODE_DEFAULT_SUGGESTIONS: Record<string, AdditionalServiceSuggestion[]> = {
  dispatch: [
    { name: "Vehicle Storage", description: "Short and long-term storage", category: "Storage" },
    { name: "Minor Repairs", description: "Basic repair services", category: "Auto Repair" },
    { name: "Fleet Services", description: "Commercial fleet support", category: "Commercial" },
  ],
  service: [
    { name: "Maintenance Plans", description: "Recurring service agreements", category: "Plans" },
    { name: "Emergency Services", description: "After-hours emergency calls", category: "Emergency" },
    { name: "Consulting", description: "Expert consultation and advice", category: "Consulting" },
  ],
  food: [
    { name: "Catering", description: "Event catering services", category: "Catering" },
    { name: "Meal Prep", description: "Weekly meal preparation", category: "Specialty" },
    { name: "Private Events", description: "Private dining and events", category: "Events" },
  ],
  medical: [
    { name: "Telemedicine", description: "Virtual consultations", category: "Virtual Care" },
    { name: "Wellness Programs", description: "Preventive care programs", category: "Wellness" },
  ],
  general: [
    { name: "Consulting", description: "Expert consultation", category: "Consulting" },
    { name: "Custom Services", description: "Tailored solutions", category: "Specialty" },
  ],
};

// Categories that are relevant by mode
const MODE_CATEGORIES: Record<string, string[]> = {
  dispatch: ["Auto Repair", "Body Work", "Detailing", "Storage", "Maintenance", "Impound", "Glass", "Commercial"],
  service: ["Maintenance", "Specialty", "Add-on Services", "Plans", "Installation", "Emergency", "Consulting"],
  food: ["Catering", "Events", "Specialty", "Delivery"],
  medical: ["Wellness", "Diagnostics", "Therapy", "Virtual Care", "Specialty"],
  general: ["Consulting", "Specialty", "Add-on Services", "Other"],
};

export function AdditionalServicesEditor() {
  const { tenant } = useAuth();
  const { services, isLoading } = useServices();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();

  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<any | null>(null);
  const [editingFormData, setEditingFormData] = useState<Record<string, ServiceFormData>>({});
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newServiceData, setNewServiceData] = useState<ServiceFormData>(defaultFormData);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter to only secondary services - must be before useMemo that depends on it
  const secondaryServices = services?.filter(s => s.service_type === "secondary") || [];

  // Get industry from tenant
  const tenantIndustry = tenant?.industry?.toLowerCase() || "";
  
  // Get industry-aware suggestions
  const industrySuggestions = useMemo(() => {
    // Try exact industry match first
    const exactMatch = INDUSTRY_ADDON_SUGGESTIONS[tenantIndustry];
    if (exactMatch) return exactMatch;
    
    // Try partial matches (e.g., "auto_detailing" -> "detailing")
    for (const [key, suggestions] of Object.entries(INDUSTRY_ADDON_SUGGESTIONS)) {
      if (tenantIndustry.includes(key) || key.includes(tenantIndustry)) {
        return suggestions;
      }
    }
    
    // Fall back to mode defaults
    return MODE_DEFAULT_SUGGESTIONS[businessMode] || MODE_DEFAULT_SUGGESTIONS.general;
  }, [tenantIndustry, businessMode]);
  
  // Get relevant categories for the current industry/mode
  const categoryOptions = useMemo(() => {
    const baseCategories = MODE_CATEGORIES[businessMode] || MODE_CATEGORIES.general;
    // Add any unique categories from industry suggestions
    const suggestionCategories = industrySuggestions.map(s => s.category);
    const allCategories = [...new Set([...baseCategories, ...suggestionCategories])];
    // Always add "Other" at the end
    if (!allCategories.includes("Other")) {
      allCategories.push("Other");
    }
    return allCategories;
  }, [businessMode, industrySuggestions]);
  
  // Filter out suggestions that are already added
  const availableSuggestions = useMemo(() => {
    const existingNames = secondaryServices.map(s => s.name.toLowerCase());
    return industrySuggestions.filter(
      suggestion => !existingNames.includes(suggestion.name.toLowerCase())
    );
  }, [industrySuggestions, secondaryServices]);

  const formatPrice = (service: any) => {
    if (service.price_type === "quote_only") return "Quote/Callback";
    if (!service.price_amount) return "Not Set";
    const prefix = service.price_type === "starting_at" ? "From " : "";
    return `${prefix}$${service.price_amount}`;
  };

  const toggleService = (serviceId: string, service: any) => {
    if (expandedServiceId === serviceId) {
      setExpandedServiceId(null);
    } else {
      setExpandedServiceId(serviceId);
      if (!editingFormData[serviceId]) {
        setEditingFormData(prev => ({
          ...prev,
          [serviceId]: {
            name: service.name,
            description: service.description || "",
            service_category: service.service_category || "",
            price_type: service.price_type,
            price_amount: service.price_amount ? Number(service.price_amount) : null,
            duration_minutes: service.duration_minutes || 60,
          }
        }));
      }
    }
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
        service_category: formData.service_category.trim() || undefined,
        price_type: formData.price_type,
        price_amount: formData.price_amount,
        duration_minutes: formData.duration_minutes,
        service_type: "secondary",
      });
      toast.success("Service updated");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      setExpandedServiceId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save service");
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleCreateNew = async () => {
    if (!tenant?.id || !newServiceData.name.trim()) return;

    setSavingServiceId("new");
    try {
      await createService(tenant.id, {
        name: newServiceData.name.trim(),
        description: newServiceData.description.trim() || undefined,
        service_category: newServiceData.service_category.trim() || undefined,
        price_type: newServiceData.price_type,
        price_amount: newServiceData.price_amount,
        duration_minutes: newServiceData.duration_minutes,
        service_type: "secondary",
        is_active: true,
      });
      toast.success("Additional service added");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
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
      toast.success("Service removed");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      setDeleteDialogOpen(false);
      setDeletingService(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete service");
    }
  };

  const handleToggleActive = async (service: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenant?.id) return;

    try {
      await updateService(service.id, tenant.id, {
        is_active: !service.is_active,
      });
      toast.success(service.is_active ? "Service hidden from AI" : "Service visible to AI");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update service");
    }
  };

  const startCreatingNew = () => {
    setIsCreatingNew(true);
    setExpandedServiceId(null);
    setNewServiceData(defaultFormData);
  };

  // Get an industry-aware example for the explanation - must be before any early returns
  const industryExample = useMemo(() => {
    const examples: Record<string, string> = {
      towing: "a tow company might also offer body work, auto repair, or detailing",
      roadside: "a roadside service might also offer tire sales or battery replacement",
      detailing: "a detailing business might also offer ceramic coating or window tinting",
      hvac: "an HVAC company might also offer duct cleaning or maintenance plans",
      plumbing: "a plumber might also offer water heater services or drain cleaning",
      electrical: "an electrician might also offer EV charger installation or smart home wiring",
      salon: "a salon might also offer makeup services, skincare, or nail services",
      cleaning: "a cleaning service might also offer deep cleaning, carpet cleaning, or pressure washing",
      landscaping: "a landscaping company might also offer irrigation systems or tree services",
      auto_repair: "an auto shop might also offer detailing, body work, or inspections",
      pest_control: "a pest control company might also offer wildlife removal, exclusion services, or moisture control",
      locksmith: "a locksmith might also offer security systems, access control, or safe services",
    };
    
    // Try to find a matching example
    for (const [key, example] of Object.entries(examples)) {
      if (tenantIndustry.includes(key) || key.includes(tenantIndustry)) {
        return example;
      }
    }
    
    // Default by mode
    const modeExamples: Record<string, string> = {
      dispatch: "a service company might also offer repairs, storage, or maintenance",
      service: "a service business might also offer maintenance plans or specialty services",
      food: "a restaurant might also offer catering or meal prep services",
      medical: "a medical practice might also offer telemedicine or wellness programs",
      general: "a business might also offer consulting or add-on services",
      sales: "a dealership might also offer protection packages, accessories, or service plans",
    };
    return modeExamples[businessMode] || modeExamples.general;
  }, [tenantIndustry, businessMode]);

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

  // Build AI preview based on configured services
  const aiPreview = secondaryServices.length > 0
    ? secondaryServices.some(s => s.price_amount)
      ? `We also offer ${secondaryServices.map(s => s.name.toLowerCase()).join(", ")}. Would you like pricing information?`
      : `We also offer ${secondaryServices.map(s => s.name.toLowerCase()).join(", ")}. Would you like me to have someone call you with details?`
    : null;

  // Inline form component
  const ServiceForm = ({ 
    formData, 
    onChange, 
    onSave, 
    onCancel, 
    isSaving,
    isNew = false 
  }: { 
    formData: ServiceFormData;
    onChange: (field: keyof ServiceFormData, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    isNew?: boolean;
  }) => (
    <div className="p-4 space-y-4 border-t bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Service Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Body Work, Auto Repair, etc."
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Category</Label>
          <Select
            value={formData.service_category || ""}
            onValueChange={(v) => onChange("service_category", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Groups related services together</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Description (optional)</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="What's included, who it's for, any details the AI should know..."
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          The more detail you add, the better the AI can explain this service
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">How should AI handle pricing?</Label>
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
              <SelectItem value="quote_only">Offer callback for quote</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
            {formData.price_type === "fixed" && (
              <><DollarSign className="h-3 w-3 mt-0.5 text-primary" /><span>AI says: "That's $X"</span></>
            )}
            {formData.price_type === "starting_at" && (
              <><DollarSign className="h-3 w-3 mt-0.5 text-primary/70" /><span>AI says: "Starting at $X"</span></>
            )}
            {formData.price_type === "quote_only" && (
              <><PhoneCall className="h-3 w-3 mt-0.5 text-muted-foreground" /><span>AI says: "I'll have someone call you"</span></>
            )}
          </div>
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
  return (
    <div className="space-y-6">
      {/* Explanation Card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What are Additional Services?</p>
            <p className="text-sm text-muted-foreground">
              These are services your business offers <strong>in addition</strong> to your core business. 
              For example, {industryExample}. 
              The AI will mention these when relevant and either quote prices or offer callbacks based on your configuration.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Lightbulb className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Add as much or as little detail as you want — the AI adapts!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      {aiPreview && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <Wrench className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI tells customers</p>
              <p className="text-sm italic">"{aiPreview}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Industry-Aware Suggestions */}
      {availableSuggestions.length > 0 && (
        <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
          <div className="rounded-lg border bg-accent/30 border-accent/50 overflow-hidden">
            <CollapsibleTrigger asChild>
              <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-accent-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      Suggested services for your business
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {availableSuggestions.length} suggestion{availableSuggestions.length !== 1 ? 's' : ''} based on your industry
                    </p>
                  </div>
                </div>
                {showSuggestions ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.name}
                      onClick={() => {
                        setNewServiceData({
                          ...defaultFormData,
                          name: suggestion.name,
                          description: suggestion.description,
                          service_category: suggestion.category,
                        });
                        setIsCreatingNew(true);
                        setShowSuggestions(false);
                      }}
                      className="flex items-start gap-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors text-left group"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{suggestion.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.description}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">{suggestion.category}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Additional Services</h3>
          <p className="text-sm text-muted-foreground">
            {secondaryServices.length 
              ? `${secondaryServices.length} additional service${secondaryServices.length !== 1 ? 's' : ''} configured`
              : "Add services beyond your core business"
            }
          </p>
        </div>
        <Button onClick={startCreatingNew} disabled={isCreatingNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* New Service Form */}
      {isCreatingNew && (
        <Card>
          <div className="px-4 py-3 flex items-center gap-3 bg-primary/5 border-b">
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">New Additional Service</span>
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
          />
        </Card>
      )}

      {/* Services List */}
      {secondaryServices.length > 0 ? (
        <div className="space-y-2">
          {secondaryServices.map((service) => {
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
                            {service.service_category && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {service.service_category}
                              </Badge>
                            )}
                            {!service.is_active && (
                              <Badge variant="outline" className="text-xs shrink-0">Hidden</Badge>
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
                        <span className="text-sm font-medium">{formatPrice(service)}</span>
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
                      />
                    )}
                    <div className="px-4 py-2 border-t bg-muted/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => handleToggleActive(service, { stopPropagation: () => {} } as any)}
                        />
                        <Label className="text-xs text-muted-foreground">
                          {service.is_active ? "Visible to AI" : "Hidden from AI"}
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
                <Wrench className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">No additional services yet</h3>
                <p className="text-sm text-muted-foreground">
                  If your business offers services beyond your core focus (like body work for a tow company), 
                  add them here so the AI can inform customers.
                </p>
              </div>
              <Button onClick={startCreatingNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deletingService?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
