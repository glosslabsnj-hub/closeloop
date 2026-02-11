/**
 * Brain Section Relevance Configuration
 *
 * Defines which Brain sections are relevant for each business based on their
 * capabilities and scenario answers. Irrelevant sections appear as "Add-ons"
 * at the bottom of each tab instead of cluttering the main area.
 */

import type { LucideIcon } from "lucide-react";
import {
  DollarSign, Package, Truck, UtensilsCrossed, Tag, Lightbulb,
  MapPin, HeartPulse, Warehouse, Phone, FileCheck,
  AlertCircle, Shield, Users,
} from "lucide-react";
import type { Capabilities } from "@/hooks/useCapabilities";

export interface AddOnItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  capabilityKey: string;
  modulesToEnable?: string[];
}

export type BrainTab = "services" | "service-area" | "policies" | "knowledge";

export interface SectionRelevance {
  sectionId: string;
  tab: BrainTab;
  /** Returns true when this section should show in the main area */
  isRelevant: (caps: Capabilities, scenarioFlags: Record<string, boolean>) => boolean;
  /** Metadata shown in the Add-ons group when section is NOT relevant */
  addOn: AddOnItem;
}

/**
 * All sections that can be treated as add-ons when not relevant.
 * Sections NOT listed here are always shown.
 */
