export const RESELLER_INDUSTRIES = [
  { value: "marketing agency", label: "Marketing Agency" },
  { value: "digital marketing", label: "Digital Marketing" },
  { value: "seo ppc", label: "SEO / PPC Agency" },
  { value: "social media agency", label: "Social Media Agency" },
  { value: "bpo call center", label: "BPO / Call Center" },
  { value: "saas reseller", label: "SaaS Reseller" },
  { value: "it consultant", label: "IT Consultant" },
  { value: "business coach", label: "Business Coach" },
  { value: "web dev agency", label: "Web Dev Agency" },
  { value: "branding agency", label: "Branding Agency" },
  { value: "crm consultant", label: "CRM Consultant" },
  { value: "telecom reseller", label: "Telecom Reseller" },
  { value: "franchise consultant", label: "Franchise Consultant" },
];

export const PARTNERSHIP_SIGNAL_LABELS: Record<string, string> = {
  existing_smb_clients: "Existing SMB Clients",
  digital_services: "Digital Services Portfolio",
  recurring_revenue: "Recurring Revenue Model",
  local_focus: "Local Business Focus",
  tech_savvy: "Tech-Savvy Operations",
  growth_stage: "Growth Stage",
  complementary_services: "Complementary Services",
  active_referral_program: "Active Referral Program",
};

export const RESELLER_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not Interested",
  partner: "Partner",
  skipped: "Skipped",
};

export const RESELLER_STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  contacted: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  interested: "bg-green-500/10 text-green-700 border-green-500/20",
  not_interested: "bg-muted text-muted-foreground",
  partner: "bg-primary/10 text-primary border-primary/20",
  skipped: "bg-muted text-muted-foreground",
};
