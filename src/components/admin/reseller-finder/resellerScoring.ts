/**
 * Reseller/Agency Lead Scoring Engine
 *
 * Scores prospective agencies/consultants on their likelihood to become good channel partners.
 *
 * 7 weighted factors (max 100 points):
 *  1. Existing client base      (0-25) — more SMB clients = bigger channel opportunity
 *  2. Digital services overlap   (0-20) — offers complementary digital services
 *  3. Recurring revenue model    (0-15) — already understands MRR/subscription
 *  4. Local business focus       (0-15) — targets local/SMB market
 *  5. Company size               (0-10) — sweet spot: 5-50 employees
 *  6. Digital presence           (0-10) — strong web presence = credible partner
 *  7. Review quality             (0-5)  — good reviews = quality partner
 */

export type ResellerTemperature = "hot" | "warm" | "cold";

export interface ScoredReseller {
  temperature: ResellerTemperature;
  score: number;
  reasons: string[];
}

export function scoreResellerLead(lead: {
  partnership_signals?: string[];
  rating?: number | null;
  review_count?: number | null;
  client_base_size?: string | null;
  services_offered?: string[];
  employee_estimate?: string | null;
  website?: string | null;
}): ScoredReseller {
  let score = 0;
  const reasons: string[] = [];
  const signals = new Set(lead.partnership_signals ?? []);

  // --- Factor 1: Existing client base (0-25) ---
  if (signals.has("existing_smb_clients")) {
    const size = lead.client_base_size?.toLowerCase() ?? "";
    if (size.includes("100+") || size.includes("large")) {
      score += 25;
      reasons.push("Large existing SMB client base");
    } else if (size.includes("50") || size.includes("medium")) {
      score += 20;
      reasons.push("Strong existing SMB client base");
    } else {
      score += 15;
      reasons.push("Has existing SMB clients");
    }
  }

  // --- Factor 2: Digital services overlap (0-20) ---
  if (signals.has("digital_services")) {
    score += 15;
    reasons.push("Offers complementary digital services");
  }
  if (signals.has("complementary_services")) {
    score += 5;
    reasons.push("Services complement Flux Receptionist offering");
  }

  // --- Factor 3: Recurring revenue model (0-15) ---
  if (signals.has("recurring_revenue")) {
    score += 15;
    reasons.push("Already operates on recurring revenue model");
  }

  // --- Factor 4: Local business focus (0-15) ---
  if (signals.has("local_focus")) {
    score += 15;
    reasons.push("Focuses on local/SMB market — ideal target overlap");
  }

  // --- Factor 5: Company size (0-10) ---
  const empStr = lead.employee_estimate?.toLowerCase() ?? "";
  if (empStr.includes("10") || empStr.includes("20") || empStr.includes("5-")) {
    score += 10;
    reasons.push("Right-sized team for active partnership");
  } else if (empStr.includes("50") || empStr.includes("100")) {
    score += 7;
    reasons.push("Established company with capacity");
  } else if (empStr) {
    score += 4;
  }

  // --- Factor 6: Digital presence (0-10) ---
  if (lead.website) {
    score += 5;
    if (signals.has("tech_savvy")) {
      score += 5;
      reasons.push("Strong digital presence and tech-savvy");
    }
  }

  // --- Factor 7: Review quality (0-5) ---
  const rating = lead.rating ?? 0;
  if (rating >= 4.5) {
    score += 5;
    reasons.push(`${rating} star rating — high-quality partner`);
  } else if (rating >= 4.0) {
    score += 3;
  }

  // Bonus: Growth stage
  if (signals.has("growth_stage")) {
    score += 5;
    reasons.push("In growth stage — motivated to add revenue streams");
  }

  // Bonus: Active referral program
  if (signals.has("active_referral_program")) {
    score += 5;
    reasons.push("Already runs referral/partner programs");
  }

  score = Math.max(0, Math.min(100, score));

  let temperature: ResellerTemperature;
  if (score >= 60) temperature = "hot";
  else if (score >= 35) temperature = "warm";
  else temperature = "cold";

  return { temperature, score, reasons };
}

export function getResellerTemperatureColor(temp: ResellerTemperature) {
  switch (temp) {
    case "hot": return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400";
    case "warm": return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
    case "cold": return "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400";
  }
}

export function getResellerTemperatureIcon(temp: ResellerTemperature) {
  switch (temp) {
    case "hot": return "\uD83D\uDD25";
    case "warm": return "\uD83C\uDF24";
    case "cold": return "\u2744\uFE0F";
  }
}
