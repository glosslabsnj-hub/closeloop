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
