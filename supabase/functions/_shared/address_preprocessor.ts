/**
 * Address Preprocessor for Mapbox Geocoding
 * 
 * Improves geocoding accuracy by normalizing addresses before sending to Mapbox.
 * Handles cross-streets, highway routes, abbreviations, and dispatch-specific patterns.
 */

// Common street type abbreviations → expanded forms (Mapbox prefers full names)
const STREET_ABBREVIATIONS: Record<string, string> = {
  "st": "street",
  "st.": "street",
  "ave": "avenue",
  "ave.": "avenue",
  "blvd": "boulevard",
  "blvd.": "boulevard",
  "rd": "road",
  "rd.": "road",
  "dr": "drive",
  "dr.": "drive",
  "ln": "lane",
  "ln.": "lane",
  "ct": "court",
  "ct.": "court",
  "pl": "place",
  "pl.": "place",
  "cir": "circle",
  "cir.": "circle",
  "pkwy": "parkway",
  "pkwy.": "parkway",
  "hwy": "highway",
  "hwy.": "highway",
  "expy": "expressway",
  "expwy": "expressway",
  "tpke": "turnpike",
  "fwy": "freeway",
  "rt": "route",
  "rt.": "route",
  "rte": "route",
  "rte.": "route",
  "n": "north",
  "n.": "north",
  "s": "south",
  "s.": "south",
  "e": "east",
  "e.": "east",
  "w": "west",
  "w.": "west",
  "ne": "northeast",
  "nw": "northwest",
  "se": "southeast",
  "sw": "southwest",
  "mt": "mount",
  "mt.": "mount",
};

// US State abbreviations → full names
const STATE_ABBREVIATIONS: Record<string, string> = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
  "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
  "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
  "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
  "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
  "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
  "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
  "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
  "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
  "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
  "WI": "Wisconsin", "WY": "Wyoming", "DC": "Washington DC",
};

export interface PreprocessResult {
  normalized: string;
  original: string;
  modifications: string[];
  isCrossStreet: boolean;
  isHighwayRoute: boolean;
}

/**
 * Preprocess an address for better geocoding accuracy with Mapbox
 */
export function preprocessAddress(
  address: string,
  options?: {
    stateHint?: string;
    expandAbbreviations?: boolean;
  }
): PreprocessResult {
  const modifications: string[] = [];
  let normalized = address.trim();
  const original = normalized;

  // Detect address patterns
  const isCrossStreet = detectCrossStreet(normalized);
  const isHighwayRoute = detectHighwayRoute(normalized);

  // 1. Normalize cross-street separators: "Main St & Oak Ave" → "Main Street and Oak Avenue"
  if (isCrossStreet) {
    // Replace various separators with " and "
    const crossStreetPatterns = [
      { pattern: /\s*&\s*/g, replacement: " and " },
      { pattern: /\s*\/\s*/g, replacement: " and " },
      { pattern: /\s+at\s+/gi, replacement: " and " },
      { pattern: /\bcorner of\s+/gi, replacement: "" },
      { pattern: /\bintersection of\s+/gi, replacement: "" },
      { pattern: /\bnear\s+/gi, replacement: " and " },
    ];

    for (const { pattern, replacement } of crossStreetPatterns) {
      if (pattern.test(normalized)) {
        normalized = normalized.replace(pattern, replacement);
        modifications.push("normalized_cross_street");
      }
    }
  }

  // 2. Handle highway/route formats for Mapbox
  if (isHighwayRoute) {
    // "Route 539" → "State Route 539" or "US Route 539" (helps Mapbox)
    normalized = normalized
      .replace(/\brt\.?\s*(\d+)/gi, "Route $1")
      .replace(/\brte\.?\s*(\d+)/gi, "Route $1")
      .replace(/\bhwy\.?\s*(\d+)/gi, "Highway $1")
      .replace(/\bi-(\d+)/gi, "Interstate $1")
      .replace(/\bus-(\d+)/gi, "US Route $1");

    // Handle mile markers: "Route 539 mile marker 15" → "Route 539, Mile Marker 15"
    normalized = normalized
      .replace(/\bmile\s*marker\s*(\d+)/gi, ", Mile Marker $1")
      .replace(/\bmm\s*(\d+)/gi, ", Mile Marker $1");

    // Handle exits: "I-95 exit 42" → "Interstate 95, Exit 42"
    normalized = normalized.replace(/\bexit\s*(\d+)/gi, ", Exit $1");

    modifications.push("formatted_highway");
  }

  // 3. Expand street abbreviations (optional, on by default)
  if (options?.expandAbbreviations !== false) {
    const words = normalized.split(/\s+/);
    const expandedWords = words.map((word) => {
      const lowerWord = word.toLowerCase();
      if (STREET_ABBREVIATIONS[lowerWord]) {
        modifications.push(`expanded_${lowerWord}`);
        return STREET_ABBREVIATIONS[lowerWord];
      }
      return word;
    });
    normalized = expandedWords.join(" ");
  }

  // 4. Add state hint if address doesn't have one
  if (options?.stateHint) {
    const hasState = detectStateInAddress(normalized);
    if (!hasState) {
      normalized = `${normalized}, ${options.stateHint}`;
      modifications.push("added_state_hint");
    }
  }

  // 5. Clean up extra spaces and punctuation
  normalized = normalized
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*$/g, "")
    .trim();

  return {
    normalized,
    original,
    modifications,
    isCrossStreet,
    isHighwayRoute,
  };
}

/**
 * Detect if an address contains a cross-street pattern
 */
export function detectCrossStreet(address: string): boolean {
  const lowerAddr = address.toLowerCase();
  const patterns = [
    / and (?!co|inc|llc|ltd)/i, // "Main and Oak" but not "Smith and Co"
    / & /,
    /\//,       // "Main / Oak"
    / at /,     // "Main at Oak"
    /corner of/i,
    /intersection of/i,
  ];
  return patterns.some((p) => p.test(lowerAddr));
}

/**
 * Detect if an address contains highway/route patterns
 */
export function detectHighwayRoute(address: string): boolean {
  const lowerAddr = address.toLowerCase();
  const patterns = [
    /\broute\s+\d+/i,
    /\brt\.?\s*\d+/i,
    /\brte\.?\s*\d+/i,
    /\bhwy\.?\s*\d+/i,
    /\bhighway\s+\d+/i,
    /\bi-\d+/i,      // Interstate
    /\bus-\d+/i,     // US route
    /\bmile\s*marker/i,
    /\bmm\s*\d+/i,
    /\bexit\s+\d+/i,
    /\bturnpike/i,
    /\bparkway/i,
    /\bexpressway/i,
  ];
  return patterns.some((p) => p.test(lowerAddr));
}

/**
 * Detect if address already contains a state reference
 */
export function detectStateInAddress(address: string): boolean {
  // Check for state abbreviations like ", NJ" or " NJ "
  const stateAbbrPattern = /,?\s*\b([A-Z]{2})\b(?:\s|,|$)/;
  const match = address.match(stateAbbrPattern);
  if (match && STATE_ABBREVIATIONS[match[1]]) {
    return true;
  }

  // Check for full state names
  const fullNames = Object.values(STATE_ABBREVIATIONS);
  const lowerAddr = address.toLowerCase();
  return fullNames.some((name) => lowerAddr.includes(name.toLowerCase()));
}

/**
 * Get the full state name from abbreviation
 */
export function expandStateAbbreviation(abbr: string): string | null {
  return STATE_ABBREVIATIONS[abbr.toUpperCase()] || null;
}
