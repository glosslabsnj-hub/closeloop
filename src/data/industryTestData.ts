import type { BusinessMode } from "@/types/database";

export interface IndustryTestData {
  tenantName: string;
  services: Array<{
    name: string;
    description: string;
    duration_minutes: number;
    price_amount: number | null;
    price_type: "fixed" | "starting_at" | "quote_only";
  }>;
  faqs: Array<{ question: string; answer: string }>;
  policies: Array<{ title: string; content: string; type: "faq" | "objection" | "policy" | "upsell" }>;
  objections: Array<{ objection: string; response: string }>;
  hours: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
  calls: Array<{
    customer_name: string;
    service_requested: string;
    summary: string;
    outcome: "booked" | "followup" | "lost" | "escalated";
    context_extra?: Record<string, unknown>;
  }>;
  // Industry-specific data
  menuItems?: Array<{
    name: string;
    category: string;
    description: string;
    price_cents: number;
    dietary_tags: string[];
    prep_time_minutes: number;
    is_available: boolean;
  }>;
  reservations?: Array<{
    customer_name: string;
    customer_phone: string;
    party_size: number;
    reservation_date: string; // Will be computed relative to "now"
    reservation_time: string;
    status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
    special_requests: string | null;
    table_preference: string | null;
  }>;
  orders?: Array<{
    order_number: string;
    order_type: "pickup" | "delivery";
    customer_name: string;
    customer_phone: string;
    items_json: Array<{ name: string; quantity: number; price_cents: number }>;
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
    status: "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
    special_instructions: string | null;
    delivery_address: string | null;
  }>;
  cateringRequests?: Array<{
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    event_type: string;
    event_date: string;
    event_time: string;
    guest_count: number;
    budget_range: string;
    menu_preferences: string;
    dietary_restrictions: string | null;
    location: string;
    status: "inquiry" | "quoted" | "confirmed" | "completed" | "cancelled";
    quote_amount_cents: number | null;
    notes: string | null;
  }>;
  dispatchJobs?: Array<{
    job_number: string;
    job_type: string;
    priority: "low" | "normal" | "high" | "urgent";
    status: "pending" | "assigned" | "en_route" | "on_site" | "completed" | "cancelled";
    customer_name: string;
    customer_phone: string;
    pickup_address: string;
    dropoff_address: string | null;
    description: string;
    assigned_crew: string | null;
    assigned_vehicle: string | null;
    estimated_duration_minutes: number;
    price_cents: number | null;
    notes: string | null;
  }>;
  medicalIntakes?: Array<{
    intake_type: string;
    urgency_level: "routine" | "soon" | "urgent";
    reason_for_visit: string;
    status: "pending" | "scheduled" | "completed" | "cancelled";
    verbal_consent_given: boolean;
    insurance_provider: string | null;
    preferred_date: string;
    preferred_time_range: string;
    ai_summary: string | null;
  }>;
}

// Test phone numbers that stay constant across mode switches
export const TEST_PHONES = [
  "+15551234567",
  "+15559876543",
  "+15552223333",
  "+15554445555",
  "+15556667777",
];

// Standard business hours (Mon-Fri 9-5, Sat 10-3, Sun closed)
const STANDARD_HOURS = [
  { day_of_week: 0, start_time: "09:00", end_time: "17:00", is_available: false }, // Sun
  { day_of_week: 1, start_time: "09:00", end_time: "17:00", is_available: true },  // Mon
  { day_of_week: 2, start_time: "09:00", end_time: "17:00", is_available: true },  // Tue
  { day_of_week: 3, start_time: "09:00", end_time: "17:00", is_available: true },  // Wed
  { day_of_week: 4, start_time: "09:00", end_time: "17:00", is_available: true },  // Thu
  { day_of_week: 5, start_time: "09:00", end_time: "17:00", is_available: true },  // Fri
  { day_of_week: 6, start_time: "10:00", end_time: "15:00", is_available: true },  // Sat
];

// Restaurant hours (11am-10pm most days)
const RESTAURANT_HOURS = [
  { day_of_week: 0, start_time: "11:00", end_time: "21:00", is_available: true },  // Sun
  { day_of_week: 1, start_time: "11:00", end_time: "22:00", is_available: false }, // Mon (closed)
  { day_of_week: 2, start_time: "11:00", end_time: "22:00", is_available: true },  // Tue
  { day_of_week: 3, start_time: "11:00", end_time: "22:00", is_available: true },  // Wed
  { day_of_week: 4, start_time: "11:00", end_time: "22:00", is_available: true },  // Thu
  { day_of_week: 5, start_time: "11:00", end_time: "23:00", is_available: true },  // Fri
  { day_of_week: 6, start_time: "11:00", end_time: "23:00", is_available: true },  // Sat
];