export const SECTION_RELEVANCE: SectionRelevance[] = [
  // ── Services Tab ──
  {
    sectionId: "price-modifiers",
    tab: "services",
    isRelevant: (caps, flags) =>
      flags.chargesTripFee === true ||
      flags.hasMinimumCharge === true ||
      flags.offersAfterHours === true ||
      caps.isServiceBusiness ||
      caps.isDispatchBusiness ||
      caps.derivedPrimaryMode === "general",
    addOn: {
      id: "price-modifiers",
      title: "Price Adjustments",
      description: "Enable if you have trip fees, minimums, or after-hours surcharges",
      icon: DollarSign,
      capabilityKey: "chargesTripFee",
    },
  },
  {
    sectionId: "service-packages",
    tab: "services",
    isRelevant: (caps, flags) =>
      flags.offersPackages === true ||
      ((caps.isServiceBusiness || caps.derivedPrimaryMode === "general" || caps.isMedicalBusiness) &&
        caps.isSchedulingBusiness),
    addOn: {
      id: "service-packages",
      title: "Packages & Bundles",
      description: "Enable if you offer bundled services or membership plans",
      icon: Package,
      capabilityKey: "offersPackages",
      modulesToEnable: ["packages"],
    },
  },
  {
    sectionId: "dispatch-pricing",
    tab: "services",
    isRelevant: (caps) => caps.isDispatchBusiness,
    addOn: {
      id: "dispatch-pricing",
      title: "Dispatch Pricing",
      description: "Enable if you need distance-based or equipment-based pricing",
      icon: Truck,
      capabilityKey: "hasDispatchQueue",
      modulesToEnable: ["dispatch_queue"],
    },
  },
  {
    sectionId: "food-settings",
    tab: "services",
    isRelevant: (caps) => caps.isFoodBusiness || caps.hasFoodOrders,
    addOn: {
      id: "food-settings",
      title: "Food Order Options",
      description: "Enable if you serve food or take food orders",
      icon: UtensilsCrossed,
      capabilityKey: "hasFoodOrders",
      modulesToEnable: ["food_orders"],
    },
  },
  {
    sectionId: "medical-pricing",
    tab: "services",
    isRelevant: (caps) => caps.isMedicalBusiness,
    addOn: {
      id: "medical-pricing",
      title: "Medical Pricing",
      description: "Enable for insurance billing and fee schedules",
      icon: HeartPulse,
      capabilityKey: "hasMedicalIntake",
      modulesToEnable: ["medical_intake"],
    },
  },

  // ── Coverage Tab ──
  {
    sectionId: "dispatch-zones",
    tab: "service-area",
    isRelevant: (caps) => caps.isDispatchBusiness,
    addOn: {
      id: "dispatch-zones",
      title: "Dispatch Zones",
      description: "Enable for zone-based dispatch with distance pricing",
      icon: MapPin,
      capabilityKey: "hasDispatchQueue",
      modulesToEnable: ["dispatch_queue"],
    },
  },
  {
    sectionId: "delivery-zones",
    tab: "service-area",
    isRelevant: (caps) => caps.hasFoodOrders || caps.isFoodBusiness,
    addOn: {
      id: "delivery-zones",
      title: "Delivery Zones",
      description: "Enable if you deliver to customer locations",
      icon: Truck,
      capabilityKey: "hasFoodOrders",
      modulesToEnable: ["food_orders"],
    },
  },
  {
    sectionId: "medical-coverage",
    tab: "service-area",
    isRelevant: (caps) => caps.isMedicalBusiness,
    addOn: {
      id: "medical-coverage",
      title: "Medical Visit Options",
      description: "Enable for telehealth and home visit options",
      icon: HeartPulse,
      capabilityKey: "hasMedicalIntake",
      modulesToEnable: ["medical_intake"],
    },
  },

  // ── Policies Tab ──
  {
    sectionId: "impound-lot",
    tab: "policies",
    isRelevant: (caps, flags) => caps.isDispatchBusiness && (caps.hasImpoundLot || flags.hasImpoundLot === true),
    addOn: {
      id: "impound-lot",
      title: "Impound Lot",
      description: "Enable if you operate an impound or storage lot",
      icon: Warehouse,
      capabilityKey: "hasImpoundLot",
      modulesToEnable: ["impound_lot"],
    },
  },
  {
    sectionId: "dispatch-operations",
    tab: "policies",
    isRelevant: (caps) => caps.isDispatchBusiness,
    addOn: {
      id: "dispatch-operations",
      title: "Dispatch Operations",
      description: "Enable for dispatch-specific routing and IVR",
      icon: Phone,
      capabilityKey: "hasDispatchQueue",
      modulesToEnable: ["dispatch_queue"],
    },
  },
  {
    sectionId: "hipaa",
    tab: "policies",
    isRelevant: (caps) => caps.isMedicalBusiness,
    addOn: {
      id: "hipaa",
      title: "HIPAA Compliance",
      description: "Enable for medical compliance and data retention",
      icon: Shield,
      capabilityKey: "hasMedicalIntake",
      modulesToEnable: ["medical_intake"],
    },
  },

  // ── Knowledge Tab ──
  {
    sectionId: "food-knowledge",
    tab: "knowledge",
    isRelevant: (caps) => caps.isFoodBusiness || caps.hasFoodOrders,
    addOn: {
      id: "food-knowledge",
      title: "Food Knowledge",
      description: "Enable for menu details and catering knowledge",
      icon: UtensilsCrossed,
      capabilityKey: "hasFoodOrders",
      modulesToEnable: ["food_orders"],
    },
  },
  {
    sectionId: "dispatch-knowledge",
    tab: "knowledge",
    isRelevant: (caps) => caps.isDispatchBusiness,
    addOn: {
      id: "dispatch-knowledge",
      title: "Dispatch Knowledge",
      description: "Enable for vehicle types and roadside situations",
      icon: Truck,
      capabilityKey: "hasDispatchQueue",
      modulesToEnable: ["dispatch_queue"],
    },
  },
  {
    sectionId: "medical-knowledge",
    tab: "knowledge",
    isRelevant: (caps) => caps.isMedicalBusiness,
    addOn: {
      id: "medical-knowledge",
      title: "Medical Knowledge",
      description: "Enable for symptom triage and insurance scripts",
      icon: HeartPulse,
      capabilityKey: "hasMedicalIntake",
      modulesToEnable: ["medical_intake"],
    },
  },
  {
    sectionId: "product-knowledge",
    tab: "knowledge",
    isRelevant: (caps) =>
      caps.isServiceBusiness ||
      caps.derivedPrimaryMode === "general",
    addOn: {
      id: "product-knowledge",
      title: "Product Knowledge",
      description: "Enable to teach AI about products and materials you use",
      icon: Package,
      capabilityKey: "hasKnowledgeBase",
      modulesToEnable: ["knowledge_base"],
    },
  },

  // ── Sales Sections ──
  {
    sectionId: "sales-inventory",
    tab: "services",
    isRelevant: (caps) => caps.isSalesBusiness && caps.hasSalesInventory,
    addOn: {
      id: "sales-inventory",
      title: "Sales Inventory",
      description: "Enable to manage product inventory for AI reference",
      icon: Warehouse,
      capabilityKey: "hasSalesInventory",
      modulesToEnable: ["sales_inventory"],
    },
  },
  {
    sectionId: "sales-policies",
    tab: "policies",
    isRelevant: (caps) => caps.isSalesBusiness,
    addOn: {
      id: "sales-policies",
      title: "Sales Policies",
      description: "Enable for sales-specific policies and procedures",
      icon: DollarSign,
      capabilityKey: "hasSalesLeads",
      modulesToEnable: ["sales_leads"],
    },
  },
  {
    sectionId: "sales-knowledge",
    tab: "knowledge",
    isRelevant: (caps) => caps.isSalesBusiness,
    addOn: {
      id: "sales-knowledge",
      title: "Sales Knowledge",
      description: "Enable for product knowledge and sales scripts",
      icon: DollarSign,
      capabilityKey: "hasSalesLeads",
      modulesToEnable: ["sales_leads"],
    },
  },
];

/**
 * Get all section relevance entries for a specific tab.
 */
export function getSectionRelevanceForTab(tab: BrainTab): SectionRelevance[] {
  return SECTION_RELEVANCE.filter((s) => s.tab === tab);
}
