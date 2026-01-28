import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Building2, Clock, Zap, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Sparkles, Calendar } from "lucide-react";
import { industryConfigs, industryOptions, ServiceTemplate, ExtendedIndustryType } from "@/data/industryTemplates";
import ServiceEditor from "@/components/onboarding/ServiceEditor";
import BusinessHoursEditor, { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const defaultBusinessHours: BusinessHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "10:00", close: "14:00", closed: false },
  sunday: { open: "00:00", close: "00:00", closed: true },
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Business Info
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<ExtendedIndustryType>("detailing");
  const [customIndustry, setCustomIndustry] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  
  // Step 2: Services
  const [services, setServices] = useState<ServiceTemplate[]>(industryConfigs.detailing.services);
  
  // Step 3: Business Hours
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours);
  
  // Step 4: Automations
  const [automations, setAutomations] = useState({
    missedCall: true,
    bookingConfirmation: true,
    noReply24h: true,
  });

  const { user, refreshTenant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Update services when industry changes
  useEffect(() => {
    setServices(industryConfigs[industry].services);
  }, [industry]);

  const handleIndustryChange = (value: ExtendedIndustryType) => {
    setIndustry(value);
    if (value !== "other") {
      setCustomIndustry("");
    }
  };

  const canProceedStep1 = businessName.trim().length > 0 && 
    (industry !== "other" || customIndustry.trim().length > 0);
  
  const canProceedStep2 = services.length > 0 && 
    services.every(s => s.name.trim().length > 0);

  const handleComplete = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not logged in",
        description: "Please log in to complete setup.",
      });
      navigate("/login?redirect=/app/onboarding");
      return;
    }

    setLoading(true);

    try {
      // Get context fields for this industry
      const contextFields = industryConfigs[industry].contextFields;

      // Create tenant - cast to any to handle new columns not yet in types
      const tenantData = {
        name: businessName,
        industry: industry as any,
        custom_industry: industry === "other" ? customIndustry : null,
        timezone,
        hours_json: businessHours as any,
        context_fields_json: contextFields as any,
        ai_enabled: false, // AI is now a premium feature
      };

      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert(tenantData as any)
        .select()
        .single();

      if (tenantError) {
        console.error("Tenant creation error:", tenantError);
        throw new Error(tenantError.message || "Failed to create business profile");
      }

      if (!tenant) {
        throw new Error("Failed to create business profile - no data returned");
      }

      // Create tenant user
      const { error: tuError } = await supabase
        .from("tenant_users")
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: "owner",
        });

      if (tuError) {
        console.error("Tenant user creation error:", tuError);
        throw new Error(tuError.message || "Failed to link user to business");
      }

      // Create services
      const servicesToInsert = services
        .filter(s => s.name.trim().length > 0)
        .map(service => ({
          tenant_id: tenant.id,
          name: service.name,
          duration_minutes: service.duration,
          price_amount: service.price,
          price_type: service.priceType as "fixed" | "starting_at" | "quote_only",
          is_active: true,
        }));

      if (servicesToInsert.length > 0) {
        const { error: servicesError } = await supabase
          .from("services")
          .insert(servicesToInsert);

        if (servicesError) {
          console.error("Services creation error:", servicesError);
          // Non-fatal, continue
        }
      }

      // Create automations based on selections
      const automationsToInsert = [];

      if (automations.missedCall) {
        automationsToInsert.push({
          tenant_id: tenant.id,
          name: "Missed Call Follow-up",
          trigger: "missed_call" as const,
          is_enabled: true,
          steps_json: [
            { type: "send_message", body: "Hi! We noticed we missed your call. How can we help you today?" },
            { type: "wait_minutes", minutes: 10 },
            { type: "send_message", body: "We'd love to help! Would you like to schedule an appointment?" },
          ],
        });
      }

      if (automations.bookingConfirmation) {
        automationsToInsert.push({
          tenant_id: tenant.id,
          name: "Booking Confirmation",
          trigger: "booking_created" as const,
          is_enabled: true,
          steps_json: [
            { type: "send_message", body: "Your appointment is confirmed! We'll see you soon." },
          ],
        });
      }

      if (automations.noReply24h) {
        automationsToInsert.push({
          tenant_id: tenant.id,
          name: "24h Follow-up",
          trigger: "no_reply_24h" as const,
          is_enabled: true,
          steps_json: [
            { type: "send_message", body: "Hi! Just following up on our conversation. Are you still interested in booking?" },
          ],
        });
      }

      if (automationsToInsert.length > 0) {
        const { error: autoError } = await supabase
          .from("automations")
          .insert(automationsToInsert);

        if (autoError) {
          console.error("Automations creation error:", autoError);
          // Non-fatal, continue
        }
      }

      await refreshTenant();

      toast({
        title: "You're all set!",
        description: "Your business is ready to go.",
      });

      navigate("/app/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        variant: "destructive",
        title: "Error setting up business",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Step {step} of {totalSteps}</span>
            <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Tell us about your business</CardTitle>
              <CardDescription>We'll customize CloseLoop for your industry.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Mike's Auto Care"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={handleIndustryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        <span className="flex items-center gap-2">
                          <span>{ind.icon}</span>
                          <span>{ind.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {industry === "other" && (
                <div className="space-y-2">
                  <Label htmlFor="customIndustry">What's your industry?</Label>
                  <Input
                    id="customIndustry"
                    placeholder="e.g., Window Tinting, Boat Detailing"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Services */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Your services</CardTitle>
              <CardDescription>
                We've pre-filled common services for {industryConfigs[industry].label.toLowerCase()}. 
                Edit, add, or remove as needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ServiceEditor services={services} onChange={setServices} />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)} disabled={!canProceedStep2}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Business Hours */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Business hours</CardTitle>
              <CardDescription>Set your operating hours so we know when to book appointments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BusinessHoursEditor hours={businessHours} onChange={setBusinessHours} />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Automations */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Automations</CardTitle>
              <CardDescription>These free automations help you close more deals automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">Missed Call Follow-up</p>
                    <p className="text-sm text-muted-foreground">Instantly text when a call is missed</p>
                  </div>
                  <Switch 
                    checked={automations.missedCall} 
                    onCheckedChange={(checked) => setAutomations(a => ({ ...a, missedCall: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">Booking Confirmation</p>
                    <p className="text-sm text-muted-foreground">Confirm appointments automatically</p>
                  </div>
                  <Switch 
                    checked={automations.bookingConfirmation}
                    onCheckedChange={(checked) => setAutomations(a => ({ ...a, bookingConfirmation: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">24h Follow-up</p>
                    <p className="text-sm text-muted-foreground">Follow up if no response in 24 hours</p>
                  </div>
                  <Switch 
                    checked={automations.noReply24h}
                    onCheckedChange={(checked) => setAutomations(a => ({ ...a, noReply24h: checked }))}
                  />
                </div>
              </div>

              {/* AI Assistant Upsell */}
              <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">AI Voice Assistant</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Let AI answer calls 24/7, qualify leads, and book appointments automatically.
                    </p>
                    <span className="text-xs font-medium text-primary">Available after setup →</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(5)}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Complete */}
        {step === 5 && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">You're ready to go!</CardTitle>
              <CardDescription>
                CloseLoop is set up for {businessName}. Let's start recovering revenue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Business profile: <strong>{businessName}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Industry: <strong>{industryConfigs[industry].icon} {industry === "other" ? customIndustry : industryConfigs[industry].label}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span><strong>{services.filter(s => s.name.trim()).length}</strong> services configured</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Business hours set</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span><strong>{Object.values(automations).filter(Boolean).length}</strong> automations enabled</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={handleComplete} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Launch CloseLoop
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