// 24/7 dispatch hours
const DISPATCH_HOURS = [
  { day_of_week: 0, start_time: "00:00", end_time: "23:59", is_available: true },
  { day_of_week: 1, start_time: "00:00", end_time: "23:59", is_available: true },
  { day_of_week: 2, start_time: "00:00", end_time: "23:59", is_available: true },
  { day_of_week: 3, start_time: "00:00", end_time: "23:59", is_available: true },
  { day_of_week: 4, start_time: "00:00", end_time: "23:59", is_available: true },
  { day_of_week: 5, start_time: "00:00", end_time: "23:59", is_available: true },
  { day_of_week: 6, start_time: "00:00", end_time: "23:59", is_available: true },
];

// Medical office hours
const MEDICAL_HOURS = [
  { day_of_week: 0, start_time: "09:00", end_time: "17:00", is_available: false }, // Sun
  { day_of_week: 1, start_time: "08:00", end_time: "18:00", is_available: true },  // Mon
  { day_of_week: 2, start_time: "08:00", end_time: "18:00", is_available: true },  // Tue
  { day_of_week: 3, start_time: "08:00", end_time: "18:00", is_available: true },  // Wed
  { day_of_week: 4, start_time: "08:00", end_time: "18:00", is_available: true },  // Thu
  { day_of_week: 5, start_time: "08:00", end_time: "16:00", is_available: true },  // Fri
  { day_of_week: 6, start_time: "09:00", end_time: "12:00", is_available: true },  // Sat
];

