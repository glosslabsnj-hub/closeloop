/**
 * Shared test utilities for extraction tests across all business modes
 */

// ============================================================================
// MOCK TYPES
// ============================================================================

export interface TranscriptEntry {
  role: "user" | "agent";
  message: string;
  timestamp?: number;
}

export interface ParsedOrderResult {
  items: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }>;
  totalCents: number | null;
}

export interface ServiceExtractionResult {
  service_requested?: string;
  preferred_date?: string;
  preferred_time?: string;
  callback_requested?: boolean;
  vehicle?: string;
  address?: string;
  customer_name?: string;
}

export interface DispatchExtractionResult {
  job_type?: string;
  pickup_address?: string;
  dropoff_address?: string;
  vehicle?: string;
  urgency?: string;
  is_drivable?: boolean;
  customer_name?: string;
}

export interface MedicalExtractionResult {
  is_new_patient?: boolean;
  appointment_type?: string;
  preferred_date?: string;
  urgency?: string;
  callback_requested?: boolean;
  customer_name?: string;
  // PHI fields should NOT be present
  symptoms?: string;
  medical_details?: string;
}

export interface GeneralExtractionResult {
  message_requested?: boolean;
  callback_requested?: boolean;
  callback_number?: string;
  customer_name?: string;
  service_requested?: string;
  reason?: string;
}

// ============================================================================
// FOOD EXTRACTION (copy from index.ts)
// ============================================================================

