import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  CalendarDays,
  UtensilsCrossed,
  Truck,
  MessageSquare,
  Settings2,
  FileCode,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface DataCollectionField {
  identifier: string;
  type: "string" | "boolean" | "integer";
  description: string;
  enumValues?: string[];
  category: "core" | "booking" | "food" | "dispatch" | "callback";
  required?: boolean;
}

const UNIVERSAL_DATA_COLLECTION_FIELDS: DataCollectionField[] = [
  // Core fields (all modes)
  { identifier: "customer_name", type: "string", description: "Caller's full name", category: "core" },
  { identifier: "customer_phone", type: "string", description: "Caller's phone number (E.164 format preferred)", category: "core" },
  { identifier: "intent", type: "string", description: "Overall intent of the call", category: "core", enumValues: ["booking", "order", "reservation", "dispatch", "callback", "faq", "unknown"] },
  
  // Booking / Service fields
  { identifier: "service_requested", type: "string", description: "Service or menu item requested by the caller", category: "booking" },
  { identifier: "booking_date", type: "string", description: "Requested booking/appointment date (natural language OK)", category: "booking" },
  { identifier: "booking_time", type: "string", description: "Requested booking/appointment time (natural language OK)", category: "booking" },
  { identifier: "booking_confirmed", type: "boolean", description: "Whether the booking was confirmed by the caller", category: "booking" },
  
  // Food order fields
  { identifier: "order_items", type: "string", description: "Ordered items (freeform text or JSON-like list)", category: "food" },
  { identifier: "order_modifiers", type: "string", description: "Modifiers and add-ons (extra cheese, no onions, etc.)", category: "food" },
  { identifier: "order_special_instructions", type: "string", description: "Special instructions (well done, extra sauce, etc.)", category: "food" },
  { identifier: "order_type", type: "string", description: "Pickup or delivery order", category: "food", enumValues: ["pickup", "delivery", "unknown"] },
  { identifier: "delivery_address", type: "string", description: "Delivery address if order_type is delivery", category: "food" },
  
  // Reservation fields
  { identifier: "reservation_date", type: "string", description: "Reservation date (natural language OK)", category: "food" },
  { identifier: "reservation_time", type: "string", description: "Reservation time (natural language OK)", category: "food" },
  { identifier: "party_size", type: "integer", description: "Number of guests for the reservation", category: "food" },
  
  // Dispatch fields
  { identifier: "dispatch_pickup_address", type: "string", description: "Pickup or service location address", category: "dispatch" },
  { identifier: "dispatch_dropoff_address", type: "string", description: "Destination or dropoff location address", category: "dispatch" },
  { identifier: "vehicle_type", type: "string", description: "Vehicle type (car, truck, motorcycle, etc.)", category: "dispatch" },
  { identifier: "drivable", type: "string", description: "Whether the vehicle is drivable", category: "dispatch", enumValues: ["yes", "no", "unknown"] },
  { identifier: "urgency", type: "string", description: "Urgency level of the request", category: "dispatch", enumValues: ["emergency", "same_day", "scheduled", "unknown"] },
  
  // Callback fields
  { identifier: "callback_requested", type: "boolean", description: "Whether caller wants a callback", category: "callback" },
];

const categoryIcons: Record<string, React.ReactNode> = {
  core: <User className="h-4 w-4" />,
  booking: <CalendarDays className="h-4 w-4" />,
  food: <UtensilsCrossed className="h-4 w-4" />,
  dispatch: <Truck className="h-4 w-4" />,
  callback: <MessageSquare className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  core: "Core (All Modes)",
  booking: "Booking / Service",
  food: "Food Orders & Reservations",
  dispatch: "Dispatch / Towing",
  callback: "Callback Requests",
};

