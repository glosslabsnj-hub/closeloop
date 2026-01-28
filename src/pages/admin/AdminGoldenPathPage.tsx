import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Briefcase,
  Truck,
  UtensilsCrossed,
  Calendar,
  Stethoscope,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
  Play,
  ClipboardCheck,
} from "lucide-react";
import type { BusinessMode } from "@/types/database";

interface TestScenario {
  id: string;
  key: string;
  name: string;
  mode: BusinessMode;
  icon: React.ElementType;
  modules: string[];
  hipaa?: boolean;
  description: string;
  expectedRecord: string;
  checklist: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
}

interface TenantTestData {
  tenant_id: string | null;
  tenant_name: string | null;
  readiness_score: number;
  phone_status: "connected" | "pending" | "not_connected";
  phone_number: string | null;
  last_call: {
    id: string;
    outcome: string;
    started_at: string;
  } | null;
  last_record: {
    type: string;
    id: string;
    created_at: string;
  } | null;
  handoff_status: {
    method: string;
    last_attempt: string | null;
    last_status: string | null;
  } | null;
}

interface ChecklistState {
  [scenarioKey: string]: {
    [checkId: string]: boolean;
  };
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "1",
    key: "service_booking",
    name: "Service + Booking",
    mode: "service",
    icon: Briefcase,
    modules: ["ai_voice", "booking", "payments"],
    description: "Auto detailer booking flow with deposit collection",
    expectedRecord: "booking",
    checklist: [
      { id: "customer_resolved", label: "Customer resolved", description: "Dedupe by phone_e164, no duplicate created", critical: true },
      { id: "record_created", label: "Booking created", description: "Booking record with correct service and time", critical: true },
      { id: "no_none_spoken", label: "No 'None' spoken", description: "All variables populated, no placeholder speech", critical: true },
      { id: "handoff_success", label: "Handoff succeeded", description: "Internal notification or webhook delivered", critical: true },
      { id: "deposit_flow", label: "Deposit flow correct", description: "If deposit required, payment link sent", critical: false },
    ],
  },
  {
    id: "2",
    key: "dispatch",
    name: "Dispatch / Towing",
    mode: "dispatch",
    icon: Truck,
    modules: ["ai_voice", "dispatch_queue", "gps_tracking"],
    description: "Urgent tow request with location capture",
    expectedRecord: "dispatch_job",
    checklist: [
      { id: "customer_resolved", label: "Customer resolved", description: "Dedupe by phone_e164, no duplicate created", critical: true },
      { id: "record_created", label: "Dispatch job created", description: "Job with priority, location, and description", critical: true },
      { id: "no_none_spoken", label: "No 'None' spoken", description: "All variables populated, no placeholder speech", critical: true },
      { id: "handoff_success", label: "Handoff succeeded", description: "Urgent SMS or webhook delivered", critical: true },
      { id: "priority_correct", label: "Priority set correctly", description: "Urgent calls marked as high/urgent priority", critical: true },
    ],
  },
  {
    id: "3",
    key: "food_order",
    name: "Food Order",
    mode: "food",
    icon: UtensilsCrossed,
    modules: ["ai_voice", "food_orders", "menu_knowledge"],
    description: "Phone order with menu items and special instructions",
    expectedRecord: "food_order",
    checklist: [
      { id: "customer_resolved", label: "Customer resolved", description: "Dedupe by phone_e164, no duplicate created", critical: true },
      { id: "record_created", label: "Order created", description: "Order with items, totals, and instructions", critical: true },
      { id: "no_none_spoken", label: "No 'None' spoken", description: "Menu items spoken correctly, prices accurate", critical: true },
      { id: "handoff_success", label: "Handoff succeeded", description: "Order delivered to kitchen (internal/print/webhook)", critical: true },
      { id: "print_ticket", label: "Print ticket readable", description: "Special instructions clearly visible on ticket", critical: false },
    ],
  },
  {
    id: "4",
    key: "food_reservation",
    name: "Food Reservation",
    mode: "food",
    icon: Calendar,
    modules: ["ai_voice", "reservations", "menu_knowledge"],
    description: "Table reservation with party size and preferences",
    expectedRecord: "reservation",
    checklist: [
      { id: "customer_resolved", label: "Customer resolved", description: "Dedupe by phone_e164, no duplicate created", critical: true },
      { id: "record_created", label: "Reservation created", description: "Reservation with date, time, party size", critical: true },
      { id: "no_none_spoken", label: "No 'None' spoken", description: "All variables populated, no placeholder speech", critical: true },
      { id: "handoff_success", label: "Handoff succeeded", description: "Notification delivered to host stand", critical: true },
      { id: "special_requests", label: "Special requests captured", description: "Dietary needs, seating preferences stored", critical: false },
    ],
  },
  {
    id: "5",
    key: "medical_intake",
    name: "Medical + HIPAA",
    mode: "medical",
    icon: Stethoscope,
    modules: ["ai_voice", "medical_intake", "hipaa_logging"],
    hipaa: true,
    description: "Patient intake with HIPAA compliance",
    expectedRecord: "medical_intake",
    checklist: [
      { id: "customer_resolved", label: "Customer resolved", description: "Dedupe by phone_e164, no duplicate created", critical: true },
      { id: "record_created", label: "Intake created", description: "Intake with reason, urgency, and preferences", critical: true },
      { id: "no_none_spoken", label: "No 'None' spoken", description: "All variables populated, no placeholder speech", critical: true },
      { id: "handoff_success", label: "Handoff succeeded", description: "Staff notified with PHI-minimized summary", critical: true },
      { id: "hipaa_compliant", label: "HIPAA compliant", description: "No transcripts/recordings stored by default", critical: true },
      { id: "consent_captured", label: "Consent captured", description: "Verbal consent timestamp recorded", critical: true },
    ],
  },
];

