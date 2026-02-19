// Industry-specific service templates, context fields, FAQs, and objection handlers for CloseLoop

export interface ServiceTemplate {
  name: string;
  duration: number; // minutes
  price: number;
  priceType: 'fixed' | 'starting_at' | 'quote_only';
  description?: string;
  depositAmount?: number;
  /** Visual grouping: "Standard Services", "Premium", "Add-Ons" */
  category?: string;
  /** Pricing context for onboarding: "Most shops charge $95-$150/hr" */
  pricingNote?: string;
  /** Sort order within category (lower = first) */
  popularityRank?: number;
}

export interface ContextField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  required: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ObjectionResponse {
  objection: string;
  response: string;
}

export interface IndustryConfig {
  label: string;
  icon: string;
  services: ServiceTemplate[];
  contextFields: ContextField[];
  faqs: FAQ[];
  objections: ObjectionResponse[];
  defaultPolicies: {
    cancellation: string;
    deposit: string;
    refund: string;
  };
}

export type ExtendedIndustryType = 
  | 'detailing' | 'hvac' | 'plumber' | 'medspa' | 'dental' | 'other'
  | 'tire_shop' | 'cleaning' | 'landscaping' | 'pest_control' | 'roofing'
  | 'electrical' | 'pool_service' | 'moving' | 'salon' | 'fitness'
  | 'photography' | 'pet_grooming' | 'towing' | 'locksmith';

// Common objections that apply to most industries
const commonObjections: ObjectionResponse[] = [
  {
    objection: "That's too expensive",
    response: "I understand price is important. We focus on quality and most customers find the value exceeds the cost. Would you like to hear about our most popular package?"
  },
  {
    objection: "I need to think about it",
    response: "Of course! Would it help if I answered any specific questions? I can also hold a spot for you for 24 hours."
  },
  {
    objection: "I'll call back later",
    response: "No problem! Would you like me to send you a text with our info and a link to book when you're ready?"
  },
  {
    objection: "Can I get a discount?",
    response: "We offer our best pricing upfront, but we do have special packages. Let me tell you about those options."
  },
  {
    objection: "I'm just shopping around",
    response: "That makes sense! What's most important to you when choosing a provider? I'd love to share what sets us apart."
  },
];

