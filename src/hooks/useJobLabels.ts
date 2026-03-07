import { useMemo } from "react";
import { useTenantConfig } from "./useTenantConfig";

export interface JobLabels {
  pageTitle: string;
  singularJob: string;
  pluralJobs: string;
  serviceStep: string;
  serviceSteps: string;
  metadataFields: { key: string; label: string; placeholder: string }[];
  emptyStateMessage: string;
}

const LABEL_PRESETS: Record<string, Omit<JobLabels, "metadataFields"> & { metadataFields: { key: string; label: string; placeholder: string }[] }> = {
  "auto-repair": {
    pageTitle: "Vehicles In Shop",
    singularJob: "Vehicle",
    pluralJobs: "Vehicles",
    serviceStep: "Service",
    serviceSteps: "Services",
    metadataFields: [
      { key: "year", label: "Year", placeholder: "2019" },
      { key: "make", label: "Make", placeholder: "Honda" },
      { key: "model", label: "Model", placeholder: "Civic" },
      { key: "vin", label: "VIN", placeholder: "1HGBH41JXMN109186" },
    ],
    emptyStateMessage: "No vehicles in the shop right now.",
  },
  "body-shop": {
    pageTitle: "Vehicles In Shop",
    singularJob: "Vehicle",
    pluralJobs: "Vehicles",
    serviceStep: "Repair Step",
    serviceSteps: "Repair Steps",
    metadataFields: [
      { key: "year", label: "Year", placeholder: "2021" },
      { key: "make", label: "Make", placeholder: "Toyota" },
      { key: "model", label: "Model", placeholder: "Camry" },
      { key: "insurance_claim", label: "Claim #", placeholder: "CLM-12345" },
    ],
    emptyStateMessage: "No vehicles in the shop right now.",
  },
  salon: {
    pageTitle: "Active Clients",
    singularJob: "Client",
    pluralJobs: "Clients",
    serviceStep: "Treatment",
    serviceSteps: "Treatments",
    metadataFields: [],
    emptyStateMessage: "No active clients right now.",
  },
  "computer-repair": {
    pageTitle: "Devices In Service",
    singularJob: "Device",
    pluralJobs: "Devices",
    serviceStep: "Repair",
    serviceSteps: "Repairs",
    metadataFields: [
      { key: "device_type", label: "Device Type", placeholder: "Laptop" },
      { key: "brand", label: "Brand", placeholder: "Dell" },
      { key: "serial", label: "Serial #", placeholder: "SN-12345" },
    ],
    emptyStateMessage: "No devices in service right now.",
  },
  hvac: {
    pageTitle: "Service Calls",
    singularJob: "Service Call",
    pluralJobs: "Service Calls",
    serviceStep: "Task",
    serviceSteps: "Tasks",
    metadataFields: [
      { key: "equipment_type", label: "Equipment", placeholder: "Central AC" },
      { key: "address", label: "Address", placeholder: "123 Main St" },
    ],
    emptyStateMessage: "No active service calls.",
  },
  plumbing: {
    pageTitle: "Service Calls",
    singularJob: "Service Call",
    pluralJobs: "Service Calls",
    serviceStep: "Task",
    serviceSteps: "Tasks",
    metadataFields: [
      { key: "issue_type", label: "Issue", placeholder: "Leak repair" },
      { key: "address", label: "Address", placeholder: "123 Main St" },
    ],
    emptyStateMessage: "No active service calls.",
  },
  "dry-cleaning": {
    pageTitle: "Items In Process",
    singularJob: "Order",
    pluralJobs: "Orders",
    serviceStep: "Step",
    serviceSteps: "Steps",
    metadataFields: [
      { key: "item_count", label: "Item Count", placeholder: "5" },
      { key: "garment_type", label: "Garment Type", placeholder: "Suits" },
    ],
    emptyStateMessage: "No items being processed right now.",
  },
  tailor: {
    pageTitle: "Alterations In Progress",
    singularJob: "Alteration",
    pluralJobs: "Alterations",
    serviceStep: "Step",
    serviceSteps: "Steps",
    metadataFields: [
      { key: "garment_type", label: "Garment", placeholder: "Wedding dress" },
    ],
    emptyStateMessage: "No alterations in progress.",
  },
  general_contractor: {
    pageTitle: "Active Projects",
    singularJob: "Project",
    pluralJobs: "Projects",
    serviceStep: "Phase",
    serviceSteps: "Phases",
    metadataFields: [
      { key: "project_type", label: "Project Type", placeholder: "Kitchen Remodel" },
      { key: "property_type", label: "Property Type", placeholder: "House" },
      { key: "address", label: "Address", placeholder: "123 Main St" },
    ],
    emptyStateMessage: "No active projects right now.",
  },
  roofing: {
    pageTitle: "Active Projects",
    singularJob: "Project",
    pluralJobs: "Projects",
    serviceStep: "Task",
    serviceSteps: "Tasks",
    metadataFields: [
      { key: "roof_type", label: "Roof Type", placeholder: "Asphalt shingles" },
      { key: "address", label: "Address", placeholder: "123 Main St" },
    ],
    emptyStateMessage: "No active roofing projects.",
  },
  cleaning: {
    pageTitle: "Active Jobs",
    singularJob: "Cleaning Job",
    pluralJobs: "Cleaning Jobs",
    serviceStep: "Area",
    serviceSteps: "Areas",
    metadataFields: [
      { key: "property_type", label: "Property Type", placeholder: "House" },
      { key: "address", label: "Address", placeholder: "123 Main St" },
    ],
    emptyStateMessage: "No active cleaning jobs.",
  },
  painting: {
    pageTitle: "Active Jobs",
    singularJob: "Paint Job",
    pluralJobs: "Paint Jobs",
    serviceStep: "Area",
    serviceSteps: "Areas",
    metadataFields: [
      { key: "area", label: "Area", placeholder: "Living room" },
      { key: "address", label: "Address", placeholder: "123 Main St" },
    ],
    emptyStateMessage: "No active paint jobs.",
  },
  flooring: {
    pageTitle: "Active Projects",
    singularJob: "Project",
    pluralJobs: "Projects",
    serviceStep: "Phase",
    serviceSteps: "Phases",
    metadataFields: [
      { key: "floor_type", label: "Floor Type", placeholder: "Hardwood" },
      { key: "sq_footage", label: "Sq. Footage", placeholder: "500" },
    ],
    emptyStateMessage: "No active flooring projects.",
  },
};