export function parseNaturalLanguageItems(
  rawText: string,
  transcript?: TranscriptEntry[]
): ParsedOrderResult {
  const items: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }> = [];
  
  const customerText = transcript
    ? transcript.filter(t => t.role === "user").map(t => t.message).join(" ")
    : rawText;
  
  const allText = transcript
    ? transcript.map(t => t.message).join(" ")
    : rawText;
  
  // ============================================================================
  // ITALIAN CUISINE PATTERNS
  // ============================================================================
  
  const pizzaTypes = "margherita|margarita|pepperoni|cheese|hawaiian|veggie|vegetarian|meat ?lovers?|supreme|quattro ?formaggi|buffalo|bbq|mushroom|sausage|white|plain|sicilian|neapolitan";
  const pizzaSizes = "(?:extra[ -]?large|x-?large|xl|large|medium|small|personal)?";
  
  // ============================================================================
  // ASIAN CUISINE PATTERNS
  // ============================================================================
  
  const sushiRolls = "california|spicy tuna|salmon|dragon|rainbow|philadelphia|spider|eel|shrimp tempura|alaska|boston|dynamite|tiger|caterpillar|crunch";
  const asianSoups = "miso|wonton|egg drop|hot and sour|tom yum|pho";
  const asianNoodles = "pad thai|lo mein|chow mein|fried rice|ramen|udon|yakisoba|singapore noodles";
  const asianChicken = "general tso|orange|kung pao|sesame|teriyaki|sweet and sour|lemon|cashew|mongolian";
  const asianSides = "spring roll|egg roll|summer roll|edamame|gyoza|potsticker|dumpling|crab rangoon|tempura";
  
  // ============================================================================
  // MEXICAN CUISINE PATTERNS
  // ============================================================================
  
  const tacoTypes = "al pastor|carnitas|asada|carne asada|pollo|chicken|fish|shrimp|birria|barbacoa|lengua|chorizo";
  const mexicanMains = "burrito|quesadilla|enchilada|tostada|chimichanga|fajita|tamale|taco|nachos|torta|bowl";
  const mexicanSides = "chips|guacamole|guac|salsa|queso|rice|beans|elote|corn";
  
  // ============================================================================
  // AMERICAN CASUAL PATTERNS
  // ============================================================================
  
  const burgerTypes = "double|triple|single|classic|bacon|mushroom|swiss|deluxe|western|bbq";
  const chickenItems = "tenders?|nuggets?|strips?|fingers?|wings?|sandwich";
  const americanSides = "fries|onion rings|mozzarella sticks|mac and cheese|coleslaw|tots|loaded fries";
  
  // ============================================================================
  // BAKERY/CAFE PATTERNS
  // ============================================================================
  
  const coffeeTypes = "latte|cappuccino|americano|espresso|macchiato|mocha|cold brew|iced coffee|drip coffee|flat white";
  const pastryTypes = "croissant|muffin|scone|bagel|danish|donut|doughnut|cinnamon roll|brownie|cookie";
  const teaTypes = "black|green|chai|iced|earl grey|chamomile|matcha|herbal|jasmine|oolong";
  
  const foodPatterns: Array<{ pattern: RegExp; formatFn: ((match: string) => string) | null; category?: string }> = [
    // Italian - Pizza (suffix optional)
    { 
      pattern: new RegExp(`(\\d*)\\s*${pizzaSizes}\\s*(${pizzaTypes})(?:\\s*pizza)?`, "gi"), 
      formatFn: (match: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        const hasWord = cleaned.toLowerCase().includes("pizza");
        const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        return hasWord ? capitalized : capitalized + " Pizza";
      },
      category: "italian"
    },
    // Italian - Pasta
    { 
      pattern: /(\d*)\s*(spaghetti|fettuccine|penne|lasagna|ravioli|linguine|rigatoni|gnocchi|tortellini|manicotti)\s*(?:alla\s*)?(carbonara|alfredo|bolognese|marinara|arrabbiata|puttanesca|primavera)?/gi, 
      formatFn: null,
      category: "italian"
    },
    // Italian - Appetizers/Desserts
    {
      pattern: /(\d*)\s*(bruschetta|garlic bread|breadsticks?|calamari|mozzarella sticks?|caesar salad|garden salad|soup|tiramisu|cannoli|cheesecake|gelato|antipasto)/gi,
      formatFn: null,
      category: "italian"
    },
    
    // Asian - Sushi rolls
    {
      pattern: new RegExp(`(\\d*)\\s*(${sushiRolls})(?:\\s*roll)?`, "gi"),
      formatFn: (match: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        const hasRoll = cleaned.toLowerCase().includes("roll");
        const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        return hasRoll ? capitalized : capitalized + " Roll";
      },
      category: "asian"
    },
  // Asian - Soups - pattern needs to match "miso" or "miso soup"
  {
    pattern: new RegExp(`(\\d*)\\s*(?:${asianSoups})(?:\\s*soup)?`, "gi"),
    formatFn: (match: string) => {
      const cleaned = match.replace(/^\d+\s*/, "").trim();
      const hasSoup = cleaned.toLowerCase().includes("soup");
      const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      return hasSoup ? capitalized : capitalized + " Soup";
    },
    category: "asian"
  },
  // Asian - Noodles/Rice - must include standalone fried rice
  {
    pattern: new RegExp(`(\\d*)\\s*(?:chicken|beef|shrimp|veggie|vegetable)?\\s*(${asianNoodles})`, "gi"),
    formatFn: null,
    category: "asian"
  },
    // Asian - Chicken dishes
    {
      pattern: new RegExp(`(\\d*)\\s*(${asianChicken})(?:\\s*chicken)?`, "gi"),
      formatFn: (match: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        const hasChicken = cleaned.toLowerCase().includes("chicken");
        const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        return hasChicken ? capitalized : capitalized + " Chicken";
      },
      category: "asian"
    },
    // Asian - Sides/Appetizers
    {
      pattern: new RegExp(`(\\d*)\\s*(${asianSides})s?`, "gi"),
      formatFn: null,
      category: "asian"
    },
    
    // Mexican - Tacos
    {
      pattern: new RegExp(`(\\d*)\\s*tacos?(?:\\s+(?:${tacoTypes}))?`, "gi"),
      formatFn: null,
      category: "mexican"
    },
    // Mexican - Mains - needs word boundary to match quesadilla properly
    {
      pattern: new RegExp(`(\\d*)\\s*(?:chicken|beef|cheese|veggie)?\\s*(${mexicanMains})`, "gi"),
      formatFn: null,
      category: "mexican"
    },
    // Mexican - Sides
    {
      pattern: new RegExp(`(\\d*)\\s*(${mexicanSides})`, "gi"),
      formatFn: null,
      category: "mexican"
    },
    
    // American - Burgers
    {
      pattern: new RegExp(`(\\d*)\\s*(?:${burgerTypes})?\\s*(?:cheese)?burger`, "gi"),
      formatFn: (match: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      },
      category: "american"
    },
    // American - Chicken
    {
      pattern: new RegExp(`(\\d*)\\s*(?:\\d+\\s*)?(?:piece|pc)?\\s*chicken\\s*(${chickenItems})`, "gi"),
      formatFn: null,
      category: "american"
    },
    // American - Wings standalone
    {
      pattern: /(\d+)\s*(?:piece|pc)?\s*(?:buffalo|hot|mild|bbq|garlic parmesan)?\s*wings?/gi,
      formatFn: null,
      category: "american"
    },
    // American - Sides
    {
      pattern: new RegExp(`(\\d*)\\s*(${americanSides})`, "gi"),
      formatFn: null,
      category: "american"
    },
    // American - Hot dogs
    {
      pattern: /(\d*)\s*(hot ?dog|corn ?dog|pretzel)/gi,
      formatFn: null,
      category: "american"
    },
    
    // Bakery - Coffee
    {
      pattern: new RegExp(`(\\d*)\\s*(?:large|medium|small)?\\s*(${coffeeTypes})`, "gi"),
      formatFn: null,
      category: "bakery"
    },
    // Bakery - Pastries
    {
      pattern: new RegExp(`(\\d*)\\s*(${pastryTypes})s?`, "gi"),
      formatFn: null,
      category: "bakery"
    },
    // Bakery - Tea
    {
      pattern: new RegExp(`(\\d*)\\s*(${teaTypes})\\s*tea`, "gi"),
      formatFn: null,
      category: "bakery"
    },
    
    // Generic Drinks
    { 
      pattern: /(?:(\d+)\s+)?(?:(two[ -]?liter|2[ -]?liter|liter|bottle|can|large|medium|small)\s+)?(pepsi|coke|coca[ -]?cola|sprite|dr\.?\s*pepper|fanta|7[ -]?up|root ?beer|ginger ?ale|water|lemonade|iced?\s*tea|sweet\s*tea|orange juice|apple juice|milk)/gi, 
      formatFn: (match: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      },
      category: "drinks"
    },
    
    // General items with quantities
    { pattern: /(\d+)\s*(piece|order|serving)s?\s+(?:of\s+)?(\w+)/gi, formatFn: null },
  ];
  
  const seenItems = new Set<string>();
  
  for (const { pattern, formatFn } of foodPatterns) {
    const matches = customerText.matchAll(pattern);
    for (const match of matches) {
      const qty = parseInt(match[1]) || 1;
      let itemName: string;
      
      if (formatFn) {
        itemName = formatFn(match[0]);
      } else {
        itemName = match[0].replace(/^\d+\s*/, "").trim();
        itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
      }
      
      const normalizedName = itemName.toLowerCase().replace(/\s+/g, " ");
      if (itemName.length > 2 && !seenItems.has(normalizedName)) {
        seenItems.add(normalizedName);
        items.push({ name: itemName, qty });
      }
    }
  }
  
  // Modifiers
  const modifierPatterns = [
    /(?:with|add|extra|no|light|heavy)\s+(?:extra\s+)?(garlic|cheese|onions?|peppers?|mushrooms?|olives?|bacon|anchovies|jalape[ñn]os?|pineapple|tomatoes?|sour cream|lettuce|guacamole|avocado|spicy mayo|sriracha)/gi,
    /cooked?\s+(well done|medium|rare)/gi,
    /(?:gluten[ -]?free|dairy[ -]?free|vegetarian|vegan|keto|low carb)/gi,
    /(?:mild|medium|hot|extra hot|no spice)/gi,
  ];
  
  if (items.length > 0) {
    const modifiers: string[] = [];
    for (const pattern of modifierPatterns) {
      const matches = customerText.matchAll(pattern);
      for (const match of matches) {
        modifiers.push(match[0].trim());
      }
    }
    if (modifiers.length > 0) {
      items[0].modifiers = modifiers;
    }
  }
  
  if (items.length === 0 && rawText && !rawText.includes("to place an order")) {
    items.push({ name: rawText.substring(0, 100), qty: 1 });
  }
  
  // Total extraction
  const totalPatterns = [
    /(?:total|total is|comes to|that(?:'ll| will) be|that's|your order is)\s*\$?(\d+(?:\.\d{2})?)/i,
    /\$(\d+(?:\.\d{2})?)\s*(?:total|altogether|in total)/i,
  ];
  
  let totalCents: number | null = null;
  for (const pattern of totalPatterns) {
    const totalMatch = allText.match(pattern);
    if (totalMatch) {
      const amount = parseFloat(totalMatch[1]);
      if (amount > 0 && amount < 10000) {
        totalCents = Math.round(amount * 100);
        break;
      }
    }
  }
  
  return { items, totalCents };
}