// Common FAQs that apply to most industries — all answers pre-filled with sensible defaults
const commonFAQs: FAQ[] = [
  { question: "What are your hours?", answer: "Our hours are listed on our website. Please call and we'll let you know our current availability." },
  { question: "Do you require a deposit?", answer: "We may require a deposit depending on the service. Our team will let you know the details when booking." },
  { question: "What forms of payment do you accept?", answer: "We accept all major credit cards, debit cards, and cash. Please ask about other payment options." },
  { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed and insured for your protection." },
  { question: "What's your cancellation policy?", answer: "We ask for at least 24 hours notice if you need to cancel or reschedule. Late cancellations may incur a fee." },
];

const defaultPolicies = {
  cancellation: "Free cancellation up to 24 hours before your appointment. Less than 24 hours notice may incur a cancellation fee.",
  deposit: "We require a deposit to secure your appointment. The deposit is applied to your final bill.",
  refund: "We stand behind our work. If you're not satisfied, please let us know and we'll make it right.",
};

export const industryConfigs: Record<ExtendedIndustryType, IndustryConfig> = {
  tire_shop: {
    label: 'Tire Shop / Auto Repair',
    icon: '🚗',
    services: [
      { name: 'Tire Rotation', duration: 30, price: 25, priceType: 'fixed' },
      { name: 'Flat Tire Repair', duration: 45, price: 35, priceType: 'fixed' },
      { name: 'Tire Installation (4)', duration: 60, price: 80, priceType: 'fixed' },
      { name: 'Wheel Alignment', duration: 60, price: 89, priceType: 'fixed' },
      { name: 'Brake Inspection', duration: 30, price: 0, priceType: 'fixed' },
      { name: 'Oil Change', duration: 30, price: 45, priceType: 'fixed' },
      { name: 'Battery Replacement', duration: 30, price: 150, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'vehicle_make', label: 'Vehicle Make', type: 'text', required: true },
      { key: 'vehicle_model', label: 'Vehicle Model', type: 'text', required: true },
      { key: 'vehicle_year', label: 'Vehicle Year', type: 'number', required: true },
      { key: 'mileage', label: 'Mileage', type: 'number', required: false },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you sell tires?", answer: "Yes, we carry a wide selection of tires from top brands. We can help you find the right tires for your vehicle and budget." },
      { question: "How long does a tire installation take?", answer: "A standard 4-tire installation typically takes about 45-60 minutes." },
      { question: "Do you offer a warranty on tires?", answer: "Yes, all our tires come with manufacturer warranties. We also offer road hazard protection for an additional fee." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  detailing: {
    label: 'Auto Detailing',
    icon: '✨',
    services: [
      { name: 'Basic Wash', duration: 60, price: 50, priceType: 'fixed' },
      { name: 'Interior Detail', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Exterior Detail', duration: 120, price: 125, priceType: 'starting_at' },
      { name: 'Full Detail', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Ceramic Coating', duration: 480, price: 800, priceType: 'starting_at' },
      { name: 'Paint Correction', duration: 240, price: 400, priceType: 'starting_at' },
      { name: 'Headlight Restoration', duration: 60, price: 75, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'vehicle_type', label: 'Vehicle Type', type: 'select', options: ['Sedan', 'SUV', 'Truck', 'Van', 'Sports Car', 'Motorcycle'], required: true },
      { key: 'vehicle_size', label: 'Vehicle Size', type: 'select', options: ['Small', 'Medium', 'Large', 'XL'], required: true },
      { key: 'current_condition', label: 'Current Condition', type: 'select', options: ['Light dirt', 'Moderate dirt', 'Heavy dirt', 'Very dirty'], required: false },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you come to me or do I bring my car?", answer: "We offer both mobile service and shop service. Mobile service is available within our service area." },
      { question: "How long does a full detail take?", answer: "A full detail typically takes 3-4 hours depending on the size and condition of your vehicle." },
      { question: "What's the difference between a wash and a detail?", answer: "A wash cleans the exterior surface, while a detail is a thorough cleaning inside and out, including protection treatments." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  hvac: {
    label: 'HVAC',
    icon: '❄️',
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
    faqs: [
      ...commonFAQs,
      { question: "Do you offer emergency service?", answer: "Yes, we offer 24/7 emergency service. There may be an additional fee for after-hours calls." },
      { question: "How often should I have my HVAC serviced?", answer: "We recommend servicing your system twice a year - once in spring for AC and once in fall for heating." },
      { question: "Do you service all brands?", answer: "Yes, our technicians are trained to service all major HVAC brands." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  plumber: {
    label: 'Plumbing',
    icon: '🔧',
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
    faqs: [
      ...commonFAQs,
      { question: "Do you offer emergency plumbing?", answer: "Yes, we offer 24/7 emergency plumbing services. Call us anytime and we'll be there." },
      { question: "Do you provide free estimates?", answer: "We provide free estimates for most jobs. For diagnostic work, there may be a small fee that's waived if you proceed with the repair." },
      { question: "Do you guarantee your work?", answer: "Yes, all our work comes with a satisfaction guarantee. We stand behind every job we do." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  medspa: {
    label: 'Med Spa',
    icon: '💆',
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
    faqs: [
      ...commonFAQs,
      { question: "Is the consultation free?", answer: "Yes, we offer complimentary consultations to discuss your goals and recommend the best treatment plan." },
      { question: "How long do results last?", answer: "Results vary by treatment. Botox typically lasts 3-4 months, while fillers can last 6-18 months." },
      { question: "Is there any downtime?", answer: "Most of our treatments have minimal to no downtime. We'll discuss specific recovery expectations during your consultation." },
    ],
    objections: [
      ...commonObjections,
      { objection: "I'm worried it will look unnatural", response: "Our goal is always natural-looking results. We take a conservative approach and can always add more if needed." },
    ],
    defaultPolicies: {
      ...defaultPolicies,
      cancellation: "We require 48 hours notice for cancellations. Late cancellations or no-shows may be charged a fee.",
    },
  },
  dental: {
    label: 'Dental',
    icon: '🦷',
    services: [
      { name: 'Cleaning', duration: 60, price: 150, priceType: 'fixed' },
      { name: 'Whitening', duration: 90, price: 400, priceType: 'fixed' },
      { name: 'Consultation', duration: 30, price: 75, priceType: 'fixed' },
      { name: 'Filling', duration: 60, price: 200, priceType: 'starting_at' },
      { name: 'Crown', duration: 90, price: 1200, priceType: 'starting_at' },
      { name: 'Root Canal', duration: 120, price: 800, priceType: 'starting_at' },
      { name: 'Emergency Visit', duration: 60, price: 250, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'insurance_provider', label: 'Insurance Provider', type: 'text', required: false },
      { key: 'procedure_type', label: 'Procedure Type', type: 'text', required: true },
      { key: 'is_new_patient', label: 'New Patient?', type: 'select', options: ['Yes', 'No'], required: true },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you accept my insurance?", answer: "We accept most major dental insurance plans. Let me know your provider and I can verify your coverage." },
      { question: "Do you offer payment plans?", answer: "Yes, we offer flexible payment plans and financing options to make dental care affordable." },
      { question: "Are you accepting new patients?", answer: "Yes! We're always welcoming new patients. We'd love to have you join our dental family." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  cleaning: {
    label: 'Cleaning Services',
    icon: '🧹',
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
    faqs: [
      ...commonFAQs,
      { question: "Do you bring your own supplies?", answer: "Yes, we bring all cleaning supplies and equipment. If you have preferences for specific products, just let us know." },
      { question: "Are your cleaners background checked?", answer: "Yes, all our cleaning professionals undergo thorough background checks and are fully insured." },
      { question: "What if I'm not satisfied?", answer: "Your satisfaction is guaranteed. If you're not happy with any area, let us know within 24 hours and we'll re-clean it for free." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  landscaping: {
    label: 'Landscaping / Lawn Care',
    icon: '🌿',
    services: [
      { name: 'Lawn Mowing', duration: 60, price: 50, priceType: 'starting_at' },
      { name: 'Hedge Trimming', duration: 60, price: 75, priceType: 'starting_at' },
      { name: 'Mulching', duration: 120, price: 200, priceType: 'starting_at' },
      { name: 'Spring Cleanup', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Fall Cleanup', duration: 180, price: 250, priceType: 'starting_at' },
      { name: 'Landscape Design', duration: 120, price: 0, priceType: 'quote_only' },
      { name: 'Irrigation Repair', duration: 90, price: 125, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'property_size', label: 'Lot Size (sq ft)', type: 'number', required: true },
      { key: 'service_frequency', label: 'Service Frequency', type: 'select', options: ['One-time', 'Weekly', 'Bi-weekly', 'Monthly'], required: true },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do you offer weekly service?", answer: "Yes, we offer weekly, bi-weekly, and monthly service plans. Weekly clients get priority scheduling." },
      { question: "What if it rains?", answer: "If weather prevents us from working, we'll reschedule for the next available day at no extra charge." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  pest_control: {
    label: 'Pest Control',
    icon: '🐜',
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
    faqs: [
      ...commonFAQs,
      { question: "Is the treatment safe for pets?", answer: "Yes, our treatments are pet-friendly. We'll give you specific instructions for your situation." },
      { question: "How soon will I see results?", answer: "Most customers see significant improvement within 1-2 weeks. Some treatments may require follow-up visits." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  roofing: {
    label: 'Roofing',
    icon: '🏠',
    services: [
      { name: 'Roof Inspection', duration: 60, price: 0, priceType: 'fixed' },
      { name: 'Leak Repair', duration: 120, price: 350, priceType: 'starting_at' },
      { name: 'Shingle Replacement', duration: 180, price: 500, priceType: 'starting_at' },
      { name: 'Gutter Cleaning', duration: 90, price: 150, priceType: 'starting_at' },
      { name: 'Gutter Installation', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Full Roof Replacement', duration: 480, price: 0, priceType: 'quote_only' },
    ],
    contextFields: [
      { key: 'roof_type', label: 'Roof Type', type: 'select', options: ['Shingle', 'Metal', 'Tile', 'Flat', 'Unknown'], required: true },
      { key: 'issue_description', label: 'Issue Description', type: 'text', required: true },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Is the inspection really free?", answer: "Yes, roof inspections are completely free with no obligation." },
      { question: "Do you work with insurance companies?", answer: "Yes, we work directly with insurance companies and can help you navigate the claims process." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  electrical: {
    label: 'Electrical',
    icon: '⚡',
    services: [
      { name: 'Electrical Inspection', duration: 60, price: 99, priceType: 'fixed' },
      { name: 'Outlet Installation', duration: 60, price: 150, priceType: 'starting_at' },
      { name: 'Light Fixture Installation', duration: 60, price: 125, priceType: 'starting_at' },
      { name: 'Panel Upgrade', duration: 240, price: 0, priceType: 'quote_only' },
      { name: 'Ceiling Fan Installation', duration: 90, price: 175, priceType: 'starting_at' },
      { name: 'Emergency Service', duration: 60, price: 199, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Commercial'], required: true },
      { key: 'issue_description', label: 'Issue Description', type: 'text', required: true },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Are your electricians licensed?", answer: "Yes, all our electricians are fully licensed, bonded, and insured." },
      { question: "Do you offer emergency service?", answer: "Yes, we offer 24/7 emergency electrical service for urgent situations." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  pool_service: {
    label: 'Pool Service',
    icon: '🏊',
    services: [
      { name: 'Weekly Cleaning', duration: 45, price: 125, priceType: 'fixed' },
      { name: 'Pool Opening', duration: 120, price: 250, priceType: 'fixed' },
      { name: 'Pool Closing', duration: 120, price: 250, priceType: 'fixed' },
      { name: 'Equipment Repair', duration: 120, price: 150, priceType: 'starting_at' },
      { name: 'Acid Wash', duration: 240, price: 400, priceType: 'starting_at' },
      { name: 'Leak Detection', duration: 90, price: 200, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'pool_type', label: 'Pool Type', type: 'select', options: ['In-ground', 'Above-ground', 'Hot tub/Spa'], required: true },
      { key: 'pool_size', label: 'Pool Size (gallons)', type: 'number', required: false },
    ],
    faqs: [
      ...commonFAQs,
      { question: "What does weekly service include?", answer: "Our weekly service includes skimming, brushing, vacuuming, chemical testing and balancing, and equipment check." },
      { question: "Do you service hot tubs?", answer: "Yes, we service both pools and hot tubs/spas." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  moving: {
    label: 'Moving Company',
    icon: '📦',
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
    faqs: [
      ...commonFAQs,
      { question: "Are you insured?", answer: "Yes, we are fully licensed and insured. We also offer additional coverage options for valuable items." },
      { question: "Do you provide packing materials?", answer: "Yes, we can provide boxes, tape, and packing materials. These can be included in your quote." },
    ],
    objections: commonObjections,
    defaultPolicies: {
      ...defaultPolicies,
      deposit: "We require a deposit to reserve your moving date. The amount depends on the size of the move.",
    },
  },
  salon: {
    label: 'Salon / Barbershop',
    icon: '💇',
    services: [
      { name: 'Haircut', duration: 30, price: 35, priceType: 'starting_at' },
      { name: 'Hair Color', duration: 120, price: 100, priceType: 'starting_at' },
      { name: 'Highlights', duration: 150, price: 150, priceType: 'starting_at' },
      { name: 'Blowout', duration: 45, price: 50, priceType: 'fixed' },
      { name: 'Beard Trim', duration: 15, price: 15, priceType: 'fixed' },
      { name: 'Hair Treatment', duration: 60, price: 75, priceType: 'starting_at' },
      { name: 'Updo/Styling', duration: 60, price: 80, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'hair_length', label: 'Hair Length', type: 'select', options: ['Short', 'Medium', 'Long', 'Very Long'], required: false },
      { key: 'service_interest', label: 'Service Interest', type: 'text', required: true },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Do I need an appointment?", answer: "Appointments are recommended but we do accept walk-ins when available." },
      { question: "Do you do color corrections?", answer: "Yes, we specialize in color corrections. These require a consultation first to assess your hair." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  fitness: {
    label: 'Fitness / Personal Training',
    icon: '💪',
    services: [
      { name: 'Personal Training Session', duration: 60, price: 80, priceType: 'fixed' },
      { name: 'Group Class', duration: 60, price: 25, priceType: 'fixed' },
      { name: 'Fitness Assessment', duration: 60, price: 0, priceType: 'fixed' },
      { name: '5-Pack Sessions', duration: 60, price: 350, priceType: 'fixed' },
      { name: '10-Pack Sessions', duration: 60, price: 650, priceType: 'fixed' },
      { name: 'Monthly Membership', duration: 60, price: 99, priceType: 'fixed' },
    ],
    contextFields: [
      { key: 'fitness_goals', label: 'Fitness Goals', type: 'text', required: true },
      { key: 'experience_level', label: 'Experience Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: true },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Is the fitness assessment free?", answer: "Yes, we offer a complimentary fitness assessment to help create your personalized plan." },
      { question: "Can I try a class before committing?", answer: "Absolutely! Your first class is on us so you can see if it's a good fit." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  photography: {
    label: 'Photography',
    icon: '📸',
    services: [
      { name: 'Portrait Session', duration: 60, price: 200, priceType: 'starting_at' },
      { name: 'Family Session', duration: 90, price: 300, priceType: 'starting_at' },
      { name: 'Headshots', duration: 30, price: 150, priceType: 'fixed' },
      { name: 'Event Coverage (4hr)', duration: 240, price: 800, priceType: 'starting_at' },
      { name: 'Wedding Photography', duration: 480, price: 2500, priceType: 'starting_at' },
      { name: 'Product Photography', duration: 120, price: 400, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'session_type', label: 'Session Type', type: 'text', required: true },
      { key: 'location', label: 'Preferred Location', type: 'select', options: ['Studio', 'Outdoor', 'Client Location'], required: true },
      { key: 'num_people', label: 'Number of People', type: 'number', required: false },
    ],
    faqs: [
      ...commonFAQs,
      { question: "How many photos will I receive?", answer: "The number of photos varies by session type. Typically you'll receive 25-50 edited images for a standard session." },
      { question: "Do you provide prints?", answer: "Yes, we offer professional printing services. Packages that include prints are also available." },
    ],
    objections: commonObjections,
    defaultPolicies: {
      ...defaultPolicies,
      deposit: "A 25% deposit is required to secure your session date. The remaining balance is due before delivery of final images.",
    },
  },
  pet_grooming: {
    label: 'Pet Grooming',
    icon: '🐕',
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
    faqs: [
      ...commonFAQs,
      { question: "Do you groom cats?", answer: "Yes, we groom both dogs and cats. Let us know your pet's temperament so we can prepare." },
      { question: "How long does grooming take?", answer: "Grooming typically takes 1-3 hours depending on the size, breed, and services requested." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  towing: {
    label: 'Towing',
    icon: '🚛',
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
      { key: 'location', label: 'Current Location', type: 'text', required: true },
      { key: 'destination', label: 'Destination', type: 'text', required: false },
    ],
    faqs: [
      ...commonFAQs,
      { question: "How fast can you get here?", answer: "Our average response time is 30-45 minutes, but it varies by location and demand." },
      { question: "Do you tow motorcycles?", answer: "Yes, we have equipment to safely transport motorcycles." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  locksmith: {
    label: 'Locksmith',
    icon: '🔐',
    services: [
      { name: 'House Lockout', duration: 30, price: 85, priceType: 'starting_at' },
      { name: 'Car Lockout', duration: 30, price: 75, priceType: 'starting_at' },
      { name: 'Lock Rekey', duration: 30, price: 25, priceType: 'fixed' },
      { name: 'Lock Installation', duration: 45, price: 100, priceType: 'starting_at' },
      { name: 'Key Duplication', duration: 15, price: 5, priceType: 'starting_at' },
      { name: 'Safe Cracking', duration: 120, price: 200, priceType: 'starting_at' },
    ],
    contextFields: [
      { key: 'service_type', label: 'Service Type', type: 'select', options: ['Residential', 'Automotive', 'Commercial'], required: true },
      { key: 'urgency', label: 'Urgency', type: 'select', options: ['Not urgent', 'Soon', 'Emergency'], required: true },
    ],
    faqs: [
      ...commonFAQs,
      { question: "Are you available 24/7?", answer: "Yes, we offer 24/7 emergency locksmith services." },
      { question: "Will you damage my lock?", answer: "We use non-destructive entry techniques whenever possible. If damage is necessary, we'll explain before proceeding." },
    ],
    objections: commonObjections,
    defaultPolicies,
  },
  other: {
    label: 'Other',
    icon: '🏢',
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
};

// Helper to get all industries as options for select
export const industryOptions = Object.entries(industryConfigs).map(([value, config]) => ({
  value: value as ExtendedIndustryType,
  label: config.label,
  icon: config.icon,
}));

// Duration options for the service editor
export const durationOptions = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 300, label: '5 hours' },
  { value: 360, label: '6 hours' },
  { value: 480, label: '8 hours' },
];

// Price type options
export const priceTypeOptions = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'starting_at', label: 'Starting At' },
  { value: 'quote_only', label: 'Quote Only' },
];
