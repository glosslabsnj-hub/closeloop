// Industry demo configurations for the landing page "Hear How It Works" section
// These reference real recorded calls uploaded by the business owner

export interface IndustryDemo {
  id: string;
  name: string;
  icon: string;
  businessMode: 'service' | 'dispatch' | 'food' | 'medical' | 'general';
  description: string;
  callSummary: string;
  whatAIDoes: string[];
  whatGetsCreated: string[];
  // Audio URL - would be stored in Supabase storage in production
  audioUrl: string | null;
  duration: string;
}

export const industryDemos: IndustryDemo[] = [
  {
    id: 'auto-detailing',
    name: 'Auto Detailing',
    icon: '✨',
    businessMode: 'service',
    description: 'Booking-first service business',
    callSummary: 'Customer calls to book a full detail for their SUV. AI captures vehicle info, recommends package, and books appointment.',
    whatAIDoes: [
      'Greets caller and asks what they need',
      'Captures vehicle type and size',
      'Recommends appropriate service package',
      'Offers available appointment slots',
      'Confirms booking and sends SMS summary',
    ],
    whatGetsCreated: [
      'New customer record',
      'Booking with service details',
      'SMS confirmation sent',
      'Calendar event created',
    ],
    audioUrl: null, // Replace with actual uploaded audio URL
    duration: '1:45',
  },
  {
    id: 'towing',
    name: 'Towing & Roadside',
    icon: '🚛',
    businessMode: 'dispatch',
    description: 'Urgent dispatch with location capture',
    callSummary: 'Stranded driver needs a tow. AI captures location, vehicle details, and creates urgent dispatch job.',
    whatAIDoes: [
      'Captures exact location (address or intersection)',
      'Asks about vehicle and situation',
      'Assesses urgency level',
      'Creates dispatch job in queue',
      'Provides ETA estimate',
    ],
    whatGetsCreated: [
      'Dispatch job with priority',
      'Customer record with location',
      'SMS with job number',
      'Driver notification triggered',
    ],
    audioUrl: null,
    duration: '2:10',
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: '🍕',
    businessMode: 'food',
    description: 'Order taking and reservations',
    callSummary: 'Customer calls to place a pickup order. AI takes the order, confirms items, and provides pickup time.',
    whatAIDoes: [
      'Takes food order item by item',
      'Asks about modifications and preferences',
      'Confirms order and total',
      'Provides estimated pickup time',
      'Sends order confirmation via SMS',
    ],
    whatGetsCreated: [
      'Food order with items',
      'Customer record',
      'Kitchen ticket generated',
      'SMS order confirmation',
    ],
    audioUrl: null,
    duration: '2:30',
  },
  {
    id: 'dental',
    name: 'Dental Office',
    icon: '🦷',
    businessMode: 'medical',
    description: 'Medical intake with HIPAA compliance',
    callSummary: 'New patient calls for appointment. AI collects intake info, insurance details, and schedules visit.',
    whatAIDoes: [
      'Asks for reason for visit',
      'Collects insurance information',
      'Captures preferred dates/times',
      'Obtains verbal consent',
      'Schedules appointment',
    ],
    whatGetsCreated: [
      'Medical intake record',
      'Patient profile',
      'Appointment request',
      'HIPAA-compliant summary',
    ],
    audioUrl: null,
    duration: '3:00',
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '🔧',
    businessMode: 'service',
    description: 'Emergency and scheduled service',
    callSummary: 'Homeowner reports a leak. AI assesses urgency, captures details, and schedules service visit.',
    whatAIDoes: [
      'Assesses urgency of issue',
      'Captures property and problem details',
      'Recommends appropriate service',
      'Checks availability',
      'Books technician visit',
    ],
    whatGetsCreated: [
      'Service request with details',
      'Customer record',
      'Booking confirmation',
      'Technician notification',
    ],
    audioUrl: null,
    duration: '2:00',
  },
  {
    id: 'hvac',
    name: 'HVAC Service',
    icon: '❄️',
    businessMode: 'service',
    description: 'Seasonal and emergency HVAC',
    callSummary: 'Customer needs AC repair. AI captures system info, schedules technician, and confirms details.',
    whatAIDoes: [
      'Identifies AC vs heating issue',
      'Captures system type and symptoms',
      'Assesses urgency',
      'Schedules service appointment',
      'Sends pre-appointment info',
    ],
    whatGetsCreated: [
      'Service ticket',
      'Customer profile',
      'Technician assignment',
      'Appointment confirmation',
    ],
    audioUrl: null,
    duration: '1:55',
  },
];

export function getDemoByIndustry(industryId: string): IndustryDemo | undefined {
  return industryDemos.find(d => d.id === industryId);
}

export function getDemosByMode(mode: string): IndustryDemo[] {
  return industryDemos.filter(d => d.businessMode === mode);
}