export default function AdminGoldenPathPage() {
  const [activeTab, setActiveTab] = useState("service_booking");
  const [testData, setTestData] = useState<Record<string, TenantTestData>>({});
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    setLoading(true);
    try {
      // Load test tenant data for each scenario
      const data: Record<string, TenantTestData> = {};
      
      for (const scenario of TEST_SCENARIOS) {
        data[scenario.key] = await fetchTenantTestData(scenario);
      }
      
      setTestData(data);
      
      // Initialize checklist state from localStorage
      const savedState = localStorage.getItem("goldenPathChecklist");
      if (savedState) {
        setChecklistState(JSON.parse(savedState));
      }
    } catch (error) {
      console.error("Failed to load test data:", error);
      toast.error("Failed to load test data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantTestData = async (scenario: TestScenario): Promise<TenantTestData> => {
    // Find a tenant matching this mode
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, business_mode, hipaa_mode")
      .eq("business_mode", scenario.mode)
      .eq("hipaa_mode", scenario.hipaa || false)
      .limit(1)
      .maybeSingle();

    if (!tenant) {
      return {
        tenant_id: null,
        tenant_name: null,
        readiness_score: 0,
        phone_status: "not_connected",
        phone_number: null,
        last_call: null,
        last_record: null,
        handoff_status: null,
      };
    }

    // Get assistant settings for phone status
    const { data: settings } = await supabase
      .from("assistant_settings")
      .select("phone_connected, closeloop_number, forwarding_phone_e164")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    // Get last call
    const { data: lastCall } = await supabase
      .from("ai_call_sessions")
      .select("id, outcome, started_at")
      .eq("tenant_id", tenant.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get last record based on expected type
    let lastRecord: TenantTestData["last_record"] = null;
    
    if (scenario.expectedRecord === "booking") {
      const { data } = await supabase
        .from("bookings")
        .select("id, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) lastRecord = { type: "booking", id: data.id, created_at: data.created_at };
    } else if (scenario.expectedRecord === "dispatch_job") {
      const { data } = await supabase
        .from("dispatch_jobs")
        .select("id, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) lastRecord = { type: "dispatch_job", id: data.id, created_at: data.created_at };
    } else if (scenario.expectedRecord === "food_order") {
      const { data } = await supabase
        .from("food_orders")
        .select("id, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) lastRecord = { type: "food_order", id: data.id, created_at: data.created_at };
    } else if (scenario.expectedRecord === "reservation") {
      const { data } = await supabase
        .from("reservations")
        .select("id, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) lastRecord = { type: "reservation", id: data.id, created_at: data.created_at };
    } else if (scenario.expectedRecord === "medical_intake") {
      const { data } = await supabase
        .from("medical_intakes")
        .select("id, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) lastRecord = { type: "medical_intake", id: data.id, created_at: data.created_at };
    }

    // Get last handoff attempt
    const { data: handoff } = await supabase
      .from("handoff_attempts")
      .select("method, created_at, status")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate readiness score (simplified)
    const { data: services } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenant.id);
    
    const { data: hours } = await supabase
      .from("availability_slots")
      .select("id")
      .eq("tenant_id", tenant.id);

    const hasServices = (services?.length || 0) > 0;
    const hasHours = (hours?.length || 0) > 0;
    const hasPhone = settings?.phone_connected || false;
    
    const readinessScore = Math.round(
      ((hasServices ? 30 : 0) + (hasHours ? 30 : 0) + (hasPhone ? 40 : 0))
    );

    return {
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      readiness_score: readinessScore,
      phone_status: settings?.phone_connected ? "connected" : settings?.closeloop_number ? "pending" : "not_connected",
      phone_number: settings?.closeloop_number || null,
      last_call: lastCall ? {
        id: lastCall.id,
        outcome: lastCall.outcome || "unknown",
        started_at: lastCall.started_at,
      } : null,
      last_record: lastRecord,
      handoff_status: handoff ? {
        method: handoff.method,
        last_attempt: handoff.created_at,
        last_status: handoff.status,
      } : null,
    };
  };

  const refreshScenario = async (scenarioKey: string) => {
    setRefreshing(scenarioKey);
    try {
      const scenario = TEST_SCENARIOS.find(s => s.key === scenarioKey);
      if (scenario) {
        const data = await fetchTenantTestData(scenario);
        setTestData(prev => ({ ...prev, [scenarioKey]: data }));
        toast.success("Test data refreshed");
      }
    } catch (error) {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(null);
    }
  };

  const toggleCheckItem = (scenarioKey: string, checkId: string) => {
    setChecklistState(prev => {
      const newState = {
        ...prev,
        [scenarioKey]: {
          ...prev[scenarioKey],
          [checkId]: !prev[scenarioKey]?.[checkId],
        },
      };
      localStorage.setItem("goldenPathChecklist", JSON.stringify(newState));
      return newState;
    });
  };

  const resetChecklist = (scenarioKey: string) => {
    setChecklistState(prev => {
      const newState = { ...prev, [scenarioKey]: {} };
      localStorage.setItem("goldenPathChecklist", JSON.stringify(newState));
      return newState;
    });
    toast.success("Checklist reset");
  };

  const getScenarioStatus = (scenarioKey: string) => {
    const scenario = TEST_SCENARIOS.find(s => s.key === scenarioKey);
    if (!scenario) return "not_started";
    
    const checks = checklistState[scenarioKey] || {};
    const criticalItems = scenario.checklist.filter(c => c.critical);
    const passedCritical = criticalItems.filter(c => checks[c.id]).length;
    
    if (passedCritical === criticalItems.length) return "passed";
    if (passedCritical > 0) return "in_progress";
    return "not_started";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Golden Path QA
          </h1>
          <p className="text-muted-foreground">
            End-to-end validation across all business modes
          </p>
        </div>
        <Button onClick={loadTestData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {TEST_SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const status = getScenarioStatus(scenario.key);
          const data = testData[scenario.key];
          
          return (
            <Card
              key={scenario.key}
              className={`cursor-pointer transition-all ${
                activeTab === scenario.key ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setActiveTab(scenario.key)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-medium text-sm">{scenario.name}</p>
                <div className="mt-2">
                  {status === "passed" && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Passed
                    </Badge>
                  )}
                  {status === "in_progress" && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                  {status === "not_started" && (
                    <Badge variant="outline">
                      Not Started
                    </Badge>
                  )}
                </div>
                {data?.tenant_id && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {data.tenant_name}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Test View */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden">
          {TEST_SCENARIOS.map(s => (
            <TabsTrigger key={s.key} value={s.key}>{s.name}</TabsTrigger>
          ))}
        </TabsList>

        {TEST_SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const data = testData[scenario.key];
          const checks = checklistState[scenario.key] || {};

          return (
            <TabsContent key={scenario.key} value={scenario.key} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{scenario.name}</CardTitle>
                      <CardDescription>{scenario.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshScenario(scenario.key)}
                      disabled={refreshing === scenario.key}
                    >
                      {refreshing === scenario.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetChecklist(scenario.key)}
                    >
                      Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tenant Status */}
                  {!data?.tenant_id ? (
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">No test tenant found</p>
                      <p className="text-sm text-muted-foreground">
                        Use the Admin Mode Switcher to create a {scenario.mode} tenant
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Readiness */}
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Readiness</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{data.readiness_score}%</span>
                            {data.readiness_score >= 80 ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Phone Status */}
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Phone</p>
                          <div className="flex items-center gap-2">
                            <Phone className={`h-4 w-4 ${
                              data.phone_status === "connected" ? "text-green-500" :
                              data.phone_status === "pending" ? "text-yellow-500" : "text-muted-foreground"
                            }`} />
                            <span className="text-sm font-medium capitalize">
                              {data.phone_status.replace("_", " ")}
                            </span>
                          </div>
                          {data.phone_number && (
                            <p className="text-xs text-muted-foreground mt-1">{data.phone_number}</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Last Call */}
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Last Call</p>
                          {data.last_call ? (
                            <>
                              <Badge variant={
                                data.last_call.outcome === "booked" ? "default" :
                                data.last_call.outcome === "escalated" ? "destructive" : "secondary"
                              }>
                                {data.last_call.outcome}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(data.last_call.started_at)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">No calls yet</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Last Record */}
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Last {scenario.expectedRecord.replace("_", " ")}</p>
                          {data.last_record ? (
                            <>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">Created</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(data.last_record.created_at)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">None yet</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Handoff Status */}
                  {data?.handoff_status && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-2">Last Handoff Attempt</p>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{data.handoff_status.method}</Badge>
                          <Badge variant={
                            data.handoff_status.last_status === "success" ? "default" :
                            data.handoff_status.last_status === "failed" ? "destructive" : "secondary"
                          }>
                            {data.handoff_status.last_status || "unknown"}
                          </Badge>
                          {data.handoff_status.last_attempt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(data.handoff_status.last_attempt)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Separator />

                  {/* Validation Checklist */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Validation Checklist
                    </h3>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-3">
                        {scenario.checklist.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              checks[item.id] 
                                ? "bg-green-500/10 border-green-500/30" 
                                : "bg-background hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              id={`${scenario.key}-${item.id}`}
                              checked={checks[item.id] || false}
                              onCheckedChange={() => toggleCheckItem(scenario.key, item.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`${scenario.key}-${item.id}`}
                                className="font-medium cursor-pointer flex items-center gap-2"
                              >
                                {item.label}
                                {item.critical && (
                                  <Badge variant="outline" className="text-xs">Critical</Badge>
                                )}
                              </label>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                            {checks[item.id] ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Test Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {Object.values(checks).filter(Boolean).length} / {scenario.checklist.length} checks passed
                    </div>
                    {data?.phone_number && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${data.phone_number}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call Test Number
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-green-500">
                {TEST_SCENARIOS.filter(s => getScenarioStatus(s.key) === "passed").length}
              </p>
              <p className="text-sm text-muted-foreground">Passed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-500">
                {TEST_SCENARIOS.filter(s => getScenarioStatus(s.key) === "in_progress").length}
              </p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-muted-foreground">
                {TEST_SCENARIOS.filter(s => getScenarioStatus(s.key) === "not_started").length}
              </p>
              <p className="text-sm text-muted-foreground">Not Started</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
