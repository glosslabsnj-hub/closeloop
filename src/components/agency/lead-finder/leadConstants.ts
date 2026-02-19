export const SIGNAL_LABELS: Record<string, string> = {
  no_online_booking: "No Online Booking",
  small_team: "Small Team",
  high_volume: "High Call Volume",
  after_hours_demand: "After-Hours Demand",
  growth_signals: "Growing Fast",
  poor_responsiveness: "Poor Responsiveness",
  no_website: "No Website",
  outdated_website: "Outdated Website",
};

export const TECH_STACK_LABELS: Record<string, string> = {
  no_crm: "No CRM",
  no_online_booking: "No Online Booking",
  no_voicemail_transcription: "No Voicemail Transcription",
  uses_answering_service: "Uses Answering Service",
  manual_scheduling: "Manual Scheduling",
  no_mobile_app: "No Mobile App",
  outdated_website: "Outdated Website",
  no_text_messaging: "No Text Messaging",
};

export const CONTACT_METHOD_LABELS: Record<string, { label: string; emoji: string }> = {
  phone: { label: "Phone Call", emoji: "📞" },
  email: { label: "Email", emoji: "📧" },
  walk_in: { label: "Walk-In Visit", emoji: "🚶" },
  social_dm: { label: "Social Media DM", emoji: "💬" },
  linkedin: { label: "LinkedIn", emoji: "💼" },
};

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not Interested",
  converted: "Converted",
  skipped: "Skipped",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  contacted: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  interested: "bg-green-500/10 text-green-700 border-green-500/20",
  not_interested: "bg-muted text-muted-foreground",
  converted: "bg-primary/10 text-primary border-primary/20",
  skipped: "bg-muted text-muted-foreground",
};