export function ElevenLabsSetupGuide() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const groupedFields = UNIVERSAL_DATA_COLLECTION_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, DataCollectionField[]>);

  const allIdentifiers = UNIVERSAL_DATA_COLLECTION_FIELDS.map(f => f.identifier).join("\n");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>ElevenLabs Agent Setup</CardTitle>
            <CardDescription>
              Configure your ElevenLabs agent's Data Collection fields to work with Flux Receptionist
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Universal Agent Configuration</p>
              <p className="text-sm text-muted-foreground">
                Flux Receptionist uses a single ElevenLabs agent that handles all business modes (service, food, dispatch, medical, general). 
                Configure these Data Collection fields in your ElevenLabs dashboard to enable automatic extraction.
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="fields">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fields" className="gap-2">
              <FileCode className="h-4 w-4" />
              Data Fields
            </TabsTrigger>
            <TabsTrigger value="setup" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Setup Steps
            </TabsTrigger>
            <TabsTrigger value="testing" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Testing
            </TabsTrigger>
          </TabsList>

          {/* Data Fields Tab */}
          <TabsContent value="fields" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {UNIVERSAL_DATA_COLLECTION_FIELDS.length} total fields across all modes
              </p>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(allIdentifiers)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All Identifiers
              </Button>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <Accordion type="multiple" defaultValue={["core", "booking"]} className="space-y-2">
                {Object.entries(groupedFields).map(([category, fields]) => (
                  <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-secondary">
                          {categoryIcons[category]}
                        </div>
                        <span className="font-medium">{categoryLabels[category]}</span>
                        <Badge variant="secondary" className="ml-2">{fields.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-3">
                        {fields.map((field) => (
                          <div
                            key={field.identifier}
                            className="flex items-start justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded text-primary">
                                  {field.identifier}
                                </code>
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{field.description}</p>
                              {field.enumValues && (
                                <div className="flex items-center gap-1 flex-wrap mt-1">
                                  <span className="text-xs text-muted-foreground">Values:</span>
                                  {field.enumValues.map((val) => (
                                    <Badge key={val} variant="secondary" className="text-xs font-mono">
                                      {val}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => copyToClipboard(field.identifier)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </TabsContent>

          {/* Setup Steps Tab */}
          <TabsContent value="setup" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-medium">Open ElevenLabs Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Navigate to your Conversational AI agent in the ElevenLabs dashboard.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noopener noreferrer">
                      Open ElevenLabs <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  2
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-medium">Go to Data Collection</h4>
                  <p className="text-sm text-muted-foreground">
                    In your agent settings, find the "Data Collection" or "Structured Output" section.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  3
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-medium">Add Each Field</h4>
                  <p className="text-sm text-muted-foreground">
                    For each field in the "Data Fields" tab, create a new data collection item with the exact identifier name. 
                    Use the description to help the AI understand what to extract.
                  </p>
                  <div className="p-3 bg-muted/50 rounded text-sm">
                    <p className="font-medium mb-1">💡 Pro Tip</p>
                    <p className="text-muted-foreground">
                      You don't need all fields for every business mode. Add at minimum: <code className="px-1 bg-muted rounded">customer_name</code>, <code className="px-1 bg-muted rounded">intent</code>, plus fields for your mode.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  4
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-medium">Configure Webhook</h4>
                  <p className="text-sm text-muted-foreground">
                    In agent settings, enable the "Post Call Transcription" webhook and point it to Flux Receptionist's endpoint.
                    Copy your webhook secret to the Flux Receptionist secrets configuration.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  5
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-medium">Save & Test</h4>
                  <p className="text-sm text-muted-foreground">
                    Save your agent configuration and run a test call to verify data is being extracted correctly.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Verification Checklist
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-background rounded border">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Make a test call</p>
                    <p className="text-sm text-muted-foreground">
                      Call your Flux Receptionist number and provide test information (name, service request, etc.)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-background rounded border">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Check the Calls page</p>
                    <p className="text-sm text-muted-foreground">
                      Navigate to /app/calls and verify your test call shows the extracted data
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-background rounded border">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Check Extraction Debug</p>
                    <p className="text-sm text-muted-foreground">
                      Use /debug/extraction to see the full extraction pipeline and normalized values
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Common Issues</h4>
              <div className="space-y-2 text-sm">
                <div className="p-3 border rounded">
                  <p className="font-medium">❌ Fields are empty in extracted_payload</p>
                  <p className="text-muted-foreground">
                    Ensure the field identifiers in ElevenLabs match exactly (case-sensitive). The AI also needs clear prompting to collect this data.
                  </p>
                </div>
                <div className="p-3 border rounded">
                  <p className="font-medium">❌ Webhook not receiving data</p>
                  <p className="text-muted-foreground">
                    Verify ELEVENLABS_CONVAI_WEBHOOK_SECRET is set correctly and the webhook URL is configured in ElevenLabs.
                  </p>
                </div>
                <div className="p-3 border rounded">
                  <p className="font-medium">❌ Dates/times not normalized</p>
                  <p className="text-muted-foreground">
                    Flux Receptionist automatically normalizes natural language dates ("next Friday" → YYYY-MM-DD). Check the original_date_phrase field.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ElevenLabsSetupGuide;
