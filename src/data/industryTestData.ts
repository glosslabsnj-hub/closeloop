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
}

// Test phone numbers that stay constant across mode switches
export const TEST_PHONES = [
  "+15551234567",
  "+15559876543",
  "+15552223333",
  "+15554445555",
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
      { customer_name: "Taylor Reed", service_requested: "Partnership Inquiry", summary: "Business partnership inquiry. Not a good fit for our services at this time.", outcome: "lost" },
    ],
  },
};
