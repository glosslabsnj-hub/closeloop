/**
 * Industry Catalog for Voxly
 *
 * This file defines 100+ industries using a template family approach:
 * - Base templates define shared configurations per business mode
 * - Each industry inherits from a base and overrides specific fields
 * - This allows scaling to hundreds of industries without duplication
 *
 * Structure:
 * - IndustryCatalogEntry: Full definition of an industry
 * - businessMode: service | dispatch | food | medical | general
 * - enabledModules: Which dashboard modules appear for this industry
 *
 * DATA MODEL NOTES:
 *
 * For SERVICE businesses (businessMode: 'service'):
 *   - `services` = actual services offered (e.g., "Haircut", "Oil Change")
 *   - These are stored in the `services` database table
 *   - Each has a duration and price
 *
 * For FOOD businesses (businessMode: 'food'):
 *   - `services` = service TYPES, not menu items (e.g., "Delivery Order", "Dine-In")
 *   - These represent how the business serves customers, not what they sell
 *   - Actual menu items (Pizza, Burgers, etc.) are stored in `menu_items` table
 *   - Menu items are managed through Menu Center UI, not in this catalog
 *   - The catalog `services` help the AI understand what order types are available
 *
 * For DISPATCH businesses (businessMode: 'dispatch'):
 *   - `services` = dispatch job types (e.g., "Tow Service", "Rush Delivery")
 *   - These create dispatch_jobs in the database
 */

import type { ServiceTemplate, ContextField, FAQ, ObjectionResponse } from './industryTemplates';

export type BusinessMode = 'service' | 'dispatch' | 'food' | 'medical' | 'general';

export interface IndustryCatalogEntry {
  slug: string;
  name: string;
  icon: string;
  businessMode: BusinessMode;
  category: IndustryCategory;
  tags: string[]; // For search
  enabledModules: string[];
  services: ServiceTemplate[];
  contextFields: ContextField[];
  faqs: FAQ[];
  objections: ObjectionResponse[];
  defaultPolicies: {
    cancellation: string;
    deposit: string;
    refund: string;
  };
  hipaaMode?: boolean; // Auto-enable for medical
  defaultCapabilities?: Record<string, boolean>;
}

export type IndustryCategory = 
  | 'home_services'
  | 'auto_services'
  | 'beauty_wellness'
  | 'health_medical'
  | 'food_hospitality'
  | 'dispatch_logistics'
  | 'professional_services'
  | 'pet_services'
  | 'events_entertainment'
  | 'fitness_recreation'
  | 'property_real_estate'
  | 'other';

export const categoryLabels: Record<IndustryCategory, string> = {
  home_services: 'Home Services',
  auto_services: 'Auto Services',
  beauty_wellness: 'Beauty & Wellness',
  health_medical: 'Health & Medical',
  food_hospitality: 'Food & Hospitality',
  dispatch_logistics: 'Dispatch & Logistics',
  professional_services: 'Professional Services',
  pet_services: 'Pet Services',
  events_entertainment: 'Events & Entertainment',
  fitness_recreation: 'Fitness & Recreation',
  property_real_estate: 'Property & Real Estate',
  other: 'Other',
};

// ============= COMMON TEMPLATES =============

const commonObjections: ObjectionResponse[] = [
  { objection: "That's too expensive", response: "I understand price is important. We focus on quality and most customers find the value exceeds the cost. Would you like to hear about our options?" },
  { objection: "I need to think about it", response: "Of course! Would it help if I answered any specific questions? I can also hold a spot for you for 24 hours." },
  { objection: "I'll call back later", response: "No problem! Would you like me to send you a text with our info and a link to book when you're ready?" },
  { objection: "Can I get a discount?", response: "We offer our best pricing upfront, but we do have special packages. Let me tell you about those options." },
  { objection: "I'm just shopping around", response: "That makes sense! What's most important to you when choosing a provider? I'd love to share what sets us apart." },
];