// ============================================================================
// SERVICE MODE EXTRACTION
// ============================================================================

export function extractServiceData(transcript: TranscriptEntry[]): ServiceExtractionResult {
  const result: ServiceExtractionResult = {};
  
  const customerMessages = transcript
    .filter(t => t.role === "user")
    .map(t => t.message.toLowerCase())
    .join(" ");
  
  // Extract customer name
  const nameMatch = customerMessages.match(/(?:my name is|this is|i'm|i am|call me)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) {
    result.customer_name = nameMatch[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  
  // Extract service type
  const servicePatterns = [
    /(?:need|want|looking for|schedule|book)\s+(?:a|an)?\s*([a-z\s]+(?:service|appointment|cleaning|repair|maintenance|consultation|checkup|haircut|oil change|tune up|detail|wash))/i,
    /(?:oil change|tire rotation|brake|alignment|tune.?up|detail|wash|cut|color|trim|cleaning|repair)/i,
  ];
  
  for (const pattern of servicePatterns) {
    const match = customerMessages.match(pattern);
    if (match) {
      result.service_requested = (match[1] || match[0]).trim();
      break;
    }
  }
  
  // Extract vehicle info
  const vehicleMatch = customerMessages.match(/(?:my|for my|have a)\s+(\d{4}\s+)?([a-z]+\s+[a-z]+)/i);
  if (vehicleMatch) {
    result.vehicle = vehicleMatch[0].replace(/(?:my|for my|have a)\s+/i, "").trim();
  }
  
  // Extract preferred date - also check for standalone "tomorrow" or "today"
  const dateMatch = customerMessages.match(/(?:on|for|this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)/i);
  if (dateMatch) {
    result.preferred_date = dateMatch[1];
  }
  
  // Extract preferred time
  const timeMatch = customerMessages.match(/(?:at|around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i);
  if (timeMatch) {
    result.preferred_time = timeMatch[1];
  }
  
  // Check for callback request
  if (customerMessages.includes("call me back") || customerMessages.includes("callback") || 
      customerMessages.includes("call back") || customerMessages.includes("give me a call")) {
    result.callback_requested = true;
  }
  
  // Extract address - also match "property is at" and similar
  const addressMatch = customerMessages.match(/(?:at|is at|address is|located at|property is at)\s+(\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct|boulevard|blvd))/i);
  if (addressMatch) {
    result.address = addressMatch[1];
  }
  
  return result;
}

// ============================================================================
// DISPATCH MODE EXTRACTION
// ============================================================================

export function extractDispatchData(transcript: TranscriptEntry[]): DispatchExtractionResult {
  const result: DispatchExtractionResult = {};
  
  const customerMessages = transcript
    .filter(t => t.role === "user")
    .map(t => t.message.toLowerCase())
    .join(" ");
  
  // Extract customer name
  const nameMatch = customerMessages.match(/(?:my name is|this is|i'm|i am|call me)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) {
    result.customer_name = nameMatch[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  
  // Determine job type
  if (customerMessages.includes("tow") || customerMessages.includes("broke down") || customerMessages.includes("broken down") || customerMessages.includes("won't start") || customerMessages.includes("stalled")) {
    result.job_type = "tow";
  } else if (customerMessages.includes("jump") || customerMessages.includes("battery") || customerMessages.includes("dead battery")) {
    result.job_type = "jump_start";
  } else if (customerMessages.includes("flat") || customerMessages.includes("tire") || customerMessages.includes("blowout") || customerMessages.includes("spare")) {
    result.job_type = "tire_change";
  } else if (customerMessages.includes("lock") || customerMessages.includes("keys") || customerMessages.includes("locked out") || customerMessages.includes("locked in")) {
    result.job_type = "lockout";
  } else if (customerMessages.includes("gas") || customerMessages.includes("fuel") || customerMessages.includes("ran out")) {
    result.job_type = "fuel_delivery";
  } else if (customerMessages.includes("winch") || customerMessages.includes("stuck") || customerMessages.includes("ditch")) {
    result.job_type = "winch_out";
  }
  
  // Extract pickup address
  const pickupPatterns = [
    /(?:i'm at|i am at|located at|pick(?:ing)? (?:me )?up (?:at|from)|at)\s+(\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd|highway|hwy|exit|drive|dr|lane|ln|way|boulevard|blvd|parking lot|walmart|target|[a-z]+\s+plaza))/i,
    /(?:on|near|by)\s+(highway|interstate|i-?)?\s*(\d+)(?:\s+(?:near|by|at|exit)\s+(?:exit\s*)?(\d+|[a-z\s]+))?/i,
  ];
  
  for (const pattern of pickupPatterns) {
    const match = customerMessages.match(pattern);
    if (match) {
      result.pickup_address = match[0].replace(/(?:i'm at|i am at|located at|pick(?:ing)? (?:me )?up (?:at|from)|at|on|near|by)\s+/i, "").trim();
      break;
    }
  }
  
  // Extract dropoff address
  const dropoffMatch = customerMessages.match(/(?:to|drop(?:ping)? (?:me )?(?:off|at)|going to|destination|take (?:it|me) to)\s+(\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln))/i);
  if (dropoffMatch) {
    result.dropoff_address = dropoffMatch[1];
  }
  
  // Extract vehicle info
  const vehicleMatch = customerMessages.match(/(?:my|it's a|have a|driving a)\s+(?:(\d{4})\s+)?([a-z]+\s+[a-z]+|car|truck|suv|van|sedan|motorcycle|vehicle)/i);
  if (vehicleMatch) {
    result.vehicle = (vehicleMatch[1] ? vehicleMatch[1] + " " : "") + (vehicleMatch[2] || "");
  }
  
  // Check urgency
  const urgentWords = ["urgent", "emergency", "asap", "right away", "immediately", "stranded", "dangerous", "unsafe", "kids in the car", "side of the road"];
  if (urgentWords.some(word => customerMessages.includes(word))) {
    result.urgency = "high";
  } else if (customerMessages.includes("when you can") || customerMessages.includes("whenever") || customerMessages.includes("no rush")) {
    result.urgency = "low";
  } else {
    result.urgency = "normal";
  }
  
  // Check if drivable
  if (customerMessages.includes("won't start") || customerMessages.includes("can't drive") || 
      customerMessages.includes("not drivable") || customerMessages.includes("won't move") ||
      customerMessages.includes("broke down") || customerMessages.includes("stalled")) {
    result.is_drivable = false;
  } else if (customerMessages.includes("can drive") || customerMessages.includes("still running") ||
             customerMessages.includes("drivable")) {
    result.is_drivable = true;
  }
  
  return result;
}

// ============================================================================
// MEDICAL MODE EXTRACTION
// ============================================================================

export function extractMedicalData(transcript: TranscriptEntry[]): MedicalExtractionResult {
  const result: MedicalExtractionResult = {};
  
  const customerMessages = transcript
    .filter(t => t.role === "user")
    .map(t => t.message.toLowerCase())
    .join(" ");
  
  // Extract customer name
  const nameMatch = customerMessages.match(/(?:my name is|this is|i'm|i am|call me)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) {
    result.customer_name = nameMatch[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  
  // Check if new patient
  if (customerMessages.includes("new patient") || customerMessages.includes("first time") || 
      customerMessages.includes("never been") || customerMessages.includes("new to") ||
      customerMessages.includes("haven't been")) {
    result.is_new_patient = true;
  } else if (customerMessages.includes("existing patient") || customerMessages.includes("been before") ||
             customerMessages.includes("returning") || customerMessages.includes("follow up") ||
             customerMessages.includes("follow-up")) {
    result.is_new_patient = false;
  }
  
  // Extract appointment type (SAFE - non-PHI)
  const apptPatterns = [
    /(?:need|want|schedule|book)\s+(?:a|an|my)?\s*(annual physical|physical|checkup|check-?up|wellness visit|consultation|follow[- ]?up|routine|general|new patient)/i,
    /(annual physical|physical exam|wellness|checkup|check-?up|routine exam|follow[- ]?up|consultation)/i,
  ];
  
  for (const pattern of apptPatterns) {
    const match = customerMessages.match(pattern);
    if (match) {
      result.appointment_type = match[1].trim();
      break;
    }
  }
  
  // Extract preferred date
  const datePatterns = [
    /(?:next|this)\s+(week|monday|tuesday|wednesday|thursday|friday)/i,
    /(?:on|for)\s+(monday|tuesday|wednesday|thursday|friday)/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = customerMessages.match(pattern);
    if (match) {
      result.preferred_date = match[1];
      break;
    }
  }
  
  // Check urgency (based on request language, NOT symptoms)
  const urgentPhrases = ["urgent", "asap", "as soon as possible", "emergency", "right away", "today if possible", "severe"];
  if (urgentPhrases.some(phrase => customerMessages.includes(phrase))) {
    result.urgency = "urgent";
  }
  
  // Check for callback request
  if (customerMessages.includes("call me back") || customerMessages.includes("callback") || 
      customerMessages.includes("have someone call")) {
    result.callback_requested = true;
  }
  
  // IMPORTANT: Do NOT extract symptoms or medical details (PHI)
  // The result should NOT contain: symptoms, medical_details, conditions, medications, etc.
  
  return result;
}

// ============================================================================
// GENERAL MODE EXTRACTION
// ============================================================================

export function extractGeneralData(transcript: TranscriptEntry[]): GeneralExtractionResult {
  const result: GeneralExtractionResult = {};
  
  const customerMessages = transcript
    .filter(t => t.role === "user")
    .map(t => t.message.toLowerCase())
    .join(" ");
  
  // Extract customer name
  const nameMatch = customerMessages.match(/(?:my name is|this is|i'm|i am|call me)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) {
    result.customer_name = nameMatch[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  
  // Check for message request
  if (customerMessages.includes("leave a message") || customerMessages.includes("take a message") || 
      customerMessages.includes("message for")) {
    result.message_requested = true;
  }
  
  // Check for callback request
  if (customerMessages.includes("call me back") || customerMessages.includes("callback") || 
      customerMessages.includes("call back") || customerMessages.includes("have someone call") ||
      customerMessages.includes("give me a call")) {
    result.callback_requested = true;
  }
  
  // Extract callback number
  const phonePatterns = [
    /(?:call me (?:back )?at|my number is|reach me at|phone number is)\s*([\d\-\(\)\s]+)/i,
    /(?:at\s+)?(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/,
  ];
  
  for (const pattern of phonePatterns) {
    const match = customerMessages.match(pattern);
    if (match) {
      result.callback_number = match[1].replace(/\D/g, "");
      break;
    }
  }
  
  // Extract reason for calling / service requested
  const reasonPatterns = [
    /(?:calling about|reason for calling|need help with|question about|inquiring about)\s+(.+?)(?:\.|,|$)/i,
    /(?:i have a|there's a)\s+(question|problem|issue|concern)\s+(?:about|with|regarding)\s+(.+?)(?:\.|,|$)/i,
  ];
  
  for (const pattern of reasonPatterns) {
    const match = customerMessages.match(pattern);
    if (match) {
      result.service_requested = (match[2] || match[1]).trim();
      result.reason = (match[2] || match[1]).trim();
      break;
    }
  }
  
  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createTranscript(messages: Array<{ role: "user" | "agent"; message: string }>): TranscriptEntry[] {
  return messages.map((m, i) => ({
    role: m.role,
    message: m.message,
    timestamp: Date.now() + i * 1000,
  }));
}

export function userSays(message: string): TranscriptEntry {
  return { role: "user", message };
}

export function agentSays(message: string): TranscriptEntry {
  return { role: "agent", message };
}