export const INDUSTRY_TEST_DATA: Record<BusinessMode, IndustryTestData> = {
  service: {
    tenantName: "Elite Auto Detailing",
    services: [
      { name: "Express Wash", description: "Quick exterior wash and dry", duration_minutes: 30, price_amount: 35, price_type: "fixed" },
      { name: "Full Interior Detail", description: "Complete interior cleaning including vacuum, wipe down, and conditioning", duration_minutes: 120, price_amount: 150, price_type: "fixed" },
      { name: "Ceramic Coating", description: "Professional ceramic coating application for long-lasting protection", duration_minutes: 240, price_amount: 500, price_type: "starting_at" },
      { name: "Paint Correction", description: "Multi-stage paint correction to remove swirls and scratches", duration_minutes: 480, price_amount: null, price_type: "quote_only" },
    ],
    faqs: [
      { question: "How long does a full detail take?", answer: "A full detail typically takes 2-4 hours depending on vehicle size and condition." },
      { question: "Do you offer mobile detailing?", answer: "Yes! We offer mobile detailing services within a 20-mile radius for an additional $25 travel fee." },
      { question: "What payment methods do you accept?", answer: "We accept cash, all major credit cards, Venmo, and Apple Pay." },
    ],
    policies: [
      { title: "Cancellation Policy", content: "Please provide at least 24 hours notice for cancellations. Late cancellations may incur a 50% fee.", type: "policy" },
      { title: "Satisfaction Guarantee", content: "If you're not 100% satisfied, we'll re-detail the area of concern at no additional charge.", type: "policy" },
    ],
    objections: [
      { objection: "That's too expensive", response: "I understand budget is important. Our prices reflect premium products and attention to detail. We also offer package discounts if you book multiple services." },
      { objection: "I can do it myself", response: "You certainly can! However, our professional-grade equipment and products achieve results that are difficult to replicate at home. Plus, you save hours of your time." },
    ],
    hours: STANDARD_HOURS,
    calls: [
      { customer_name: "Marcus Johnson", service_requested: "Full Interior Detail", summary: "Customer booked a full interior detail for their 2022 Tesla Model 3. Scheduled for Saturday morning.", outcome: "booked", context_extra: { vehicle: "2022 Tesla Model 3" } },
      { customer_name: "Sarah Chen", service_requested: "Ceramic Coating", summary: "Caller asked about ceramic coating prices and package options. Wants to think about it and call back.", outcome: "followup" },
      { customer_name: "Mike Thompson", service_requested: "Express Wash", summary: "Customer was looking for same-day service which was not available. Did not want to schedule ahead.", outcome: "lost" },
      { customer_name: "David Park", service_requested: "Fleet Detailing", summary: "Fleet account inquiry turned into booking for 3 vehicles. Corporate client from downtown law firm.", outcome: "booked" },
    ],
  },
  
  dispatch: {
    tenantName: "City Roadside Rescue",
    services: [
      { name: "Jump Start", description: "Battery jump start service", duration_minutes: 30, price_amount: 65, price_type: "fixed" },
      { name: "Flat Tire Change", description: "Tire change using your spare", duration_minutes: 45, price_amount: 85, price_type: "fixed" },
      { name: "Fuel Delivery", description: "Emergency fuel delivery up to 3 gallons", duration_minutes: 45, price_amount: 75, price_type: "starting_at" },
      { name: "Towing Service", description: "Local towing within 25 miles", duration_minutes: 60, price_amount: 125, price_type: "starting_at" },
      { name: "Lockout Service", description: "Vehicle lockout assistance", duration_minutes: 30, price_amount: 75, price_type: "fixed" },
    ],
    faqs: [
      { question: "How quickly can you get here?", answer: "Our average response time is 30-45 minutes, depending on your location and current demand." },
      { question: "Do you tow motorcycles?", answer: "We don't currently offer motorcycle towing, but we can recommend a specialty service." },
      { question: "Is there a service area limit?", answer: "We serve the greater metro area within a 50-mile radius of downtown." },
    ],
    policies: [
      { title: "Payment Policy", content: "Payment is due upon completion of service. We accept all major credit cards and cash.", type: "policy" },
      { title: "After Hours", content: "We operate 24/7. After-hours calls (10pm-6am) may have a $25 surcharge.", type: "policy" },
    ],
    objections: [
      { objection: "That's more than AAA", response: "You're right that AAA membership has benefits. However, our service is immediate with no annual fees, and we often arrive faster than AAA's contractors." },
      { objection: "I'll just call a friend", response: "Totally understand! If plans change, we're available 24/7. Just call back and we can be there in under an hour." },
    ],
    hours: DISPATCH_HOURS,
    calls: [
      { customer_name: "Jennifer Walsh", service_requested: "Emergency Tire Change", summary: "Emergency roadside assistance dispatched. Customer stranded on Highway 101 with flat tire.", outcome: "booked", context_extra: { location: "Highway 101 Mile 42", urgency: "high" } },
      { customer_name: "Robert Kim", service_requested: "Scheduled Tow", summary: "Scheduled tow for non-running vehicle. Customer needs car towed to mechanic tomorrow morning.", outcome: "booked" },
      { customer_name: "Mike Thompson", service_requested: "Motorcycle Tow", summary: "Caller needed motorcycle towing which we do not offer. Referred to specialty service.", outcome: "lost" },
      { customer_name: "Linda Garcia", service_requested: "Jump Start", summary: "Jump start service requested. Vehicle at grocery store parking lot with dead battery.", outcome: "booked" },
    ],
    dispatchJobs: [
      {
        job_number: "JOB-1001",
        job_type: "Flat Tire Change",
        priority: "urgent",
        status: "en_route",
        customer_name: "Jennifer Walsh",
        customer_phone: TEST_PHONES[0],
        pickup_address: "Highway 101, Mile Marker 42, Northbound",
        dropoff_address: null,
        description: "Flat rear driver-side tire, customer has spare in trunk",
        assigned_crew: "Mike T.",
        assigned_vehicle: "Truck #3",
        estimated_duration_minutes: 45,
        price_cents: 8500,
        notes: "Customer is a woman alone, prioritize this call",
      },
      {
        job_number: "JOB-1002",
        job_type: "Jump Start",
        priority: "high",
        status: "pending",
        customer_name: "Robert Kim",
        customer_phone: TEST_PHONES[1],
        pickup_address: "123 Main Street, Downtown",
        dropoff_address: null,
        description: "Battery dead, vehicle won't start after sitting overnight",
        assigned_crew: null,
        assigned_vehicle: null,
        estimated_duration_minutes: 30,
        price_cents: 6500,
        notes: null,
      },
      {
        job_number: "JOB-1003",
        job_type: "Towing",
        priority: "normal",
        status: "assigned",
        customer_name: "Sarah Martinez",
        customer_phone: TEST_PHONES[2],
        pickup_address: "456 Oak Avenue",
        dropoff_address: "Jim's Auto Repair, 789 Industrial Blvd",
        description: "Non-running vehicle needs tow to mechanic. 2019 Honda Accord.",
        assigned_crew: "Dave R.",
        assigned_vehicle: "Flatbed #1",
        estimated_duration_minutes: 60,
        price_cents: 12500,
        notes: "Scheduled for tomorrow 9am pickup",
      },
      {
        job_number: "JOB-1004",
        job_type: "Lockout",
        priority: "normal",
        status: "on_site",
        customer_name: "Linda Garcia",
        customer_phone: TEST_PHONES[3],
        pickup_address: "Westfield Mall, Parking Lot B, Level 2",
        dropoff_address: null,
        description: "Keys locked inside 2021 Toyota Camry",
        assigned_crew: "Mike T.",
        assigned_vehicle: "Van #2",
        estimated_duration_minutes: 30,
        price_cents: 7500,
        notes: "Near Macy's entrance",
      },
      {
        job_number: "JOB-1005",
        job_type: "Scheduled Tow",
        priority: "low",
        status: "completed",
        customer_name: "James Wilson",
        customer_phone: TEST_PHONES[4],
        pickup_address: "789 Elm Street",
        dropoff_address: "City Impound Lot",
        description: "Abandoned vehicle tow per city contract",
        assigned_crew: "Dave R.",
        assigned_vehicle: "Flatbed #1",
        estimated_duration_minutes: 45,
        price_cents: 15000,
        notes: "Completed at 2:30 PM",
      },
    ],
  },
  
  food: {
    tenantName: "Bella Italia Ristorante",
    services: [
      { name: "Dine-In Reservation", description: "Table reservation for our dining room", duration_minutes: 90, price_amount: null, price_type: "quote_only" },
      { name: "Private Event", description: "Private dining room for special occasions", duration_minutes: 180, price_amount: 500, price_type: "starting_at" },
      { name: "Catering - Small", description: "Catering for 10-25 guests", duration_minutes: 120, price_amount: 25, price_type: "starting_at" },
      { name: "Catering - Large", description: "Catering for 25-100 guests", duration_minutes: 180, price_amount: 22, price_type: "starting_at" },
    ],
    faqs: [
      { question: "Do you have vegetarian options?", answer: "Yes! We have an extensive vegetarian menu including our famous Eggplant Parmigiana and several pasta dishes." },
      { question: "Do you take reservations?", answer: "Absolutely! We recommend reservations for dinner, especially on weekends. Walk-ins are welcome but may have a wait." },
      { question: "Is there parking available?", answer: "We have a small lot behind the restaurant and free street parking after 6pm." },
      { question: "Do you offer gluten-free options?", answer: "Yes, we have gluten-free pasta available for any pasta dish, and many of our entrees are naturally gluten-free." },
    ],
    policies: [
      { title: "Reservation Policy", content: "Please arrive within 15 minutes of your reservation time. After 15 minutes, your table may be released.", type: "policy" },
      { title: "Large Party", content: "Parties of 8 or more require a credit card to hold the reservation. Cancellations within 24 hours incur a $25/person fee.", type: "policy" },
      { title: "Catering Deposit", content: "Catering orders require a 50% deposit at booking, with the balance due on the day of the event.", type: "policy" },
    ],
    objections: [
      { objection: "The wait is too long", response: "I understand! We can put you on the waitlist and text you when your table is ready—feel free to grab a drink at the bar or take a walk. I can also check if we have earlier availability on another day." },
      { objection: "Do you have any discounts?", response: "We offer a 10% discount for parties of 10 or more, and we have daily specials. Ask your server about our loyalty program too!" },
    ],
    hours: RESTAURANT_HOURS,
    calls: [
      { customer_name: "Thomas Anderson", service_requested: "Reservation - 6 guests", summary: "Table reservation for 6 people this Friday at 7pm. Special occasion - anniversary dinner.", outcome: "booked" },
      { customer_name: "Amanda Foster", service_requested: "Catering Quote", summary: "Catering inquiry for office event. 50 people, needs menu options and quote.", outcome: "followup" },
      { customer_name: "Chris Martinez", service_requested: "Takeout Order", summary: "Takeout order placed: 2 pad thai, 1 green curry, spring rolls. Ready in 25 mins.", outcome: "booked" },
      { customer_name: "Emily White", service_requested: "Dietary Inquiry", summary: "Caller wanted gluten-free options. Our menu has limited GF items. They decided to try elsewhere.", outcome: "lost" },
    ],
    menuItems: [
      // Appetizers
      { name: "Bruschetta", category: "Appetizers", description: "Grilled bread topped with diced tomatoes, fresh basil, and garlic", price_cents: 999, dietary_tags: ["vegetarian"], prep_time_minutes: 10, is_available: true },
      { name: "Calamari Fritti", category: "Appetizers", description: "Crispy fried calamari with marinara and lemon aioli", price_cents: 1499, dietary_tags: [], prep_time_minutes: 15, is_available: true },
      { name: "Caprese Salad", category: "Appetizers", description: "Fresh mozzarella, tomatoes, and basil with balsamic glaze", price_cents: 1299, dietary_tags: ["vegetarian", "gluten-free"], prep_time_minutes: 8, is_available: true },
      // Pasta
      { name: "Spaghetti Carbonara", category: "Pasta", description: "Classic carbonara with pancetta, egg, and pecorino romano", price_cents: 1899, dietary_tags: [], prep_time_minutes: 20, is_available: true },
      { name: "Fettuccine Alfredo", category: "Pasta", description: "Creamy parmesan sauce with fresh fettuccine", price_cents: 1699, dietary_tags: ["vegetarian"], prep_time_minutes: 18, is_available: true },
      { name: "Penne Arrabbiata", category: "Pasta", description: "Spicy tomato sauce with garlic and red pepper flakes", price_cents: 1599, dietary_tags: ["vegetarian", "vegan-option"], prep_time_minutes: 15, is_available: true },
      { name: "Lasagna Bolognese", category: "Pasta", description: "Layers of fresh pasta with beef ragù and béchamel", price_cents: 2199, dietary_tags: [], prep_time_minutes: 25, is_available: true },
      // Pizza
      { name: "Margherita Pizza", category: "Pizza", description: "San Marzano tomatoes, fresh mozzarella, and basil", price_cents: 1599, dietary_tags: ["vegetarian"], prep_time_minutes: 15, is_available: true },
      { name: "Pepperoni Pizza", category: "Pizza", description: "Classic pepperoni with mozzarella and tomato sauce", price_cents: 1799, dietary_tags: [], prep_time_minutes: 15, is_available: true },
      { name: "Quattro Formaggi", category: "Pizza", description: "Four cheese pizza with mozzarella, gorgonzola, fontina, and parmesan", price_cents: 1899, dietary_tags: ["vegetarian"], prep_time_minutes: 15, is_available: true },
      // Entrees
      { name: "Chicken Parmigiana", category: "Entrees", description: "Breaded chicken cutlet with marinara and melted mozzarella", price_cents: 2299, dietary_tags: [], prep_time_minutes: 25, is_available: true },
      { name: "Eggplant Parmigiana", category: "Entrees", description: "Breaded eggplant layered with marinara and mozzarella", price_cents: 1999, dietary_tags: ["vegetarian"], prep_time_minutes: 25, is_available: true },
      { name: "Grilled Salmon", category: "Entrees", description: "Atlantic salmon with lemon butter, capers, and vegetables", price_cents: 2699, dietary_tags: ["gluten-free"], prep_time_minutes: 20, is_available: true },
      // Desserts
      { name: "Tiramisu", category: "Desserts", description: "Classic Italian dessert with espresso-soaked ladyfingers and mascarpone", price_cents: 899, dietary_tags: ["vegetarian"], prep_time_minutes: 5, is_available: true },
      { name: "Cannoli", category: "Desserts", description: "Crispy pastry shells filled with sweet ricotta cream", price_cents: 699, dietary_tags: ["vegetarian"], prep_time_minutes: 5, is_available: true },
      { name: "Panna Cotta", category: "Desserts", description: "Vanilla cream with mixed berry compote", price_cents: 799, dietary_tags: ["vegetarian", "gluten-free"], prep_time_minutes: 5, is_available: true },
      // Drinks
      { name: "House Red Wine (Glass)", category: "Drinks", description: "Montepulciano d'Abruzzo", price_cents: 900, dietary_tags: ["vegan", "gluten-free"], prep_time_minutes: 2, is_available: true },
      { name: "House White Wine (Glass)", category: "Drinks", description: "Pinot Grigio", price_cents: 900, dietary_tags: ["vegan", "gluten-free"], prep_time_minutes: 2, is_available: true },
      { name: "Espresso", category: "Drinks", description: "Traditional Italian espresso", price_cents: 350, dietary_tags: ["vegan", "gluten-free"], prep_time_minutes: 3, is_available: true },
    ],
    reservations: [
      {
        customer_name: "John Smith",
        customer_phone: TEST_PHONES[0],
        party_size: 6,
        reservation_date: "FRIDAY", // Will be computed
        reservation_time: "19:00",
        status: "confirmed",
        special_requests: "Anniversary dinner, would love a quiet corner table if possible",
        table_preference: "booth",
      },
      {
        customer_name: "Emily Johnson",
        customer_phone: TEST_PHONES[1],
        party_size: 2,
        reservation_date: "SATURDAY", // Will be computed
        reservation_time: "18:30",
        status: "pending",
        special_requests: "Patio seating if weather permits",
        table_preference: "patio",
      },
      {
        customer_name: "The Williams Family",
        customer_phone: TEST_PHONES[2],
        party_size: 8,
        reservation_date: "SUNDAY", // Will be computed
        reservation_time: "13:00",
        status: "confirmed",
        special_requests: "Birthday celebration for grandmother, will need high chair",
        table_preference: null,
      },
      {
        customer_name: "Michael Davis",
        customer_phone: TEST_PHONES[3],
        party_size: 4,
        reservation_date: "TODAY", // Will be computed
        reservation_time: "20:00",
        status: "seated",
        special_requests: null,
        table_preference: null,
      },
    ],
    orders: [
      {
        order_number: "ORD-101",
        order_type: "pickup",
        customer_name: "Chris Martinez",
        customer_phone: TEST_PHONES[0],
        items_json: [
          { name: "Spaghetti Carbonara", quantity: 1, price_cents: 1899 },
          { name: "Margherita Pizza", quantity: 1, price_cents: 1599 },
          { name: "Tiramisu", quantity: 1, price_cents: 899 },
        ],
        subtotal_cents: 4397,
        tax_cents: 353,
        total_cents: 4750,
        status: "preparing",
        special_instructions: "Extra parmesan on the side please",
        delivery_address: null,
      },
      {
        order_number: "ORD-102",
        order_type: "delivery",
        customer_name: "Sarah Thompson",
        customer_phone: TEST_PHONES[1],
        items_json: [
          { name: "Chicken Parmigiana", quantity: 2, price_cents: 2299 },
          { name: "Fettuccine Alfredo", quantity: 1, price_cents: 1699 },
          { name: "Bruschetta", quantity: 1, price_cents: 999 },
          { name: "Cannoli", quantity: 2, price_cents: 699 },
        ],
        subtotal_cents: 8694,
        tax_cents: 696,
        total_cents: 9390,
        status: "out_for_delivery",
        special_instructions: null,
        delivery_address: "456 Oak Street, Apt 3B",
      },
      {
        order_number: "ORD-103",
        order_type: "pickup",
        customer_name: "David Lee",
        customer_phone: TEST_PHONES[2],
        items_json: [
          { name: "Pepperoni Pizza", quantity: 2, price_cents: 1799 },
        ],
        subtotal_cents: 3598,
        tax_cents: 288,
        total_cents: 3886,
        status: "ready",
        special_instructions: "Well done please",
        delivery_address: null,
      },
      {
        order_number: "ORD-104",
        order_type: "delivery",
        customer_name: "Amanda Foster",
        customer_phone: TEST_PHONES[3],
        items_json: [
          { name: "Lasagna Bolognese", quantity: 1, price_cents: 2199 },
          { name: "Caprese Salad", quantity: 1, price_cents: 1299 },
          { name: "House Red Wine (Glass)", quantity: 2, price_cents: 900 },
        ],
        subtotal_cents: 5298,
        tax_cents: 424,
        total_cents: 5722,
        status: "pending",
        special_instructions: "Ring doorbell twice",
        delivery_address: "789 Pine Avenue",
      },
    ],
    cateringRequests: [
      {
        customer_name: "Jennifer Walsh",
        customer_phone: TEST_PHONES[0],
        customer_email: "jwash@acmecorp.com",
        event_type: "Corporate Lunch",
        event_date: "NEXT_WEEK", // Will be computed
        event_time: "12:00",
        guest_count: 50,
        budget_range: "$1,500 - $2,000",
        menu_preferences: "Mixed Italian buffet, vegetarian options needed",
        dietary_restrictions: "3 guests are gluten-free, 2 are vegan",
        location: "Acme Corp HQ, 100 Business Park Drive, Conference Room A",
        status: "inquiry",
        quote_amount_cents: null,
        notes: "Annual team lunch, they've used us before",
      },
      {
        customer_name: "Robert & Maria Garcia",
        customer_phone: TEST_PHONES[1],
        customer_email: "garcia.wedding@email.com",
        event_type: "Wedding Rehearsal Dinner",
        event_date: "IN_TWO_WEEKS", // Will be computed
        event_time: "18:00",
        guest_count: 30,
        budget_range: "$1,000 - $1,200",
        menu_preferences: "Family-style Italian, antipasto, pasta, and entrees",
        dietary_restrictions: null,
        location: "St. Mary's Church Hall, 250 Church Street",
        status: "confirmed",
        quote_amount_cents: 115000,
        notes: "Deposit received. Final headcount due 1 week before.",
      },
    ],
  },
  
  medical: {
    tenantName: "Sunrise Family Medicine",
    services: [
      { name: "New Patient Visit", description: "Comprehensive new patient consultation", duration_minutes: 60, price_amount: null, price_type: "quote_only" },
      { name: "Follow-Up Visit", description: "Follow-up appointment for existing patients", duration_minutes: 30, price_amount: null, price_type: "quote_only" },
      { name: "Annual Physical", description: "Comprehensive annual wellness exam", duration_minutes: 45, price_amount: null, price_type: "quote_only" },
      { name: "Urgent Visit", description: "Same-day appointment for acute concerns", duration_minutes: 30, price_amount: null, price_type: "quote_only" },
    ],
    faqs: [
      { question: "Do you accept my insurance?", answer: "We accept most major insurance plans including Blue Cross, Aetna, Cigna, and United Healthcare. Please call to verify your specific plan." },
      { question: "How do I get my medical records?", answer: "You can request records through our patient portal or by filling out a release form at our office. Please allow 3-5 business days." },
      { question: "Do you see children?", answer: "Yes! We are a family medicine practice and see patients of all ages, from newborns to seniors." },
      { question: "Can I get same-day appointments?", answer: "We reserve several slots each day for urgent visits. Call early in the morning for best availability." },
    ],
    policies: [
      { title: "Cancellation Policy", content: "Please provide at least 24 hours notice for cancellations. Missed appointments without notice may incur a $50 fee.", type: "policy" },
      { title: "Insurance Verification", content: "Please bring your insurance card and photo ID to every visit. We verify insurance before your appointment.", type: "policy" },
      { title: "Prescription Refills", content: "Please request refills at least 48 hours in advance. Controlled substances require an in-person visit.", type: "policy" },
    ],
    objections: [
      { objection: "I don't have insurance", response: "We offer a self-pay discount and can discuss payment plans. We also can help you explore marketplace options if you're interested." },
      { objection: "The wait for an appointment is too long", response: "I understand that's frustrating. Let me check for any cancellations or earlier openings. We also have urgent same-day slots if your concern is pressing." },
    ],
    hours: MEDICAL_HOURS,
    calls: [
      { customer_name: "Patricia Brown", service_requested: "New Patient Consultation", summary: "New patient intake completed. Scheduled initial consultation for recurring headaches.", outcome: "booked" },
      { customer_name: "James Wilson", service_requested: "Follow-up - Lab Results", summary: "Follow-up appointment scheduled for lab result review. Patient was seen 2 weeks ago.", outcome: "booked" },
      { customer_name: "Maria Rodriguez", service_requested: "Annual Physical", summary: "Insurance verification needed before scheduling. Patient has new insurance carrier.", outcome: "followup" },
      { customer_name: "Steven Lee", service_requested: "Urgent Consultation", summary: "Urgent symptoms described. Transferred to nurse line for immediate assessment.", outcome: "escalated" },
    ],
    medicalIntakes: [
      {
        intake_type: "new_patient",
        urgency_level: "routine",
        reason_for_visit: "Annual wellness checkup, no current health concerns",
        status: "pending",
        verbal_consent_given: true,
        insurance_provider: "Blue Cross Blue Shield",
        preferred_date: "NEXT_WEEK",
        preferred_time_range: "Morning (8am-12pm)",
        ai_summary: "New patient seeking routine wellness exam. No urgent concerns reported.",
      },
      {
        intake_type: "followup",
        urgency_level: "soon",
        reason_for_visit: "Review lab results from last visit, discuss cholesterol levels",
        status: "scheduled",
        verbal_consent_given: true,
        insurance_provider: "Aetna",
        preferred_date: "THIS_WEEK",
        preferred_time_range: "Afternoon (1pm-5pm)",
        ai_summary: "Follow-up for lab review. Patient previously seen for routine physical, labs ordered for lipid panel.",
      },
      {
        intake_type: "new_patient",
        urgency_level: "urgent",
        reason_for_visit: "Persistent chest tightness and shortness of breath for 3 days",
        status: "pending",
        verbal_consent_given: true,
        insurance_provider: "United Healthcare",
        preferred_date: "TODAY",
        preferred_time_range: "As soon as possible",
        ai_summary: "URGENT: Patient reports chest symptoms x3 days. Recommended same-day evaluation. Consider ER if symptoms worsen.",
      },
      {
        intake_type: "followup",
        urgency_level: "routine",
        reason_for_visit: "Medication refill for blood pressure, doing well on current dose",
        status: "completed",
        verbal_consent_given: true,
        insurance_provider: "Cigna",
        preferred_date: "LAST_WEEK",
        preferred_time_range: "Any",
        ai_summary: "Routine medication refill. Patient stable on current BP medications.",
      },
    ],
  },
  
  general: {
    tenantName: "Acme Professional Services",
    services: [
      { name: "Initial Consultation", description: "Free initial consultation to discuss your needs", duration_minutes: 30, price_amount: 0, price_type: "fixed" },
      { name: "Standard Service", description: "Our core service offering", duration_minutes: 60, price_amount: 150, price_type: "starting_at" },
      { name: "Premium Package", description: "Comprehensive service package with priority support", duration_minutes: 120, price_amount: 350, price_type: "fixed" },
    ],
    faqs: [
      { question: "What are your hours?", answer: "We're open Monday through Friday, 9am to 5pm, and Saturday 10am to 3pm." },
      { question: "Do you offer virtual consultations?", answer: "Yes! We offer both in-person and video consultations based on your preference." },
      { question: "How do I get started?", answer: "Simply schedule a free consultation and we'll discuss your needs and recommend the best approach." },
    ],
    policies: [
      { title: "Service Guarantee", content: "We stand behind our work. If you're not satisfied, we'll make it right or refund your payment.", type: "policy" },
      { title: "Appointment Policy", content: "Please arrive 5 minutes early for your appointment. Late arrivals may need to be rescheduled.", type: "policy" },
    ],
    objections: [
      { objection: "I need to think about it", response: "Absolutely, take your time! Would it help if I sent you some more information via email? I'm also happy to schedule a follow-up call." },
      { objection: "I'm comparing options", response: "Smart approach! We're confident in our value, but I'd encourage you to compare. Would a free trial help you make your decision?" },
    ],
    hours: STANDARD_HOURS,
    calls: [
      { customer_name: "Alex Rivera", service_requested: "General Inquiry", summary: "Caller asked about business hours and services offered. Sent follow-up email with brochure.", outcome: "followup" },
      { customer_name: "Jordan Blake", service_requested: "Pricing Information", summary: "Requested pricing for multiple services. Scheduled callback for detailed quote.", outcome: "booked" },
      { customer_name: "Casey Morgan", service_requested: "Complaint Resolution", summary: "Customer had concerns about previous service. Issue resolved, scheduled follow-up.", outcome: "followup" },
      { customer_name: "Taylor Reed", service_requested: "Premium Package", summary: "Booked premium package after consultation. Payment processed, appointment confirmed.", outcome: "booked" },
    ],
  },

  sales: {
    tenantName: "Prestige Auto Group",
    services: [
      { name: "Test Drive Appointment", description: "Schedule a test drive for any vehicle in our inventory", duration_minutes: 60, price_amount: null, price_type: "quote_only" },
      { name: "Trade-In Appraisal", description: "Get your vehicle appraised for trade-in value", duration_minutes: 30, price_amount: null, price_type: "quote_only" },
      { name: "Finance Consultation", description: "Meet with our finance team to discuss payment options", duration_minutes: 45, price_amount: null, price_type: "quote_only" },
      { name: "Vehicle Delivery", description: "Schedule delivery of your new vehicle", duration_minutes: 30, price_amount: 0, price_type: "fixed" },
    ],
    faqs: [
      { question: "Do you offer financing?", answer: "Yes! We work with over 20 lenders to find the best rate for your credit situation. We offer terms from 24 to 84 months." },
      { question: "Do you accept trade-ins?", answer: "Absolutely! Bring your vehicle in for a free appraisal. We accept trade-ins on all purchases and can apply the value toward your down payment." },
      { question: "What's your return policy?", answer: "We offer a 7-day/500-mile return policy on all pre-owned vehicles. New vehicles are covered by the manufacturer's warranty." },
      { question: "Can I see the vehicle history report?", answer: "Yes, we provide a free Carfax report on all pre-owned vehicles. Just ask your sales rep or call us with the stock number." },
    ],
    policies: [
      { title: "Test Drive Policy", content: "Valid driver's license required. Test drives are limited to 30 minutes and a pre-approved route. Insurance verification may be required for high-value vehicles.", type: "policy" },
      { title: "Deposit Policy", content: "A $500 refundable deposit holds any vehicle for up to 48 hours. Deposits are applied toward the purchase price or refunded if you decide not to proceed.", type: "policy" },
    ],
    objections: [
      { objection: "I'm just looking", response: "No pressure at all! Would you like to come in and see it in person? Sometimes photos don't do them justice. I can have it pulled up front and ready for you." },
      { objection: "I can find it cheaper online", response: "I appreciate you doing your homework! Our prices include a full inspection, detail, and warranty. Would you like me to put together a detailed comparison?" },
      { objection: "I need to talk to my spouse", response: "Absolutely, that's a big decision! Would it help to schedule a time when you can both come in? I can have everything ready so you can make the most of your visit." },
    ],
    hours: STANDARD_HOURS,
    calls: [
      { customer_name: "Ryan Mitchell", service_requested: "Test Drive - 2024 Honda Accord", summary: "Prospect interested in 2024 Accord Sport. Has a 2019 Civic to trade in. Scheduled test drive for Saturday at 10am.", outcome: "booked", context_extra: { vehicle_interest: "2024 Honda Accord Sport", trade_in: "2019 Honda Civic" } },
      { customer_name: "Sarah Chen", service_requested: "Pricing Inquiry - SUV", summary: "Looking for a mid-size SUV under $40k. Interested in CR-V and RAV4. Wants to compare. Will call back after research.", outcome: "followup", context_extra: { budget: "under $40k" } },
      { customer_name: "James Rodriguez", service_requested: "Finance Question", summary: "Wants to know about financing for a pre-owned truck. Credit score around 680. Transferred to finance department.", outcome: "followup" },
      { customer_name: "Michelle Park", service_requested: "Vehicle Availability", summary: "Asked about a specific VIN she saw online. Vehicle is available. Booked appointment for tomorrow at 2pm.", outcome: "booked" },
    ],
  },
};