const DEFAULT_LABELS: JobLabels = {
  pageTitle: "Active Jobs",
  singularJob: "Job",
  pluralJobs: "Jobs",
  serviceStep: "Step",
  serviceSteps: "Steps",
  metadataFields: [],
  emptyStateMessage: "No active jobs right now.",
};

export function useJobLabels(): JobLabels {
  const { industrySlug } = useTenantConfig();

  return useMemo(() => {
    if (!industrySlug) return DEFAULT_LABELS;

    // Try exact match first
    if (LABEL_PRESETS[industrySlug]) {
      return LABEL_PRESETS[industrySlug];
    }

    // Try partial matches for common industry groups
    const slug = industrySlug.toLowerCase();
    if (slug.includes("auto") || slug.includes("tire") || slug.includes("brake") || slug.includes("transmission") || slug.includes("muffler") || slug.includes("oil-change")) {
      return LABEL_PRESETS["auto-repair"];
    }
    if (slug.includes("salon") || slug.includes("spa") || slug.includes("barber") || slug.includes("nail")) {
      return LABEL_PRESETS["salon"];
    }
    if (slug.includes("computer") || slug.includes("phone-repair") || slug.includes("electronics")) {
      return LABEL_PRESETS["computer-repair"];
    }
    if (slug.includes("plumb")) {
      return LABEL_PRESETS["plumbing"];
    }
    if (slug.includes("hvac") || slug.includes("electrical")) {
      return LABEL_PRESETS["hvac"];
    }
    if (slug.includes("general_contractor") || slug.includes("contractor") || slug.includes("remodel")) {
      return LABEL_PRESETS["general_contractor"];
    }
    if (slug.includes("roofing") || slug.includes("roof")) {
      return LABEL_PRESETS["roofing"];
    }
    if (slug.includes("clean")) {
      return LABEL_PRESETS["cleaning"];
    }
    if (slug.includes("paint")) {
      return LABEL_PRESETS["painting"];
    }
    if (slug.includes("floor")) {
      return LABEL_PRESETS["flooring"];
    }

    return DEFAULT_LABELS;
  }, [industrySlug]);
}
