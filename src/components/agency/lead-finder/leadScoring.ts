/**
 * Agency Lead Scoring Engine
 * 
 * Scores prospective businesses on their likelihood to convert to CloseLoop customers.
 * Hot leads = high pain, high urgency, high fit. Cold leads = low pain or poor fit.
 *
 * 12 weighted factors (max ~130 raw, clamped to 100):
 *  1. Friction signal density     (0-25)  — more friction = more pain = hotter
 *  2. No online booking           (0-15)  — single strongest conversion indicator
 *  3. Review volume               (0-12)  — more reviews = more call volume = more need
 *  4. Rating sweet spot           (0-10)  — 3.0-4.5 = good but struggling; 4.5+ = less urgency
 *  5. After-hours demand          (0-10)  — missing calls outside hours
 *  6. Growth signals              (0-10)  — growing fast, likely overwhelmed
 *  7. Small team indicator        (0-8)   — fewer staff = more missed calls
 *  8. High-volume industry        (0-10)  — some industries just get more calls
 *  9. Missed call percentage      (0-12)  — estimated missed calls (NEW)
 * 10. Tech stack signals          (0-10)  — no CRM, answering service, etc. (NEW)
 * 11. Established business        (0-5)   — years in business (NEW)
 * 12. Owner intel available       (0-3)   — personalized outreach possible (NEW)
 */

export type LeadTemperature = "hot" | "warm" | "cold";

export interface ScoredLead {
  temperature: LeadTemperature;
  score: number;
  reasons: string[];
}

const HIGH_VOLUME_INDUSTRIES = new Set([
  "towing", "plumber", "hvac", "electrician", "locksmith",
  "auto repair", "dental", "med spa", "pest control", "roofing",
  "restaurant", "veterinary", "cleaning service",
]);

export function scoreAgencyLead(lead: {
  friction_signals?: string[];
  rating?: number | null;
  review_count?: number | null;
  phone?: string | null;
  website?: string | null;
  industry?: string;
  estimated_missed_call_pct?: number | null;
  tech_stack_signals?: string[];
  years_in_business?: number | null;
  owner_name?: string | null;
}): ScoredLead {
  let score = 0;
  const reasons: string[] = [];
  const signals = new Set(lead.friction_signals ?? []);
  const techSignals = new Set(lead.tech_stack_signals ?? []);

  // --- Factor 1: Friction signal density (0-25) ---
  const signalCount = signals.size;
  if (signalCount >= 4) {
    score += 25;
    reasons.push("Multiple pain points detected");
  } else if (signalCount >= 3) {
    score += 20;
    reasons.push("Several friction signals");
  } else if (signalCount >= 2) {
    score += 14;
    reasons.push("Some friction signals");
  } else if (signalCount >= 1) {
    score += 7;
  }

  // --- Factor 2: No online booking (0-15) ---
  if (signals.has("no_online_booking")) {
    score += 15;
    reasons.push("No online booking system — highest conversion indicator");
  }

  // --- Factor 3: Review volume (0-12) ---
  const reviews = lead.review_count ?? 0;
  if (reviews >= 200) {
    score += 12;
    reasons.push(`High review volume (${reviews}) — likely high call volume`);
  } else if (reviews >= 80) {
    score += 9;
    reasons.push(`Strong review presence (${reviews} reviews)`);
  } else if (reviews >= 30) {
    score += 5;
    reasons.push(`Moderate review count (${reviews})`);
  } else if (reviews > 0) {
    score += 2;
  }

  // --- Factor 4: Rating sweet spot (0-10) ---
  const rating = lead.rating ?? 0;
  if (rating >= 3.0 && rating < 4.5) {
    score += 10;
    reasons.push(`Rating ${rating}★ — good service but room for improvement in responsiveness`);
  } else if (rating >= 4.5 && rating < 4.8) {
    score += 7;
    reasons.push(`Rating ${rating}★ — strong reputation, AI can maintain it`);
  } else if (rating >= 4.8) {
    score += 4;
  } else if (rating > 0) {
    score += 3;
  }

  // --- Factor 5: After-hours demand (0-10) ---
  if (signals.has("after_hours_demand")) {
    score += 10;
    reasons.push("After-hours demand — missing calls outside business hours");
  }

  // --- Factor 6: Growth signals (0-10) ---
  if (signals.has("growth_signals")) {
    score += 10;
    reasons.push("Showing growth signals — likely overwhelmed with volume");
  }

  // --- Factor 7: Small team (0-8) ---
  if (signals.has("small_team")) {
    score += 8;
    reasons.push("Small team — likely can't answer every call");
  }

  // --- Factor 8: High-volume industry (0-10) ---
  if (lead.industry && HIGH_VOLUME_INDUSTRIES.has(lead.industry)) {
    score += 10;
    reasons.push("High call-volume industry");
  }

  // --- Factor 9: Estimated missed call % (0-12) --- NEW
  const missedPct = lead.estimated_missed_call_pct ?? 0;
  if (missedPct >= 30) {
    score += 12;
    reasons.push(`Est. ${missedPct}% missed calls — significant revenue leakage`);
  } else if (missedPct >= 20) {
    score += 9;
    reasons.push(`Est. ${missedPct}% missed calls — noticeable gap`);
  } else if (missedPct >= 10) {
    score += 5;
    reasons.push(`Est. ${missedPct}% missed calls`);
  }

  // --- Factor 10: Tech stack signals (0-10) --- NEW
  if (techSignals.has("uses_answering_service")) {
    score += 10;
    reasons.push("Already paying for call coverage — easy upgrade sell");
  } else if (techSignals.has("no_crm")) {
    score += 8;
    reasons.push("No CRM system — losing leads to disorganization");
  } else if (techSignals.has("manual_scheduling")) {
    score += 6;
    reasons.push("Manual scheduling — ripe for automation");
  } else if (techSignals.size > 0) {
    score += 4;
  }

  // --- Factor 11: Established business (0-5) --- NEW
  const years = lead.years_in_business ?? 0;
  if (years >= 5) {
    score += 5;
    reasons.push(`${years}+ years in business — established, can afford solution`);
  } else if (years >= 2) {
    score += 3;
  }

  // --- Factor 12: Owner intel available (0-3) --- NEW
  if (lead.owner_name) {
    score += 3;
    reasons.push("Owner name known — personalized outreach possible");
  }

  // Bonus: Has phone number (we can actually reach them)
  if (lead.phone) {
    score += 3;
  }

  // Penalty: No website and no phone = hard to verify/reach
  if (!lead.website && !lead.phone) {
    score = Math.max(0, score - 10);
    reasons.push("No website or phone — difficult to reach");
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  let temperature: LeadTemperature;
  if (score >= 60) {
    temperature = "hot";
  } else if (score >= 35) {
    temperature = "warm";
  } else {
    temperature = "cold";
  }

  return { temperature, score, reasons };
}

export function getTemperatureColor(temp: LeadTemperature) {
  switch (temp) {
    case "hot": return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400";
    case "warm": return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
    case "cold": return "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400";
  }
}

export function getTemperatureIcon(temp: LeadTemperature) {
  switch (temp) {
    case "hot": return "🔥";
    case "warm": return "🌤";
    case "cold": return "❄️";
  }
}