// Helper function to compute relative dates
export function getRelativeDate(dateKey: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (dateKey) {
    case "TODAY":
      return today.toISOString().split("T")[0];
    case "YESTERDAY":
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split("T")[0];
    case "TOMORROW":
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    case "FRIDAY": {
      const friday = new Date(today);
      const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
      friday.setDate(friday.getDate() + daysUntilFriday);
      return friday.toISOString().split("T")[0];
    }
    case "SATURDAY": {
      const saturday = new Date(today);
      const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
      saturday.setDate(saturday.getDate() + daysUntilSaturday);
      return saturday.toISOString().split("T")[0];
    }
    case "SUNDAY": {
      const sunday = new Date(today);
      const daysUntilSunday = (0 - today.getDay() + 7) % 7 || 7;
      sunday.setDate(sunday.getDate() + daysUntilSunday);
      return sunday.toISOString().split("T")[0];
    }
    case "THIS_WEEK": {
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() + 2);
      return thisWeek.toISOString().split("T")[0];
    }
    case "NEXT_WEEK": {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split("T")[0];
    }
    case "IN_TWO_WEEKS": {
      const twoWeeks = new Date(today);
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      return twoWeeks.toISOString().split("T")[0];
    }
    case "LAST_WEEK": {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 5);
      return lastWeek.toISOString().split("T")[0];
    }
    default:
      return today.toISOString().split("T")[0];
  }
}
