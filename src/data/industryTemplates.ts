// Industry-specific service templates and context fields for CloseLoop

export interface ServiceTemplate {
  name: string;
  duration: number; // minutes
  price: number;
  priceType: 'fixed' | 'starting_at' | 'quote_only';
  depositAmount?: number;
}

export interface ContextField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  required: boolean;
}

export interface IndustryConfig {
  label: string;
  icon: string;
  services: ServiceTemplate[];
  contextFields: ContextField[];
}

export type ExtendedIndustryType = 
  | 'detailing' | 'hvac' | 'plumber' | 'medspa' | 'dental' | 'other'
  | 'tire_shop' | 'cleaning' | 'landscaping' | 'pest_control' | 'roofing'
  | 'electrical' | 'pool_service' | 'moving' | 'salon' | 'fitness'
  | 'photography' | 'pet_grooming' | 'towing' | 'locksmith';

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