const commonFAQs: FAQ[] = [
  { question: "What are your hours?", answer: "" },
  { question: "Do you require a deposit?", answer: "" },
  { question: "What forms of payment do you accept?", answer: "" },
  { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed and insured for your protection." },
  { question: "What's your cancellation policy?", answer: "" },
];

const defaultPolicies = {
  cancellation: "Free cancellation up to 24 hours before your appointment. Less than 24 hours notice may incur a cancellation fee.",
  deposit: "We require a deposit to secure your appointment. The deposit is applied to your final bill.",
  refund: "We stand behind our work. If you're not satisfied, please let us know and we'll make it right.",
};

const medicalPolicies = {
  cancellation: "Please provide 24-48 hours notice for cancellations. Missed appointments without notice may incur a fee.",
  deposit: "Co-pays and deductibles are due at time of service.",
  refund: "Billing inquiries can be directed to our billing department. We work with all major insurance providers.",
};

// ============= MODULE PRESETS BY MODE =============

const serviceModules = ['ai_voice', 'instant_text_back', 'booking'];
const dispatchModules = ['ai_voice', 'instant_text_back', 'dispatch_queue'];
const foodModules = ['ai_voice', 'instant_text_back', 'food_orders', 'menu_knowledge', 'reservations', 'catering'];
const medicalModules = ['ai_voice', 'instant_text_back', 'booking', 'medical_intake'];
const generalModules = ['ai_voice', 'instant_text_back'];

// ============= BASE TEMPLATES =============

const homeServicesBase: Partial<IndustryCatalogEntry> = {
  businessMode: 'service',
  category: 'home_services',
  enabledModules: serviceModules,
  contextFields: [
    { key: 'property_type', label: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Condo', 'Commercial'], required: true },
    { key: 'issue_description', label: 'Issue Description', type: 'text', required: true },
    { key: 'urgency', label: 'Urgency', type: 'select', options: ['Not urgent', 'Soon', 'Urgent', 'Emergency'], required: false },
  ],
  faqs: [
    ...commonFAQs,
    { question: "Do you offer emergency service?", answer: "Yes, we offer emergency service. There may be an additional fee for after-hours calls." },
    { question: "Do you provide free estimates?", answer: "We provide free estimates for most jobs. For diagnostic work, there may be a small fee that's waived if you proceed with the repair." },
  ],
  objections: commonObjections,
  defaultPolicies,
};

const autoServicesBase: Partial<IndustryCatalogEntry> = {
  businessMode: 'service',
  category: 'auto_services',
  enabledModules: serviceModules,
  contextFields: [
    { key: 'vehicle_make', label: 'Vehicle Make', type: 'text', required: true },
    { key: 'vehicle_model', label: 'Vehicle Model', type: 'text', required: true },
    { key: 'vehicle_year', label: 'Vehicle Year', type: 'number', required: true },
  ],
  faqs: [
    ...commonFAQs,
    { question: "Do you service all makes and models?", answer: "Yes, we service all major vehicle makes and models." },
    { question: "Do you offer mobile service?", answer: "Yes, we offer mobile service within our service area." },
  ],
  objections: commonObjections,
  defaultPolicies,
};

const beautyWellnessBase: Partial<IndustryCatalogEntry> = {
  businessMode: 'service',
  category: 'beauty_wellness',
  enabledModules: serviceModules,
  contextFields: [
    { key: 'service_interest', label: 'Service Interest', type: 'text', required: true },
    { key: 'is_new_client', label: 'New Client?', type: 'select', options: ['Yes', 'No'], required: true },
  ],
  faqs: [
    ...commonFAQs,
    { question: "Do I need an appointment?", answer: "Appointments are recommended but we do accept walk-ins when available." },
    { question: "How should I prepare for my appointment?", answer: "Arrive a few minutes early to fill out any paperwork. We'll discuss your needs before we begin." },
  ],
  objections: commonObjections,
  defaultPolicies: {
    ...defaultPolicies,
    cancellation: "Please provide 24 hours notice for cancellations. Late cancellations or no-shows may be charged a fee.",
  },
};

const medicalBase: Partial<IndustryCatalogEntry> = {
  businessMode: 'medical',
  category: 'health_medical',
  enabledModules: medicalModules,
  hipaaMode: true,
  contextFields: [
    { key: 'insurance_provider', label: 'Insurance Provider', type: 'text', required: false },
    { key: 'is_new_patient', label: 'New Patient?', type: 'select', options: ['Yes', 'No'], required: true },
    { key: 'reason_for_visit', label: 'Reason for Visit', type: 'text', required: true },
  ],
  faqs: [
    ...commonFAQs,
    { question: "Do you accept my insurance?", answer: "We accept most major insurance plans. Please provide your insurance information and we'll verify coverage." },
    { question: "Are you accepting new patients?", answer: "Yes, we are currently accepting new patients." },
    { question: "What should I bring to my first appointment?", answer: "Please bring your insurance card, photo ID, a list of current medications, and any relevant medical records." },
  ],
  objections: commonObjections,
  defaultPolicies: medicalPolicies,
};

/**
 * Food business base template.
 * NOTE: `services` here are ORDER TYPES (pickup, delivery, dine-in), not menu items.
 * Actual menu items are stored in the `menu_items` table and managed via Menu Center.
 */
const foodBase: Partial<IndustryCatalogEntry> = {
  businessMode: 'food',
  category: 'food_hospitality',
  enabledModules: foodModules,
  contextFields: [
    { key: 'order_type', label: 'Order Type', type: 'select', options: ['Pickup', 'Delivery', 'Dine-in'], required: true },
    { key: 'party_size', label: 'Party Size', type: 'number', required: false },
  ],
  faqs: [
    ...commonFAQs,
    { question: "Do you deliver?", answer: "Yes, we offer delivery within our delivery area. Minimum order may apply." },
    { question: "Can I make a reservation?", answer: "Yes, we accept reservations. You can call or book online." },
    { question: "Do you accommodate dietary restrictions?", answer: "Yes, we can accommodate most dietary restrictions. Please let us know when ordering." },
  ],
  objections: commonObjections,
  defaultPolicies: {
    cancellation: "Order cancellations must be made before preparation begins.",
    deposit: "Large orders or catering may require a deposit.",
    refund: "We'll remake any order you're not satisfied with.",
  },
};

const dispatchBase: Partial<IndustryCatalogEntry> = {
  businessMode: 'dispatch',
  category: 'dispatch_logistics',
  enabledModules: dispatchModules,
  contextFields: [
    { key: 'pickup_location', label: 'Pickup Location', type: 'text', required: true },
    { key: 'dropoff_location', label: 'Dropoff Location', type: 'text', required: false },
    { key: 'urgency', label: 'Urgency', type: 'select', options: ['Standard', 'Rush', 'Emergency'], required: true },
  ],
  faqs: [
    ...commonFAQs,
    { question: "How fast can you get here?", answer: "Our average response time is 30-45 minutes, but it varies by location and demand." },
    { question: "What areas do you serve?", answer: "We serve the greater metropolitan area. Let us know your location and we'll confirm coverage." },
  ],
  objections: commonObjections,
  defaultPolicies,
};

// ============= INDUSTRY CATALOG =============
// Industries are organized by category for easier maintenance

export const industryCatalog: IndustryCatalogEntry[] = [
  // ============= HOME SERVICES =============
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'plumbing',
    name: 'Plumbing',
    icon: '🔧',
    tags: ['plumber', 'plumbing', 'pipes', 'drain', 'leak', 'water heater', 'toilet', 'faucet'],
    services: [
      { name: 'Drain Cleaning', duration: 60, price: 149, priceType: 'fixed' },
      { name: 'Leak Detection', duration: 60, price: 99, priceType: 'fixed' },
      { name: 'Water Heater Repair', duration: 120, price: 299, priceType: 'starting_at' },
      { name: 'Toilet Repair', duration: 60, price: 129, priceType: 'starting_at' },
      { name: 'Faucet Installation', duration: 60, price: 149, priceType: 'starting_at' },
      { name: 'Sewer Line Inspection', duration: 90, price: 199, priceType: 'fixed' },
      { name: 'Emergency Service', duration: 60, price: 199, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Condo', 'Commercial'], required: true },
      { key: 'issue_location', label: 'Issue Location', type: 'select', options: ['Kitchen', 'Bathroom', 'Basement', 'Outdoor', 'Multiple'], required: true },
      { key: 'urgency', label: 'Urgency', type: 'select', options: ['Not urgent', 'Soon', 'Urgent', 'Emergency'], required: true },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'hvac',
    name: 'HVAC',
    icon: '❄️',
    tags: ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'furnace', 'heat pump', 'duct'],
    services: [
      { name: 'AC Tune-Up', duration: 60, price: 99, priceType: 'fixed' },
      { name: 'Furnace Inspection', duration: 60, price: 89, priceType: 'fixed' },
      { name: 'Full System Service', duration: 120, price: 199, priceType: 'fixed' },
      { name: 'Duct Cleaning', duration: 180, price: 399, priceType: 'starting_at' },
      { name: 'Thermostat Installation', duration: 60, price: 149, priceType: 'starting_at' },
      { name: 'Emergency Repair', duration: 120, price: 199, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Condo', 'Commercial'], required: true },
      { key: 'system_type', label: 'System Type', type: 'select', options: ['Central AC', 'Heat Pump', 'Furnace', 'Mini Split', 'Unknown'], required: true },
      { key: 'square_footage', label: 'Square Footage', type: 'number', required: false },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'electrical',
    name: 'Electrical',
    icon: '⚡',
    tags: ['electrician', 'electrical', 'wiring', 'outlet', 'panel', 'lights', 'circuit'],
    services: [
      { name: 'Electrical Inspection', duration: 60, price: 99, priceType: 'fixed' },
      { name: 'Outlet Installation', duration: 60, price: 150, priceType: 'starting_at' },
      { name: 'Light Fixture Installation', duration: 60, price: 125, priceType: 'starting_at' },
      { name: 'Panel Upgrade', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Ceiling Fan Installation', duration: 90, price: 175, priceType: 'starting_at' },
      { name: 'Emergency Service', duration: 60, price: 199, priceType: 'starting_at' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'roofing',
    name: 'Roofing',
    icon: '🏠',
    tags: ['roofing', 'roof', 'shingles', 'leak', 'gutter', 'siding'],
    services: [
      { name: 'Roof Inspection', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Leak Repair', duration: 120, price: 350, priceType: 'starting_at' },
      { name: 'Shingle Replacement', duration: 180, price: 500, priceType: 'starting_at' },
      { name: 'Gutter Cleaning', duration: 90, price: 150, priceType: 'starting_at' },
      { name: 'Gutter Installation', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Full Roof Replacement', duration: 480, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'painting',
    name: 'Painting',
    icon: '🎨',
    tags: ['painting', 'painter', 'interior', 'exterior', 'walls', 'house painting'],
    services: [
      { name: 'Interior Room (Small)', duration: 240, price: 300, priceType: 'starting_at' },
      { name: 'Interior Room (Large)', duration: 360, price: 500, priceType: 'starting_at' },
      { name: 'Exterior Painting', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Cabinet Painting', duration: 480, price: 1500, priceType: 'starting_at' },
      { name: 'Deck Staining', duration: 240, price: 400, priceType: 'starting_at' },
      { name: 'Color Consultation', duration: 60, price: 75, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'flooring',
    name: 'Flooring',
    icon: '🪵',
    tags: ['flooring', 'hardwood', 'tile', 'carpet', 'laminate', 'vinyl', 'floor installation'],
    services: [
      { name: 'Hardwood Installation', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Tile Installation', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Carpet Installation', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Floor Refinishing', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Laminate Installation', duration: 360, price: 0, priceType: 'quote_only' },
      { name: 'Free Estimate', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'cleaning',
    name: 'Cleaning Services',
    icon: '🧹',
    tags: ['cleaning', 'maid', 'house cleaning', 'office cleaning', 'janitorial'],
    services: [
      { name: 'Standard Cleaning', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Deep Cleaning', duration: 240, price: 300, priceType: 'starting_at' },
      { name: 'Move In/Out Cleaning', duration: 300, price: 400, priceType: 'starting_at' },
      { name: 'Office Cleaning', duration: 120, price: 175, priceType: 'starting_at' },
      { name: 'Carpet Cleaning', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'Window Cleaning', duration: 90, price: 100, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'property_size', label: 'Property Size (sq ft)', type: 'number', required: true },
      { key: 'bedrooms', label: 'Number of Bedrooms', type: 'number', required: false },
      { key: 'bathrooms', label: 'Number of Bathrooms', type: 'number', required: false },
      { key: 'frequency', label: 'Cleaning Frequency', type: 'select', options: ['One-time', 'Weekly', 'Bi-weekly', 'Monthly'], required: true },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'landscaping',
    name: 'Landscaping / Lawn Care',
    icon: '🌿',
    tags: ['landscaping', 'lawn', 'lawn care', 'yard', 'garden', 'mowing', 'tree', 'shrubs'],
    services: [
      { name: 'Lawn Mowing', duration: 60, price: 50, priceType: 'starting_at' },
      { name: 'Hedge Trimming', duration: 60, price: 75, priceType: 'starting_at' },
      { name: 'Mulching', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'Spring Cleanup', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Fall Cleanup', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Landscape Design', duration: 120, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'pest_control',
    name: 'Pest Control',
    icon: '🐜',
    tags: ['pest control', 'exterminator', 'bugs', 'insects', 'rodents', 'termites', 'ants'],
    services: [
      { name: 'General Pest Treatment', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'Termite Inspection', duration: 90, price: 100, priceType: 'fixed' },
      { name: 'Rodent Control', duration: 60, price: 175, priceType: 'starting_at' },
      { name: 'Bed Bug Treatment', duration: 180, price: 500, priceType: 'starting_at' },
      { name: 'Mosquito Treatment', duration: 60, price: 125, priceType: 'fixed' },
      { name: 'Quarterly Service Plan', duration: 45, price: 100, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'pest_type', label: 'Pest Type', type: 'select', options: ['Ants', 'Roaches', 'Rodents', 'Termites', 'Bed Bugs', 'Mosquitoes', 'Other'], required: true },
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Commercial'], required: true },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'pool_service',
    name: 'Pool Service',
    icon: '🏊',
    tags: ['pool', 'pool service', 'pool cleaning', 'hot tub', 'spa', 'swimming pool'],
    services: [
      { name: 'Weekly Cleaning', duration: 45, price: 125, priceType: 'fixed' },
      { name: 'Pool Opening', duration: 120, price: 250, priceType: 'fixed' },
      { name: 'Pool Closing', duration: 120, price: 250, priceType: 'fixed' },
      { name: 'Equipment Repair', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Acid Wash', duration: 240, price: 400, priceType: 'starting_at' },
      { name: 'Leak Detection', duration: 90, price: 200, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'pressure_washing',
    name: 'Pressure Washing',
    icon: '💦',
    tags: ['pressure washing', 'power washing', 'driveway', 'deck', 'fence', 'house wash'],
    services: [
      { name: 'Driveway Cleaning', duration: 60, price: 150, priceType: 'starting_at' },
      { name: 'House Wash', duration: 180, price: 300, priceType: 'starting_at' },
      { name: 'Deck Cleaning', duration: 90, price: 175, priceType: 'starting_at' },
      { name: 'Fence Cleaning', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'Patio/Walkway', duration: 60, price: 125, priceType: 'starting_at' },
      { name: 'Commercial Cleaning', duration: 240, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'garage_door',
    name: 'Garage Door Service',
    icon: '🚪',
    tags: ['garage door', 'garage', 'door repair', 'opener', 'springs'],
    services: [
      { name: 'Door Repair', duration: 90, price: 150, priceType: 'starting_at' },
      { name: 'Spring Replacement', duration: 90, price: 250, priceType: 'starting_at' },
      { name: 'Opener Installation', duration: 120, price: 300, priceType: 'starting_at' },
      { name: 'New Door Installation', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Tune-Up & Inspection', duration: 45, price: 89, priceType: 'fixed' },
      { name: 'Emergency Service', duration: 60, price: 199, priceType: 'starting_at' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'appliance_repair',
    name: 'Appliance Repair',
    icon: '🔌',
    tags: ['appliance', 'appliance repair', 'washer', 'dryer', 'refrigerator', 'dishwasher', 'oven'],
    services: [
      { name: 'Washer Repair', duration: 90, price: 150, priceType: 'starting_at' },
      { name: 'Dryer Repair', duration: 90, price: 150, priceType: 'starting_at' },
      { name: 'Refrigerator Repair', duration: 90, price: 175, priceType: 'starting_at' },
      { name: 'Dishwasher Repair', duration: 90, price: 150, priceType: 'starting_at' },
      { name: 'Oven/Range Repair', duration: 90, price: 150, priceType: 'starting_at' },
      { name: 'Diagnostic Service', duration: 45, price: 89, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'handyman',
    name: 'Handyman',
    icon: '🔨',
    tags: ['handyman', 'repairs', 'fix it', 'odd jobs', 'home repair', 'maintenance'],
    services: [
      { name: 'Small Repair (1 hr)', duration: 60, price: 75, priceType: 'fixed' },
      { name: 'Half Day (4 hrs)', duration: 240, price: 280, priceType: 'fixed' },
      { name: 'Full Day (8 hrs)', duration: 480, price: 500, priceType: 'fixed' },
      { name: 'Furniture Assembly', duration: 90, price: 100, priceType: 'starting_at' },
      { name: 'TV Mounting', duration: 60, price: 85, priceType: 'fixed' },
      { name: 'Drywall Repair', duration: 120, price: 150, priceType: 'starting_at' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'locksmith',
    name: 'Locksmith',
    icon: '🔐',
    tags: ['locksmith', 'locks', 'keys', 'lockout', 'security', 'safe'],
    services: [
      { name: 'House Lockout', duration: 30, price: 85, priceType: 'starting_at' },
      { name: 'Car Lockout', duration: 30, price: 75, priceType: 'starting_at' },
      { name: 'Lock Rekey', duration: 30, price: 25, priceType: 'fixed' },
      { name: 'Lock Installation', duration: 45, price: 100, priceType: 'starting_at' },
      { name: 'Key Duplication', duration: 15, price: 5, priceType: 'starting_at' },
      { name: 'Safe Cracking', duration: 120, price: 200, priceType: 'starting_at' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'moving',
    name: 'Moving Company',
    icon: '📦',
    tags: ['moving', 'movers', 'relocation', 'packing', 'furniture moving'],
    services: [
      { name: 'Local Move (Small)', duration: 180, price: 350, priceType: 'starting_at' },
      { name: 'Local Move (Medium)', duration: 300, price: 600, priceType: 'starting_at' },
      { name: 'Local Move (Large)', duration: 480, price: 1000, priceType: 'starting_at' },
      { name: 'Packing Service', duration: 240, price: 300, priceType: 'starting_at' },
      { name: 'Furniture Assembly', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Long Distance Move', duration: 480, price: 0, priceType: 'quote_only' },
    ],
    contextFields: [
      { key: 'move_size', label: 'Move Size', type: 'select', options: ['Studio', '1 Bedroom', '2 Bedroom', '3+ Bedroom', 'Office'], required: true },
      { key: 'floors', label: 'Number of Floors', type: 'number', required: true },
      { key: 'has_elevator', label: 'Elevator Access', type: 'select', options: ['Yes', 'No'], required: false },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'junk_removal',
    name: 'Junk Removal',
    icon: '🗑️',
    tags: ['junk removal', 'hauling', 'debris', 'cleanup', 'estate cleanout', 'trash'],
    services: [
      { name: 'Single Item', duration: 60, price: 75, priceType: 'starting_at' },
      { name: 'Partial Load', duration: 90, price: 200, priceType: 'starting_at' },
      { name: 'Full Load', duration: 120, price: 400, priceType: 'starting_at' },
      { name: 'Estate Cleanout', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Construction Debris', duration: 180, price: 350, priceType: 'starting_at' },
      { name: 'Appliance Removal', duration: 60, price: 100, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'tree_service',
    name: 'Tree Service',
    icon: '🌳',
    tags: ['tree', 'tree service', 'tree removal', 'trimming', 'stump', 'arborist'],
    services: [
      { name: 'Tree Trimming', duration: 180, price: 300, priceType: 'starting_at' },
      { name: 'Tree Removal', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Stump Grinding', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'Emergency Service', duration: 240, price: 500, priceType: 'starting_at' },
      { name: 'Lot Clearing', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Free Estimate', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'fencing',
    name: 'Fencing',
    icon: '🏗️',
    tags: ['fencing', 'fence', 'gate', 'privacy fence', 'chain link', 'wood fence'],
    services: [
      { name: 'Fence Repair', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Gate Installation', duration: 240, price: 400, priceType: 'starting_at' },
      { name: 'New Fence Installation', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Post Replacement', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'Free Estimate', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'window_cleaning',
    name: 'Window Cleaning',
    icon: '🪟',
    tags: ['window cleaning', 'windows', 'glass', 'screens'],
    services: [
      { name: 'Interior Windows', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Exterior Windows', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Full Service (Int + Ext)', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Screen Cleaning', duration: 60, price: 50, priceType: 'starting_at' },
      { name: 'Commercial Windows', duration: 240, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'chimney_service',
    name: 'Chimney Service',
    icon: '🔥',
    tags: ['chimney', 'chimney sweep', 'fireplace', 'flue', 'chimney cleaning'],
    services: [
      { name: 'Chimney Sweep', duration: 90, price: 175, priceType: 'fixed' },
      { name: 'Chimney Inspection', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'Cap Installation', duration: 90, price: 250, priceType: 'starting_at' },
      { name: 'Liner Installation', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Damper Repair', duration: 120, price: 200, priceType: 'starting_at' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'insulation',
    name: 'Insulation',
    icon: '🏡',
    tags: ['insulation', 'attic', 'spray foam', 'blown in', 'energy efficiency'],
    services: [
      { name: 'Attic Insulation', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Wall Insulation', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Crawl Space', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Energy Audit', duration: 120, price: 200, priceType: 'fixed' },
      { name: 'Free Estimate', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'solar',
    name: 'Solar Installation',
    icon: '☀️',
    tags: ['solar', 'solar panels', 'renewable', 'energy', 'solar installation'],
    services: [
      { name: 'Solar Consultation', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Residential Install', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Panel Cleaning', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'System Inspection', duration: 90, price: 150, priceType: 'fixed' },
      { name: 'Battery Backup', duration: 240, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'concrete',
    name: 'Concrete',
    icon: '🏗️',
    tags: ['concrete', 'driveway', 'patio', 'sidewalk', 'foundation', 'stamped concrete'],
    services: [
      { name: 'Driveway Install', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Patio Install', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Sidewalk Repair', duration: 240, price: 500, priceType: 'starting_at' },
      { name: 'Stamped Concrete', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Free Estimate', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'siding',
    name: 'Siding',
    icon: '🏠',
    tags: ['siding', 'vinyl siding', 'exterior', 'house siding'],
    services: [
      { name: 'Siding Repair', duration: 180, price: 300, priceType: 'starting_at' },
      { name: 'Full Siding Replacement', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Power Wash & Clean', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Free Estimate', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'gutter',
    name: 'Gutter Service',
    icon: '🌧️',
    tags: ['gutter', 'gutters', 'downspout', 'gutter cleaning', 'gutter guard'],
    services: [
      { name: 'Gutter Cleaning', duration: 90, price: 125, priceType: 'starting_at' },
      { name: 'Gutter Repair', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Gutter Guard Install', duration: 180, price: 0, priceType: 'quote_only' },
      { name: 'New Gutter Install', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Downspout Extension', duration: 60, price: 75, priceType: 'starting_at' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'irrigation',
    name: 'Irrigation / Sprinklers',
    icon: '💧',
    tags: ['irrigation', 'sprinkler', 'sprinklers', 'lawn irrigation', 'watering'],
    services: [
      { name: 'Sprinkler Repair', duration: 60, price: 100, priceType: 'starting_at' },
      { name: 'System Tune-Up', duration: 90, price: 125, priceType: 'fixed' },
      { name: 'Winterization', duration: 60, price: 85, priceType: 'fixed' },
      { name: 'Spring Activation', duration: 60, price: 85, priceType: 'fixed' },
      { name: 'New System Install', duration: 480, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'masonry',
    name: 'Masonry',
    icon: '🧱',
    tags: ['masonry', 'brick', 'stone', 'mortar', 'tuckpointing', 'retaining wall'],
    services: [
      { name: 'Brick Repair', duration: 180, price: 300, priceType: 'starting_at' },
      { name: 'Tuckpointing', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Retaining Wall', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Stone Veneer', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Free Estimate', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'drywall',
    name: 'Drywall',
    icon: '🪧',
    tags: ['drywall', 'sheetrock', 'plaster', 'wall repair', 'drywall repair'],
    services: [
      { name: 'Small Repair', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Large Repair', duration: 240, price: 350, priceType: 'starting_at' },
      { name: 'Ceiling Repair', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'New Installation', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Texture Matching', duration: 120, price: 200, priceType: 'starting_at' },
    ],
  },
  {
    ...homeServicesBase as IndustryCatalogEntry,
    slug: 'carpet_cleaning',
    name: 'Carpet Cleaning',
    icon: '🧽',
    tags: ['carpet cleaning', 'upholstery', 'rug cleaning', 'steam cleaning'],
    services: [
      { name: 'Room Cleaning (1)', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Whole House', duration: 180, price: 200, priceType: 'starting_at' },
      { name: 'Stain Treatment', duration: 30, price: 40, priceType: 'starting_at' },
      { name: 'Upholstery Cleaning', duration: 60, price: 100, priceType: 'starting_at' },
      { name: 'Rug Cleaning', duration: 60, price: 75, priceType: 'starting_at' },
      { name: 'Pet Odor Treatment', duration: 90, price: 150, priceType: 'starting_at' },
    ],
  },

  // ============= AUTO SERVICES =============
  {
    ...autoServicesBase as IndustryCatalogEntry,
    slug: 'auto_detailing',
    name: 'Auto Detailing',
    icon: '✨',
    tags: ['detailing', 'auto detailing', 'car wash', 'ceramic coating', 'paint correction'],
    services: [
      { name: 'Basic Wash', duration: 60, price: 50, priceType: 'fixed' },
      { name: 'Interior Detail', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Exterior Detail', duration: 120, price: 125, priceType: 'starting_at' },
      { name: 'Full Detail', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Ceramic Coating', duration: 480, price: 800, priceType: 'starting_at' },
      { name: 'Paint Correction', duration: 240, price: 400, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'vehicle_type', label: 'Vehicle Type', type: 'select', options: ['Sedan', 'SUV', 'Truck', 'Van', 'Sports Car', 'Motorcycle'], required: true },
      { key: 'vehicle_size', label: 'Vehicle Size', type: 'select', options: ['Small', 'Medium', 'Large', 'XL'], required: true },
      { key: 'current_condition', label: 'Current Condition', type: 'select', options: ['Light dirt', 'Moderate dirt', 'Heavy dirt', 'Very dirty'], required: false },
    ],
  },
  {
    ...autoServicesBase as IndustryCatalogEntry,
    slug: 'tire_shop',
    name: 'Tire Shop',
    icon: '🚗',
    tags: ['tire', 'tires', 'tire shop', 'wheel', 'alignment', 'rotation'],
    services: [
      { name: 'Tire Rotation', duration: 30, price: 25, priceType: 'fixed' },
      { name: 'Flat Tire Repair', duration: 45, price: 35, priceType: 'fixed' },
      { name: 'Tire Installation (4)', duration: 60, price: 80, priceType: 'fixed' },
      { name: 'Wheel Alignment', duration: 60, price: 89, priceType: 'fixed' },
      { name: 'Brake Inspection', duration: 30, price: 0, priceType: 'fixed' },
      { name: 'Oil Change', duration: 30, price: 45, priceType: 'fixed' },
    ],
  },
  {
    ...autoServicesBase as IndustryCatalogEntry,
    slug: 'auto_repair',
    name: 'Auto Repair',
    icon: '🔧',
    tags: ['auto repair', 'mechanic', 'car repair', 'brake', 'transmission', 'engine'],
    services: [
      { name: 'Diagnostic', duration: 60, price: 99, priceType: 'fixed' },
      { name: 'Oil Change', duration: 30, price: 45, priceType: 'starting_at' },
      { name: 'Brake Service', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'Tune-Up', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'AC Repair', duration: 120, price: 250, priceType: 'starting_at' },
      { name: 'Transmission Service', duration: 180, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...autoServicesBase as IndustryCatalogEntry,
    slug: 'auto_glass',
    name: 'Auto Glass',
    icon: '🪟',
    tags: ['auto glass', 'windshield', 'glass repair', 'windshield replacement'],
    services: [
      { name: 'Chip Repair', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Crack Repair', duration: 45, price: 75, priceType: 'starting_at' },
      { name: 'Windshield Replacement', duration: 90, price: 250, priceType: 'starting_at' },
      { name: 'Side Window', duration: 60, price: 200, priceType: 'starting_at' },
      { name: 'Rear Window', duration: 90, price: 300, priceType: 'starting_at' },
    ],
  },
  {
    ...autoServicesBase as IndustryCatalogEntry,
    slug: 'body_shop',
    name: 'Body Shop',
    icon: '🚙',
    tags: ['body shop', 'collision', 'dent repair', 'auto body', 'paint'],
    services: [
      { name: 'Dent Repair', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Scratch Repair', duration: 90, price: 100, priceType: 'starting_at' },
      { name: 'Bumper Repair', duration: 180, price: 300, priceType: 'starting_at' },
      { name: 'Full Respray', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Collision Repair', duration: 480, price: 0, priceType: 'quote_only' },
      { name: 'Free Estimate', duration: 30, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...autoServicesBase as IndustryCatalogEntry,
    slug: 'car_wash',
    name: 'Car Wash',
    icon: '🚿',
    tags: ['car wash', 'wash', 'express wash', 'hand wash'],
    services: [
      { name: 'Express Wash', duration: 15, price: 15, priceType: 'fixed' },
      { name: 'Full Service Wash', duration: 30, price: 30, priceType: 'fixed' },
      { name: 'Hand Wash', duration: 45, price: 40, priceType: 'fixed' },
      { name: 'Wash & Vacuum', duration: 45, price: 35, priceType: 'fixed' },
      { name: 'Monthly Membership', duration: 15, price: 35, priceType: 'fixed' },
    ],
  },
  {
    ...autoServicesBase as IndustryCatalogEntry,
    slug: 'window_tinting',
    name: 'Window Tinting',
    icon: '🕶️',
    tags: ['window tinting', 'tint', 'auto tint', 'car tint'],
    services: [
      { name: 'Sedan (Full)', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'SUV/Truck (Full)', duration: 150, price: 250, priceType: 'starting_at' },
      { name: 'Front Windows Only', duration: 60, price: 100, priceType: 'starting_at' },
      { name: 'Windshield Strip', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Tint Removal', duration: 120, price: 150, priceType: 'starting_at' },
    ],
  },
  {
    ...autoServicesBase as IndustryCatalogEntry,
    slug: 'mobile_mechanic',
    name: 'Mobile Mechanic',
    icon: '🔧',
    tags: ['mobile mechanic', 'onsite', 'mobile repair', 'at home'],
    businessMode: 'dispatch',
    enabledModules: dispatchModules,
    services: [
      { name: 'Mobile Diagnostic', duration: 60, price: 120, priceType: 'fixed' },
      { name: 'Battery Replacement', duration: 45, price: 175, priceType: 'starting_at' },
      { name: 'Starter Replacement', duration: 120, price: 350, priceType: 'starting_at' },
      { name: 'Alternator Replacement', duration: 120, price: 400, priceType: 'starting_at' },
      { name: 'Brake Pads', duration: 90, price: 200, priceType: 'starting_at' },
    ],
    contextFields: [
      ...autoServicesBase.contextFields!,
      { key: 'location', label: 'Service Location', type: 'text', required: true },
    ],
  },

  // ============= DISPATCH / LOGISTICS =============
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'towing',
    name: 'Towing',
    icon: '🚛',
    tags: ['towing', 'tow truck', 'roadside', 'breakdown', 'emergency'],
    services: [
      { name: 'Local Tow (0-10 miles)', duration: 60, price: 85, priceType: 'fixed' },
      { name: 'Long Distance Tow', duration: 120, price: 0, priceType: 'quote_only' },
      { name: 'Jump Start', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Tire Change', duration: 30, price: 60, priceType: 'fixed' },
      { name: 'Fuel Delivery', duration: 30, price: 55, priceType: 'fixed' },
      { name: 'Lockout Service', duration: 30, price: 65, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'vehicle_type', label: 'Vehicle Type', type: 'select', options: ['Car', 'SUV', 'Truck', 'Motorcycle', 'RV'], required: true },
      { key: 'pickup_location', label: 'Pickup Location', type: 'text', required: true },
      { key: 'destination', label: 'Destination', type: 'text', required: false },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'roadside_assistance',
    name: 'Roadside Assistance',
    icon: '🚗',
    tags: ['roadside', 'roadside assistance', 'breakdown', 'emergency'],
    services: [
      { name: 'Jump Start', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Tire Change', duration: 30, price: 60, priceType: 'fixed' },
      { name: 'Fuel Delivery', duration: 30, price: 55, priceType: 'fixed' },
      { name: 'Lockout Service', duration: 30, price: 65, priceType: 'fixed' },
      { name: 'Minor Repairs', duration: 60, price: 100, priceType: 'starting_at' },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'courier',
    name: 'Courier / Messenger',
    icon: '📬',
    tags: ['courier', 'messenger', 'delivery', 'same day', 'package'],
    services: [
      { name: 'Same-Day Delivery', duration: 60, price: 25, priceType: 'starting_at' },
      { name: 'Rush Delivery (2hr)', duration: 120, price: 50, priceType: 'starting_at' },
      { name: 'Scheduled Delivery', duration: 60, price: 20, priceType: 'starting_at' },
      { name: 'Medical Specimen', duration: 60, price: 35, priceType: 'fixed' },
      { name: 'Legal Documents', duration: 60, price: 40, priceType: 'fixed' },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'medical_transport',
    name: 'Medical Transport',
    icon: '🚑',
    tags: ['medical transport', 'non-emergency', 'wheelchair', 'ambulette'],
    hipaaMode: true,
    enabledModules: [...dispatchModules, 'medical_intake'],
    services: [
      { name: 'One-Way Transport', duration: 60, price: 75, priceType: 'starting_at' },
      { name: 'Round Trip', duration: 120, price: 125, priceType: 'starting_at' },
      { name: 'Wheelchair Transport', duration: 60, price: 90, priceType: 'starting_at' },
      { name: 'Stretcher Transport', duration: 90, price: 150, priceType: 'starting_at' },
      { name: 'Wait Time (per 15 min)', duration: 15, price: 15, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'pickup_location', label: 'Pickup Location', type: 'text', required: true },
      { key: 'dropoff_location', label: 'Dropoff Location', type: 'text', required: true },
      { key: 'mobility_needs', label: 'Mobility Needs', type: 'select', options: ['Ambulatory', 'Wheelchair', 'Stretcher'], required: true },
      { key: 'appointment_time', label: 'Appointment Time', type: 'text', required: false },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'delivery_service',
    name: 'Delivery Service',
    icon: '🚚',
    tags: ['delivery', 'last mile', 'package delivery'],
    services: [
      { name: 'Standard Delivery', duration: 60, price: 15, priceType: 'starting_at' },
      { name: 'Express Delivery', duration: 30, price: 25, priceType: 'starting_at' },
      { name: 'Large Item', duration: 90, price: 50, priceType: 'starting_at' },
      { name: 'White Glove', duration: 120, price: 100, priceType: 'starting_at' },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'field_service',
    name: 'Field Service',
    icon: '👷',
    tags: ['field service', 'technician', 'on-site', 'equipment'],
    services: [
      { name: 'Service Call', duration: 60, price: 125, priceType: 'starting_at' },
      { name: 'Emergency Call', duration: 60, price: 200, priceType: 'starting_at' },
      { name: 'Equipment Install', duration: 180, price: 0, priceType: 'quote_only' },
      { name: 'Maintenance Visit', duration: 90, price: 150, priceType: 'fixed' },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'landscaping_dispatch',
    name: 'Landscaping (Mobile)',
    icon: '🌿',
    tags: ['landscaping', 'lawn care', 'yard', 'mobile lawn', 'lawn service'],
    services: [
      { name: 'Lawn Mowing', duration: 60, price: 50, priceType: 'starting_at' },
      { name: 'Hedge Trimming', duration: 60, price: 75, priceType: 'starting_at' },
      { name: 'Leaf Removal', duration: 90, price: 100, priceType: 'starting_at' },
      { name: 'Mulching', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Spring/Fall Cleanup', duration: 180, price: 200, priceType: 'starting_at' },
      { name: 'Emergency Tree Work', duration: 120, price: 300, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'property_address', label: 'Property Address', type: 'text', required: true },
      { key: 'property_size', label: 'Lot Size', type: 'select', options: ['Small (<1/4 acre)', 'Medium (1/4-1/2 acre)', 'Large (1/2+ acre)'], required: true },
      { key: 'frequency', label: 'Service Frequency', type: 'select', options: ['One-time', 'Weekly', 'Bi-weekly', 'Monthly'], required: false },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'cleaning_dispatch',
    name: 'Cleaning (Mobile)',
    icon: '🧹',
    tags: ['cleaning', 'house cleaning', 'mobile cleaning', 'maid service', 'janitorial'],
    services: [
      { name: 'Standard Cleaning', duration: 120, price: 120, priceType: 'starting_at' },
      { name: 'Deep Cleaning', duration: 180, price: 200, priceType: 'starting_at' },
      { name: 'Move-In/Move-Out', duration: 240, price: 300, priceType: 'starting_at' },
      { name: 'Post-Construction', duration: 240, price: 400, priceType: 'starting_at' },
      { name: 'Office Cleaning', duration: 120, price: 150, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'property_address', label: 'Property Address', type: 'text', required: true },
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Condo', 'Office', 'Commercial'], required: true },
      { key: 'square_footage', label: 'Square Footage', type: 'number', required: false },
      { key: 'bedrooms', label: 'Bedrooms', type: 'number', required: false },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'mobile_detailing',
    name: 'Mobile Auto Detailing',
    icon: '🚙',
    tags: ['detailing', 'car wash', 'auto detail', 'mobile wash', 'car cleaning'],
    services: [
      { name: 'Exterior Wash', duration: 45, price: 40, priceType: 'fixed' },
      { name: 'Interior Detail', duration: 90, price: 80, priceType: 'fixed' },
      { name: 'Full Detail', duration: 180, price: 150, priceType: 'starting_at' },
      { name: 'Premium Detail', duration: 240, price: 250, priceType: 'starting_at' },
      { name: 'Ceramic Coating', duration: 480, price: 500, priceType: 'starting_at' },
      { name: 'Paint Correction', duration: 360, price: 400, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'vehicle_type', label: 'Vehicle Type', type: 'select', options: ['Sedan', 'SUV', 'Truck', 'Van', 'Motorcycle', 'Boat'], required: true },
      { key: 'service_location', label: 'Service Location', type: 'text', required: true },
      { key: 'vehicle_condition', label: 'Condition', type: 'select', options: ['Light dirt', 'Moderate', 'Heavy soiling', 'Neglected'], required: false },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'pest_control_dispatch',
    name: 'Pest Control',
    icon: '🐜',
    tags: ['pest control', 'exterminator', 'bugs', 'rodents', 'termites'],
    services: [
      { name: 'Initial Inspection', duration: 60, price: 0, priceType: 'quote_only' },
      { name: 'General Pest Treatment', duration: 60, price: 125, priceType: 'starting_at' },
      { name: 'Rodent Control', duration: 90, price: 175, priceType: 'starting_at' },
      { name: 'Termite Treatment', duration: 180, price: 0, priceType: 'quote_only' },
      { name: 'Bed Bug Treatment', duration: 180, price: 400, priceType: 'starting_at' },
      { name: 'Quarterly Service', duration: 45, price: 100, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'property_address', label: 'Property Address', type: 'text', required: true },
      { key: 'pest_type', label: 'Pest Type', type: 'select', options: ['Ants', 'Roaches', 'Rodents', 'Termites', 'Bed Bugs', 'Spiders', 'Other'], required: true },
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Condo', 'Commercial'], required: true },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'junk_removal',
    name: 'Junk Removal',
    icon: '🗑️',
    tags: ['junk removal', 'hauling', 'trash', 'debris', 'cleanout'],
    services: [
      { name: 'Single Item Pickup', duration: 30, price: 75, priceType: 'starting_at' },
      { name: '1/8 Truck Load', duration: 60, price: 150, priceType: 'fixed' },
      { name: '1/4 Truck Load', duration: 60, price: 250, priceType: 'fixed' },
      { name: '1/2 Truck Load', duration: 90, price: 400, priceType: 'fixed' },
      { name: 'Full Truck Load', duration: 120, price: 600, priceType: 'fixed' },
      { name: 'Estate Cleanout', duration: 480, price: 0, priceType: 'quote_only' },
    ],
    contextFields: [
      { key: 'pickup_address', label: 'Pickup Address', type: 'text', required: true },
      { key: 'item_description', label: 'What are we removing?', type: 'text', required: true },
      { key: 'location_type', label: 'Location', type: 'select', options: ['Ground floor', 'Upper floor', 'Basement', 'Outdoor'], required: false },
    ],
  },
  {
    ...dispatchBase as IndustryCatalogEntry,
    slug: 'locksmith',
    name: 'Locksmith',
    icon: '🔐',
    tags: ['locksmith', 'locks', 'keys', 'lockout', 'security'],
    services: [
      { name: 'Car Lockout', duration: 30, price: 75, priceType: 'starting_at' },
      { name: 'House Lockout', duration: 30, price: 85, priceType: 'starting_at' },
      { name: 'Lock Rekey', duration: 30, price: 50, priceType: 'starting_at' },
      { name: 'Lock Change', duration: 45, price: 100, priceType: 'starting_at' },
      { name: 'Key Duplication', duration: 15, price: 5, priceType: 'starting_at' },
      { name: 'Commercial Service', duration: 60, price: 150, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'service_address', label: 'Service Address', type: 'text', required: true },
      { key: 'lockout_type', label: 'Type', type: 'select', options: ['Car', 'House', 'Business', 'Safe'], required: true },
      { key: 'urgency', label: 'Urgency', type: 'select', options: ['Standard', 'Urgent', 'Emergency'], required: true },
    ],
  },

  // ============= BEAUTY & WELLNESS =============
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'salon',
    name: 'Salon / Barbershop',
    icon: '💇',
    tags: ['salon', 'barbershop', 'hair', 'haircut', 'stylist', 'barber'],
    services: [
      { name: 'Haircut', duration: 30, price: 35, priceType: 'starting_at' },
      { name: 'Hair Color', duration: 120, price: 100, priceType: 'starting_at' },
      { name: 'Highlights', duration: 150, price: 150, priceType: 'starting_at' },
      { name: 'Blowout', duration: 45, price: 50, priceType: 'fixed' },
      { name: 'Beard Trim', duration: 15, price: 15, priceType: 'fixed' },
      { name: 'Hair Treatment', duration: 60, price: 75, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'nail_salon',
    name: 'Nail Salon',
    icon: '💅',
    tags: ['nails', 'nail salon', 'manicure', 'pedicure', 'gel', 'acrylic'],
    services: [
      { name: 'Manicure', duration: 30, price: 25, priceType: 'fixed' },
      { name: 'Pedicure', duration: 45, price: 40, priceType: 'fixed' },
      { name: 'Gel Manicure', duration: 45, price: 45, priceType: 'fixed' },
      { name: 'Acrylic Full Set', duration: 75, price: 55, priceType: 'fixed' },
      { name: 'Mani/Pedi Combo', duration: 75, price: 55, priceType: 'fixed' },
      { name: 'Nail Art', duration: 30, price: 15, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'spa',
    name: 'Spa',
    icon: '🧖',
    tags: ['spa', 'day spa', 'massage', 'facial', 'relaxation'],
    services: [
      { name: 'Swedish Massage (60 min)', duration: 60, price: 90, priceType: 'fixed' },
      { name: 'Deep Tissue (60 min)', duration: 60, price: 110, priceType: 'fixed' },
      { name: 'Hot Stone Massage', duration: 75, price: 130, priceType: 'fixed' },
      { name: 'Classic Facial', duration: 60, price: 85, priceType: 'fixed' },
      { name: 'Body Wrap', duration: 90, price: 120, priceType: 'fixed' },
      { name: 'Spa Package', duration: 180, price: 250, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'massage',
    name: 'Massage Therapy',
    icon: '💆',
    tags: ['massage', 'massage therapy', 'bodywork', 'therapeutic'],
    services: [
      { name: 'Swedish Massage', duration: 60, price: 80, priceType: 'fixed' },
      { name: 'Deep Tissue', duration: 60, price: 100, priceType: 'fixed' },
      { name: 'Sports Massage', duration: 60, price: 100, priceType: 'fixed' },
      { name: 'Prenatal Massage', duration: 60, price: 90, priceType: 'fixed' },
      { name: 'Couples Massage', duration: 60, price: 160, priceType: 'fixed' },
      { name: '90-Minute Session', duration: 90, price: 120, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'medspa',
    name: 'Med Spa',
    icon: '💉',
    tags: ['medspa', 'med spa', 'botox', 'fillers', 'laser', 'injectables'],
    businessMode: 'medical',
    enabledModules: medicalModules,
    hipaaMode: true,
    services: [
      { name: 'Botox', duration: 30, price: 350, priceType: 'starting_at' },
      { name: 'Dermal Fillers', duration: 45, price: 600, priceType: 'starting_at' },
      { name: 'Facial', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'Chemical Peel', duration: 45, price: 200, priceType: 'starting_at' },
      { name: 'Laser Treatment', duration: 45, price: 400, priceType: 'starting_at' },
      { name: 'Microneedling', duration: 60, price: 300, priceType: 'fixed' },
      { name: 'Consultation', duration: 30, price: 0, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'treatment_interest', label: 'Treatment Interest', type: 'text', required: true },
      { key: 'skin_concerns', label: 'Skin Concerns', type: 'text', required: false },
      { key: 'previous_treatments', label: 'Previous Treatments', type: 'text', required: false },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'tattoo',
    name: 'Tattoo Studio',
    icon: '🎨',
    tags: ['tattoo', 'ink', 'body art', 'tattoo artist'],
    services: [
      { name: 'Small Tattoo', duration: 60, price: 100, priceType: 'starting_at' },
      { name: 'Medium Tattoo', duration: 180, price: 300, priceType: 'starting_at' },
      { name: 'Large Tattoo', duration: 360, price: 0, priceType: 'quote_only' },
      { name: 'Cover-Up', duration: 180, price: 400, priceType: 'starting_at' },
      { name: 'Consultation', duration: 30, price: 0, priceType: 'fixed' },
      { name: 'Touch-Up', duration: 60, price: 50, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'esthetics',
    name: 'Esthetics',
    icon: '✨',
    tags: ['esthetics', 'esthetician', 'skin care', 'facial', 'waxing', 'lashes'],
    services: [
      { name: 'Classic Facial', duration: 60, price: 85, priceType: 'fixed' },
      { name: 'Brow Wax', duration: 15, price: 20, priceType: 'fixed' },
      { name: 'Full Face Wax', duration: 30, price: 45, priceType: 'fixed' },
      { name: 'Brazilian Wax', duration: 30, price: 65, priceType: 'fixed' },
      { name: 'Lash Extensions', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'Lash Lift', duration: 60, price: 85, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'brow_lash',
    name: 'Brow & Lash Studio',
    icon: '👁️',
    tags: ['brows', 'lashes', 'microblading', 'lash extensions', 'eyebrow'],
    services: [
      { name: 'Lash Extensions (Full)', duration: 120, price: 200, priceType: 'fixed' },
      { name: 'Lash Fill (2 wk)', duration: 60, price: 85, priceType: 'fixed' },
      { name: 'Lash Lift & Tint', duration: 60, price: 100, priceType: 'fixed' },
      { name: 'Microblading', duration: 180, price: 400, priceType: 'fixed' },
      { name: 'Brow Lamination', duration: 60, price: 75, priceType: 'fixed' },
      { name: 'Brow Wax & Tint', duration: 30, price: 40, priceType: 'fixed' },
    ],
  },

  // ============= HEALTH & MEDICAL =============
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'primary_care',
    name: 'Primary Care',
    icon: '🩺',
    tags: ['primary care', 'family medicine', 'doctor', 'physician', 'checkup'],
    services: [
      { name: 'Annual Physical', duration: 45, price: 150, priceType: 'starting_at' },
      { name: 'Sick Visit', duration: 20, price: 100, priceType: 'fixed' },
      { name: 'Well-Child Check', duration: 30, price: 125, priceType: 'fixed' },
      { name: 'Immunizations', duration: 15, price: 50, priceType: 'starting_at' },
      { name: 'Lab Work', duration: 15, price: 75, priceType: 'starting_at' },
      { name: 'Telehealth Visit', duration: 20, price: 75, priceType: 'fixed' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'urgent_care',
    name: 'Urgent Care',
    icon: '🏥',
    tags: ['urgent care', 'walk in clinic', 'immediate care', 'minor emergency'],
    services: [
      { name: 'Urgent Visit', duration: 30, price: 150, priceType: 'starting_at' },
      { name: 'X-Ray', duration: 30, price: 150, priceType: 'starting_at' },
      { name: 'Stitches', duration: 45, price: 200, priceType: 'starting_at' },
      { name: 'Flu/COVID Test', duration: 20, price: 50, priceType: 'fixed' },
      { name: 'Physical (DOT/Sports)', duration: 30, price: 100, priceType: 'fixed' },
      { name: 'Drug Screen', duration: 15, price: 50, priceType: 'fixed' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'dental',
    name: 'Dental',
    icon: '🦷',
    tags: ['dental', 'dentist', 'teeth', 'cleaning', 'orthodontics'],
    services: [
      { name: 'Cleaning', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'Whitening', duration: 90, price: 400, priceType: 'fixed' },
      { name: 'Consultation', duration: 30, price: 75, priceType: 'fixed' },
      { name: 'Filling', duration: 60, price: 200, priceType: 'starting_at' },
      { name: 'Crown', duration: 90, price: 1200, priceType: 'starting_at' },
      { name: 'Root Canal', duration: 120, price: 800, priceType: 'starting_at' },
      { name: 'Emergency Visit', duration: 60, price: 250, priceType: 'starting_at' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'orthodontics',
    name: 'Orthodontics',
    icon: '😁',
    tags: ['orthodontics', 'braces', 'invisalign', 'teeth straightening'],
    services: [
      { name: 'Consultation', duration: 45, price: 0, priceType: 'fixed' },
      { name: 'Braces (Full)', duration: 90, price: 5000, priceType: 'starting_at' },
      { name: 'Invisalign', duration: 60, price: 4500, priceType: 'starting_at' },
      { name: 'Adjustment Visit', duration: 30, price: 0, priceType: 'fixed' },
      { name: 'Retainer', duration: 30, price: 300, priceType: 'starting_at' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'optometry',
    name: 'Optometry',
    icon: '👓',
    tags: ['optometry', 'eye doctor', 'vision', 'glasses', 'contacts', 'eye exam'],
    services: [
      { name: 'Eye Exam', duration: 30, price: 75, priceType: 'fixed' },
      { name: 'Contact Lens Fitting', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Glasses Fitting', duration: 30, price: 0, priceType: 'fixed' },
      { name: 'Retinal Imaging', duration: 15, price: 50, priceType: 'fixed' },
      { name: 'Pediatric Eye Exam', duration: 45, price: 85, priceType: 'fixed' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'chiropractic',
    name: 'Chiropractic',
    icon: '🦴',
    tags: ['chiropractic', 'chiropractor', 'spine', 'adjustment', 'back pain'],
    services: [
      { name: 'Initial Consultation', duration: 60, price: 75, priceType: 'fixed' },
      { name: 'Adjustment', duration: 30, price: 65, priceType: 'fixed' },
      { name: 'Spinal Decompression', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Massage Therapy', duration: 60, price: 80, priceType: 'fixed' },
      { name: 'X-Ray', duration: 15, price: 100, priceType: 'starting_at' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'physical_therapy',
    name: 'Physical Therapy',
    icon: '🏃',
    tags: ['physical therapy', 'pt', 'rehab', 'rehabilitation', 'injury'],
    services: [
      { name: 'Evaluation', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'PT Session', duration: 45, price: 125, priceType: 'fixed' },
      { name: 'Dry Needling', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Manual Therapy', duration: 30, price: 75, priceType: 'fixed' },
      { name: 'Balance Training', duration: 45, price: 100, priceType: 'fixed' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'dermatology',
    name: 'Dermatology',
    icon: '🔬',
    tags: ['dermatology', 'dermatologist', 'skin', 'acne', 'skin cancer'],
    services: [
      { name: 'Skin Exam', duration: 30, price: 150, priceType: 'fixed' },
      { name: 'Acne Treatment', duration: 30, price: 125, priceType: 'fixed' },
      { name: 'Mole Check', duration: 30, price: 100, priceType: 'fixed' },
      { name: 'Biopsy', duration: 30, price: 300, priceType: 'starting_at' },
      { name: 'Cosmetic Consultation', duration: 30, price: 100, priceType: 'fixed' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'mental_health',
    name: 'Mental Health / Counseling',
    icon: '🧠',
    tags: ['mental health', 'therapy', 'counseling', 'therapist', 'psychologist', 'psychiatrist'],
    services: [
      { name: 'Initial Assessment', duration: 60, price: 175, priceType: 'fixed' },
      { name: 'Individual Therapy', duration: 50, price: 150, priceType: 'fixed' },
      { name: 'Couples Therapy', duration: 60, price: 175, priceType: 'fixed' },
      { name: 'Group Session', duration: 90, price: 50, priceType: 'fixed' },
      { name: 'Telehealth Session', duration: 50, price: 140, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'is_new_patient', label: 'New Patient?', type: 'select', options: ['Yes', 'No'], required: true },
      { key: 'session_type', label: 'Session Type', type: 'select', options: ['Individual', 'Couples', 'Family', 'Group'], required: true },
      { key: 'insurance_provider', label: 'Insurance Provider', type: 'text', required: false },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'pediatrics',
    name: 'Pediatrics',
    icon: '👶',
    tags: ['pediatrics', 'pediatrician', 'children', 'kids', 'baby'],
    services: [
      { name: 'Well-Child Visit', duration: 30, price: 125, priceType: 'fixed' },
      { name: 'Sick Visit', duration: 20, price: 100, priceType: 'fixed' },
      { name: 'Newborn Visit', duration: 45, price: 150, priceType: 'fixed' },
      { name: 'Immunizations', duration: 15, price: 50, priceType: 'starting_at' },
      { name: 'Sports Physical', duration: 30, price: 75, priceType: 'fixed' },
    ],
  },
  {
    ...medicalBase as IndustryCatalogEntry,
    slug: 'veterinary',
    name: 'Veterinary',
    icon: '🐾',
    tags: ['veterinary', 'vet', 'animal', 'pet', 'dog', 'cat'],
    businessMode: 'service',
    enabledModules: serviceModules,
    hipaaMode: false,
    services: [
      { name: 'Wellness Exam', duration: 30, price: 60, priceType: 'fixed' },
      { name: 'Vaccination', duration: 20, price: 30, priceType: 'starting_at' },
      { name: 'Dental Cleaning', duration: 120, price: 300, priceType: 'starting_at' },
      { name: 'Surgery', duration: 180, price: 0, priceType: 'quote_only' },
      { name: 'Emergency Visit', duration: 60, price: 150, priceType: 'starting_at' },
      { name: 'Spay/Neuter', duration: 120, price: 300, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'pet_type', label: 'Pet Type', type: 'select', options: ['Dog', 'Cat', 'Bird', 'Reptile', 'Other'], required: true },
      { key: 'pet_name', label: 'Pet Name', type: 'text', required: true },
      { key: 'is_new_patient', label: 'New Patient?', type: 'select', options: ['Yes', 'No'], required: true },
      { key: 'reason_for_visit', label: 'Reason for Visit', type: 'text', required: true },
    ],
  },

  // ============= FOOD & HOSPITALITY =============
  {
    ...foodBase as IndustryCatalogEntry,
    slug: 'restaurant',
    name: 'Restaurant',
    icon: '🍽️',
    tags: ['restaurant', 'dining', 'food', 'eatery'],
    services: [
      { name: 'Dine-In', duration: 60, price: 0, priceType: 'quote_only' },
      { name: 'Takeout Order', duration: 20, price: 0, priceType: 'quote_only' },
      { name: 'Delivery Order', duration: 45, price: 0, priceType: 'quote_only' },
      { name: 'Reservation', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Private Event', duration: 180, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...foodBase as IndustryCatalogEntry,
    slug: 'pizzeria',
    name: 'Pizzeria',
    icon: '🍕',
    tags: ['pizza', 'pizzeria', 'italian', 'delivery'],
    services: [
      { name: 'Pickup Order', duration: 20, price: 0, priceType: 'quote_only' },
      { name: 'Delivery Order', duration: 45, price: 0, priceType: 'quote_only' },
      { name: 'Catering Order', duration: 60, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...foodBase as IndustryCatalogEntry,
    slug: 'fast_casual',
    name: 'Fast Casual',
    icon: '🥗',
    tags: ['fast casual', 'quick service', 'counter service'],
    services: [
      { name: 'In-Store Order', duration: 10, price: 0, priceType: 'quote_only' },
      { name: 'Pickup Order', duration: 15, price: 0, priceType: 'quote_only' },
      { name: 'Delivery Order', duration: 30, price: 0, priceType: 'quote_only' },
      { name: 'Catering', duration: 60, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...foodBase as IndustryCatalogEntry,
    slug: 'bakery',
    name: 'Bakery',
    icon: '🥐',
    tags: ['bakery', 'pastry', 'bread', 'cakes', 'desserts'],
    services: [
      { name: 'In-Store Purchase', duration: 10, price: 0, priceType: 'quote_only' },
      { name: 'Custom Cake Order', duration: 30, price: 0, priceType: 'quote_only' },
      { name: 'Catering Order', duration: 30, price: 0, priceType: 'quote_only' },
      { name: 'Wedding Cake Consultation', duration: 60, price: 50, priceType: 'fixed' },
    ],
  },
  {
    ...foodBase as IndustryCatalogEntry,
    slug: 'coffee_shop',
    name: 'Coffee Shop',
    icon: '☕',
    tags: ['coffee', 'cafe', 'espresso', 'coffee shop'],
    services: [
      { name: 'In-Store Order', duration: 10, price: 0, priceType: 'quote_only' },
      { name: 'Mobile Order Pickup', duration: 5, price: 0, priceType: 'quote_only' },
      { name: 'Catering (Coffee Service)', duration: 60, price: 100, priceType: 'starting_at' },
    ],
  },
  {
    ...foodBase as IndustryCatalogEntry,
    slug: 'food_truck',
    name: 'Food Truck',
    icon: '🚚',
    tags: ['food truck', 'mobile food', 'street food'],
    services: [
      { name: 'Walk-Up Order', duration: 10, price: 0, priceType: 'quote_only' },
      { name: 'Event Booking', duration: 240, price: 500, priceType: 'starting_at' },
      { name: 'Private Party', duration: 180, price: 750, priceType: 'starting_at' },
    ],
  },
  {
    ...foodBase as IndustryCatalogEntry,
    slug: 'catering_service',
    name: 'Catering',
    icon: '🍴',
    tags: ['catering', 'events', 'food service', 'party'],
    enabledModules: ['ai_voice', 'instant_text_back', 'catering'],
    services: [
      { name: 'Consultation', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Small Event (25 guests)', duration: 180, price: 500, priceType: 'starting_at' },
      { name: 'Medium Event (50 guests)', duration: 240, price: 1000, priceType: 'starting_at' },
      { name: 'Large Event (100+ guests)', duration: 360, price: 0, priceType: 'quote_only' },
      { name: 'Drop-Off Catering', duration: 60, price: 200, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'event_type', label: 'Event Type', type: 'select', options: ['Wedding', 'Corporate', 'Birthday', 'Holiday', 'Other'], required: true },
      { key: 'guest_count', label: 'Guest Count', type: 'number', required: true },
      { key: 'event_date', label: 'Event Date', type: 'text', required: true },
      { key: 'dietary_restrictions', label: 'Dietary Restrictions', type: 'text', required: false },
    ],
  },
  {
    ...foodBase as IndustryCatalogEntry,
    slug: 'bar',
    name: 'Bar / Lounge',
    icon: '🍸',
    tags: ['bar', 'lounge', 'nightclub', 'drinks', 'cocktails'],
    services: [
      { name: 'Table Reservation', duration: 120, price: 0, priceType: 'fixed' },
      { name: 'VIP Booth', duration: 180, price: 100, priceType: 'starting_at' },
      { name: 'Private Event', duration: 240, price: 0, priceType: 'quote_only' },
    ],
  },

  // ============= PET SERVICES =============
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'pet_grooming',
    name: 'Pet Grooming',
    icon: '🐕',
    category: 'pet_services',
    tags: ['pet grooming', 'dog grooming', 'cat grooming', 'groomer'],
    services: [
      { name: 'Bath & Brush', duration: 60, price: 45, priceType: 'starting_at' },
      { name: 'Full Grooming', duration: 120, price: 75, priceType: 'starting_at' },
      { name: 'Nail Trim', duration: 15, price: 15, priceType: 'fixed' },
      { name: 'Teeth Brushing', duration: 15, price: 10, priceType: 'fixed' },
      { name: 'De-shedding Treatment', duration: 90, price: 60, priceType: 'starting_at' },
      { name: 'Puppy Package', duration: 60, price: 50, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'pet_type', label: 'Pet Type', type: 'select', options: ['Dog', 'Cat', 'Other'], required: true },
      { key: 'breed', label: 'Breed', type: 'text', required: true },
      { key: 'weight', label: 'Weight (lbs)', type: 'number', required: true },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'pet_boarding',
    name: 'Pet Boarding',
    icon: '🏠',
    category: 'pet_services',
    tags: ['pet boarding', 'kennel', 'dog boarding', 'pet hotel'],
    services: [
      { name: 'Overnight Stay', duration: 1440, price: 45, priceType: 'fixed' },
      { name: 'Day Care', duration: 480, price: 30, priceType: 'fixed' },
      { name: 'Extended Stay (Week)', duration: 10080, price: 250, priceType: 'fixed' },
      { name: 'Grooming Add-On', duration: 60, price: 50, priceType: 'starting_at' },
      { name: 'Medication Administration', duration: 15, price: 10, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'pet_type', label: 'Pet Type', type: 'select', options: ['Dog', 'Cat', 'Other'], required: true },
      { key: 'pet_name', label: 'Pet Name', type: 'text', required: true },
      { key: 'check_in_date', label: 'Check-in Date', type: 'text', required: true },
      { key: 'check_out_date', label: 'Check-out Date', type: 'text', required: true },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'dog_training',
    name: 'Dog Training',
    icon: '🦮',
    category: 'pet_services',
    tags: ['dog training', 'obedience', 'puppy training', 'behavior'],
    services: [
      { name: 'Evaluation', duration: 60, price: 75, priceType: 'fixed' },
      { name: 'Private Session', duration: 60, price: 100, priceType: 'fixed' },
      { name: 'Group Class (6 wk)', duration: 60, price: 175, priceType: 'fixed' },
      { name: 'Puppy Package', duration: 60, price: 400, priceType: 'fixed' },
      { name: 'Board & Train', duration: 10080, price: 0, priceType: 'quote_only' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'dog_walking',
    name: 'Dog Walking / Pet Sitting',
    icon: '🚶',
    category: 'pet_services',
    tags: ['dog walking', 'pet sitting', 'dog walker', 'pet care'],
    services: [
      { name: '30-Min Walk', duration: 30, price: 20, priceType: 'fixed' },
      { name: '60-Min Walk', duration: 60, price: 35, priceType: 'fixed' },
      { name: 'Drop-In Visit', duration: 30, price: 25, priceType: 'fixed' },
      { name: 'Overnight Stay', duration: 720, price: 75, priceType: 'fixed' },
      { name: 'Weekend Care', duration: 2880, price: 150, priceType: 'fixed' },
    ],
  },

  // ============= FITNESS & RECREATION =============
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'personal_training',
    name: 'Personal Training',
    icon: '💪',
    category: 'fitness_recreation',
    tags: ['personal training', 'fitness', 'trainer', 'gym', 'workout'],
    services: [
      { name: 'Personal Training Session', duration: 60, price: 80, priceType: 'fixed' },
      { name: 'Fitness Assessment', duration: 60, price: 0, priceType: 'fixed' },
      { name: '5-Pack Sessions', duration: 60, price: 350, priceType: 'fixed' },
      { name: '10-Pack Sessions', duration: 60, price: 650, priceType: 'fixed' },
      { name: 'Nutrition Consultation', duration: 45, price: 75, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'fitness_goals', label: 'Fitness Goals', type: 'text', required: true },
      { key: 'experience_level', label: 'Experience Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: true },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'yoga',
    name: 'Yoga Studio',
    icon: '🧘',
    category: 'fitness_recreation',
    tags: ['yoga', 'yoga studio', 'meditation', 'wellness'],
    services: [
      { name: 'Drop-In Class', duration: 60, price: 25, priceType: 'fixed' },
      { name: '5-Class Pack', duration: 60, price: 100, priceType: 'fixed' },
      { name: '10-Class Pack', duration: 60, price: 175, priceType: 'fixed' },
      { name: 'Monthly Unlimited', duration: 60, price: 125, priceType: 'fixed' },
      { name: 'Private Session', duration: 60, price: 85, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'pilates',
    name: 'Pilates Studio',
    icon: '🤸',
    category: 'fitness_recreation',
    tags: ['pilates', 'reformer', 'fitness', 'core'],
    services: [
      { name: 'Mat Class', duration: 55, price: 30, priceType: 'fixed' },
      { name: 'Reformer Class', duration: 55, price: 40, priceType: 'fixed' },
      { name: 'Private Reformer', duration: 55, price: 90, priceType: 'fixed' },
      { name: '5-Class Pack', duration: 55, price: 175, priceType: 'fixed' },
      { name: 'Monthly Unlimited', duration: 55, price: 200, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'martial_arts',
    name: 'Martial Arts',
    icon: '🥋',
    category: 'fitness_recreation',
    tags: ['martial arts', 'karate', 'taekwondo', 'jiu jitsu', 'mma', 'boxing'],
    services: [
      { name: 'Trial Class', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Monthly Membership', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'Private Lesson', duration: 60, price: 100, priceType: 'fixed' },
      { name: 'Belt Testing', duration: 120, price: 75, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'dance_studio',
    name: 'Dance Studio',
    icon: '💃',
    category: 'fitness_recreation',
    tags: ['dance', 'dance studio', 'ballet', 'hip hop', 'dance class'],
    services: [
      { name: 'Drop-In Class', duration: 60, price: 20, priceType: 'fixed' },
      { name: 'Monthly Unlimited', duration: 60, price: 100, priceType: 'fixed' },
      { name: 'Private Lesson', duration: 60, price: 75, priceType: 'fixed' },
      { name: 'Wedding Dance Package', duration: 60, price: 300, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'golf',
    name: 'Golf Services',
    icon: '⛳',
    category: 'fitness_recreation',
    tags: ['golf', 'golf lessons', 'driving range', 'golf course'],
    services: [
      { name: 'Golf Lesson (30 min)', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Golf Lesson (60 min)', duration: 60, price: 90, priceType: 'fixed' },
      { name: '5-Lesson Package', duration: 60, price: 400, priceType: 'fixed' },
      { name: 'Club Fitting', duration: 90, price: 150, priceType: 'fixed' },
      { name: 'Playing Lesson (9 holes)', duration: 120, price: 175, priceType: 'fixed' },
    ],
  },

  // ============= EVENTS & ENTERTAINMENT =============
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'photography',
    name: 'Photography',
    icon: '📸',
    category: 'events_entertainment',
    tags: ['photography', 'photographer', 'photos', 'portraits', 'wedding photography'],
    services: [
      { name: 'Portrait Session', duration: 60, price: 200, priceType: 'starting_at' },
      { name: 'Family Session', duration: 90, price: 300, priceType: 'starting_at' },
      { name: 'Headshots', duration: 30, price: 150, priceType: 'fixed' },
      { name: 'Event Coverage (4hr)', duration: 240, price: 800, priceType: 'starting_at' },
      { name: 'Wedding Photography', duration: 480, price: 2500, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'session_type', label: 'Session Type', type: 'text', required: true },
      { key: 'location', label: 'Preferred Location', type: 'select', options: ['Studio', 'Outdoor', 'Client Location'], required: true },
      { key: 'num_people', label: 'Number of People', type: 'number', required: false },
    ],
    defaultPolicies: {
      ...defaultPolicies,
      deposit: "A 25% deposit is required to secure your session date.",
    },
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'videography',
    name: 'Videography',
    icon: '🎬',
    category: 'events_entertainment',
    tags: ['videography', 'video', 'videographer', 'film', 'wedding video'],
    services: [
      { name: 'Event Coverage (4hr)', duration: 240, price: 1000, priceType: 'starting_at' },
      { name: 'Event Coverage (8hr)', duration: 480, price: 1800, priceType: 'starting_at' },
      { name: 'Wedding Package', duration: 480, price: 3000, priceType: 'starting_at' },
      { name: 'Promo Video', duration: 480, price: 1500, priceType: 'starting_at' },
      { name: 'Consultation', duration: 30, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'dj',
    name: 'DJ / Entertainment',
    icon: '🎧',
    category: 'events_entertainment',
    tags: ['dj', 'entertainment', 'music', 'party', 'wedding dj'],
    services: [
      { name: 'Party (4 hrs)', duration: 240, price: 500, priceType: 'starting_at' },
      { name: 'Wedding (6 hrs)', duration: 360, price: 1200, priceType: 'starting_at' },
      { name: 'Corporate Event', duration: 240, price: 800, priceType: 'starting_at' },
      { name: 'MC Services', duration: 240, price: 300, priceType: 'fixed' },
      { name: 'Consultation', duration: 30, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'event_venue',
    name: 'Event Venue',
    icon: '🏛️',
    category: 'events_entertainment',
    tags: ['venue', 'event space', 'wedding venue', 'party venue', 'banquet hall'],
    services: [
      { name: 'Venue Tour', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Small Event (50 guests)', duration: 240, price: 1000, priceType: 'starting_at' },
      { name: 'Large Event (150 guests)', duration: 360, price: 3000, priceType: 'starting_at' },
      { name: 'Wedding Package', duration: 480, price: 5000, priceType: 'starting_at' },
      { name: 'Corporate Meeting', duration: 240, price: 500, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'wedding_planner',
    name: 'Wedding Planner',
    icon: '💒',
    category: 'events_entertainment',
    tags: ['wedding planner', 'event planner', 'wedding coordinator'],
    services: [
      { name: 'Consultation', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Day-Of Coordination', duration: 480, price: 1500, priceType: 'starting_at' },
      { name: 'Partial Planning', duration: 480, price: 3000, priceType: 'starting_at' },
      { name: 'Full Planning', duration: 480, price: 5000, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'music_lessons',
    name: 'Music Lessons',
    icon: '🎵',
    category: 'events_entertainment',
    tags: ['music lessons', 'piano', 'guitar', 'voice', 'music teacher'],
    services: [
      { name: '30-Min Lesson', duration: 30, price: 40, priceType: 'fixed' },
      { name: '60-Min Lesson', duration: 60, price: 70, priceType: 'fixed' },
      { name: '4-Pack (30 min)', duration: 30, price: 140, priceType: 'fixed' },
      { name: '4-Pack (60 min)', duration: 60, price: 250, priceType: 'fixed' },
      { name: 'Trial Lesson', duration: 30, price: 25, priceType: 'fixed' },
    ],
  },

  // ============= PROFESSIONAL SERVICES =============
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'accounting',
    name: 'Accounting / Tax Services',
    icon: '📊',
    category: 'professional_services',
    tags: ['accounting', 'tax', 'bookkeeping', 'cpa', 'accountant'],
    services: [
      { name: 'Tax Preparation (Simple)', duration: 60, price: 150, priceType: 'starting_at' },
      { name: 'Tax Preparation (Complex)', duration: 120, price: 350, priceType: 'starting_at' },
      { name: 'Business Tax Return', duration: 180, price: 500, priceType: 'starting_at' },
      { name: 'Bookkeeping (Monthly)', duration: 480, price: 300, priceType: 'starting_at' },
      { name: 'Consultation', duration: 60, price: 100, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'legal',
    name: 'Legal Services',
    icon: '⚖️',
    category: 'professional_services',
    tags: ['legal', 'lawyer', 'attorney', 'law firm'],
    services: [
      { name: 'Consultation', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'Document Review', duration: 60, price: 200, priceType: 'starting_at' },
      { name: 'Contract Drafting', duration: 120, price: 500, priceType: 'starting_at' },
      { name: 'Will Preparation', duration: 120, price: 400, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'insurance',
    name: 'Insurance Agency',
    icon: '🛡️',
    category: 'professional_services',
    tags: ['insurance', 'insurance agent', 'life insurance', 'auto insurance'],
    services: [
      { name: 'Quote Consultation', duration: 30, price: 0, priceType: 'fixed' },
      { name: 'Policy Review', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Claims Assistance', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'New Policy Setup', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'financial_advisor',
    name: 'Financial Advisor',
    icon: '💰',
    category: 'professional_services',
    tags: ['financial advisor', 'wealth management', 'investment', 'financial planning'],
    services: [
      { name: 'Initial Consultation', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Financial Plan', duration: 120, price: 500, priceType: 'starting_at' },
      { name: 'Portfolio Review', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'Retirement Planning', duration: 90, price: 300, priceType: 'starting_at' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'tutoring',
    name: 'Tutoring',
    icon: '📚',
    category: 'professional_services',
    tags: ['tutoring', 'tutor', 'education', 'test prep', 'homework help'],
    services: [
      { name: '1-Hour Session', duration: 60, price: 60, priceType: 'fixed' },
      { name: '5-Session Package', duration: 60, price: 275, priceType: 'fixed' },
      { name: '10-Session Package', duration: 60, price: 500, priceType: 'fixed' },
      { name: 'SAT/ACT Prep (10 hrs)', duration: 60, price: 800, priceType: 'fixed' },
      { name: 'Assessment', duration: 60, price: 50, priceType: 'fixed' },
    ],
  },

  // ============= PROPERTY & REAL ESTATE =============
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'real_estate',
    name: 'Real Estate',
    icon: '🏘️',
    category: 'property_real_estate',
    tags: ['real estate', 'realtor', 'real estate agent', 'property', 'homes'],
    services: [
      { name: 'Buyer Consultation', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Seller Consultation', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Home Showing', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Market Analysis', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'property_management',
    name: 'Property Management',
    icon: '🏢',
    category: 'property_real_estate',
    tags: ['property management', 'landlord', 'rental', 'property manager'],
    services: [
      { name: 'Property Consultation', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Tenant Showing', duration: 30, price: 0, priceType: 'fixed' },
      { name: 'Maintenance Request', duration: 30, price: 0, priceType: 'fixed' },
      { name: 'Lease Signing', duration: 60, price: 0, priceType: 'fixed' },
    ],
  },
  {
    ...beautyWellnessBase as IndustryCatalogEntry,
    slug: 'home_inspection',
    name: 'Home Inspection',
    icon: '🔍',
    category: 'property_real_estate',
    tags: ['home inspection', 'inspector', 'property inspection'],
    services: [
      { name: 'Standard Inspection', duration: 180, price: 400, priceType: 'starting_at' },
      { name: 'Condo Inspection', duration: 120, price: 300, priceType: 'starting_at' },
      { name: 'Pre-Listing Inspection', duration: 180, price: 350, priceType: 'starting_at' },
      { name: 'Radon Testing', duration: 30, price: 150, priceType: 'fixed' },
      { name: 'Mold Inspection', duration: 90, price: 250, priceType: 'starting_at' },
    ],
  },

  // ============= OTHER =============
  {
    slug: 'other',
    name: 'Other',
    icon: '🏢',
    businessMode: 'general',
    category: 'other',
    tags: ['other', 'general', 'business', 'service'],
    enabledModules: generalModules,
    services: [
      { name: 'Standard Service', duration: 60, price: 100, priceType: 'fixed' },
      { name: 'Premium Service', duration: 120, price: 200, priceType: 'fixed' },
      { name: 'Consultation', duration: 30, price: 50, priceType: 'fixed' },
      { name: 'Custom Package', duration: 180, price: 0, priceType: 'quote_only' },
    ],
    contextFields: [
      { key: 'service_interest', label: 'Service Interest', type: 'text', required: true },
    ],
    faqs: commonFAQs,
    objections: commonObjections,
    defaultPolicies,
  },
];

// ============= LOOKUP HELPERS =============

/**
 * Get an industry by slug
 */
export function getIndustryBySlug(slug: string): IndustryCatalogEntry | undefined {
  return industryCatalog.find(i => i.slug === slug);
}

/**
 * Get all industries in a category
 */
export function getIndustriesByCategory(category: IndustryCategory): IndustryCatalogEntry[] {
  return industryCatalog.filter(i => i.category === category);
}

/**
 * Get all industries for a business mode
 */
export function getIndustriesByMode(mode: BusinessMode): IndustryCatalogEntry[] {
  return industryCatalog.filter(i => i.businessMode === mode);
}

/**
 * Search industries by query (searches name, tags, and category)
 */
export function searchIndustries(query: string): IndustryCatalogEntry[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return industryCatalog;
  
  return industryCatalog.filter(industry => {
    const searchableText = [
      industry.name,
      industry.slug,
      ...industry.tags,
      categoryLabels[industry.category],
    ].join(' ').toLowerCase();
    
    return searchableText.includes(normalizedQuery);
  });
}

/**
 * Get popular/common industries (first N from catalog)
 */
export function getPopularIndustries(count: number = 15): IndustryCatalogEntry[] {
  // Prioritized popular industries
  const popularSlugs = [
    'plumbing', 'hvac', 'electrical', 'auto_detailing', 'salon', 
    'dental', 'restaurant', 'cleaning', 'towing', 'massage',
    'landscaping', 'personal_training', 'photography', 'roofing', 'pest_control'
  ];
  
  return popularSlugs
    .map(slug => getIndustryBySlug(slug))
    .filter((i): i is IndustryCatalogEntry => i !== undefined)
    .slice(0, count);
}

/**
 * Normalize legacy industry values to new slugs
 */
export function normalizeIndustrySlug(legacyValue: string): string {
  const normalizations: Record<string, string> = {
    'detailing': 'auto_detailing',
    'plumber': 'plumbing',
    'medspa': 'medspa',
    'tire_shop': 'tire_shop',
    'cleaning': 'cleaning',
    'fitness': 'personal_training',
    'pet_grooming': 'pet_grooming',
    'towing': 'towing',
    'locksmith': 'locksmith',
    'pool_service': 'pool_service',
    'moving': 'moving',
    'photography': 'photography',
    'salon': 'salon',
  };
  
  return normalizations[legacyValue] || legacyValue;
}

/**
 * Get all available industry slugs (for type checking)
 */
export function getAllIndustrySlugs(): string[] {
  return industryCatalog.map(i => i.slug);
}

// Export catalog count for UI messaging
export const INDUSTRY_COUNT = industryCatalog.length;
