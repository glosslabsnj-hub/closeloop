import { useState } from "react";
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
import { Phone, Building2, Clock, Bot, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import type { IndustryType } from "@/types/database";

const industries: { value: IndustryType; label: string }[] = [
  { value: "detailing", label: "Auto Detailing" },
  { value: "hvac", label: "HVAC" },
  { value: "plumber", label: "Plumbing" },
  { value: "medspa", label: "Med Spa" },
  { value: "dental", label: "Dental" },
  { value: "other", label: "Other" },
];

const defaultServices: Record<IndustryType, { name: string; duration: number; price: number }[]> = {
  detailing: [
    { name: "Basic Wash", duration: 60, price: 50 },
    { name: "Full Detail", duration: 180, price: 200 },
    { name: "Ceramic Coating", duration: 480, price: 800 },
  ],
  hvac: [
    { name: "AC Tune-Up", duration: 60, price: 99 },
    { name: "Furnace Inspection", duration: 60, price: 89 },
    { name: "Full System Service", duration: 120, price: 199 },
  ],
  plumber: [
    { name: "Drain Cleaning", duration: 60, price: 149 },
    { name: "Water Heater Repair", duration: 120, price: 299 },
    { name: "Leak Detection", duration: 60, price: 99 },
  ],
  medspa: [
    { name: "Botox", duration: 30, price: 350 },
    { name: "Facial", duration: 60, price: 150 },
    { name: "Laser Treatment", duration: 45, price: 400 },
  ],
  dental: [
    { name: "Cleaning", duration: 60, price: 150 },
    { name: "Whitening", duration: 90, price: 400 },
    { name: "Consultation", duration: 30, price: 75 },
  ],
  other: [
    { name: "Standard Service", duration: 60, price: 100 },
    { name: "Premium Service", duration: 120, price: 200 },
    { name: "Consultation", duration: 30, price: 50 },
  ],
};

const timezones = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<IndustryType>("detailing");
  const [timezone, setTimezone] = useState("America/New_York");
  const [services, setServices] = useState(defaultServices.detailing);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiGreeting, setAiGreeting] = useState("Hi, thank you for calling! How can I help you today?");
  
  const { user, refreshTenant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleIndustryChange = (value: IndustryType) => {
    setIndustry(value);
    setServices(defaultServices[value]);
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: businessName,
          industry,
          timezone,
          hours_json: {
            monday: { open: "09:00", close: "17:00", closed: false },
            tuesday: { open: "09:00", close: "17:00", closed: false },
            wednesday: { open: "09:00", close: "17:00", closed: false },
            thursday: { open: "09:00", close: "17:00", closed: false },
            friday: { open: "09:00", close: "17:00", closed: false },
            saturday: { open: "10:00", close: "14:00", closed: false },
            sunday: { open: "00:00", close: "00:00", closed: true },
          },
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create tenant user
      const { error: tuError } = await supabase
        .from("tenant_users")
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: "owner",
        });

      if (tuError) throw tuError;

      // Create services
      for (const service of services) {
        await supabase.from("services").insert({
          tenant_id: tenant.id,
          name: service.name,
          duration_minutes: service.duration,
          price_amount: service.price,
          price_type: "fixed",
          is_active: true,
        });
      }

      // Create AI assistant if enabled
      if (aiEnabled) {
        await supabase.from("ai_assistants").insert({
          tenant_id: tenant.id,
          name: "AI Assistant",
          tone: "friendly",
          greeting_script: aiGreeting,
          is_enabled: true,
        });

        await supabase.from("tenants").update({ ai_enabled: true }).eq("id", tenant.id);
      }

      // Create default automations
      await supabase.from("automations").insert([
        {
          tenant_id: tenant.id,
          name: "Missed Call Follow-up",
          trigger: "missed_call",
          is_enabled: true,
          steps_json: [
            { type: "send_message", body: "Hi! We noticed we missed your call. How can we help you today?" },
            { type: "wait_minutes", minutes: 10 },
            { type: "send_message", body: "We'd love to help! Would you like to schedule an appointment?" },
          ],
        },
        {
          tenant_id: tenant.id,
          name: "Booking Reminder",
          trigger: "booking_created",
          is_enabled: true,
          steps_json: [
            { type: "send_message", body: "Your appointment is confirmed! We'll see you soon." },
          ],
        },
      ]);

      await refreshTenant();

      toast({
        title: "You're all set!",
        description: "Your business is ready to go.",
      });

      navigate("/app/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error setting up business",
        description: error.message,
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
                  placeholder="Mike's Auto Detailing"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={handleIndustryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                disabled={!businessName}
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
              <CardDescription>We've pre-filled common services. Edit or add more anytime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((service, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.duration} min • ${service.price}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: AI Assistant */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>AI Voice Assistant</CardTitle>
              <CardDescription>Let AI answer your calls 24/7 and book appointments automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <Bot className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">Enable AI Assistant</p>
                    <p className="text-sm text-muted-foreground">Answers calls, qualifies leads, books appointments</p>
                  </div>
                </div>
                <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
              </div>
              {aiEnabled && (
                <div className="space-y-2">
                  <Label>Greeting message</Label>
                  <Input
                    value={aiGreeting}
                    onChange={(e) => setAiGreeting(e.target.value)}
                    placeholder="Hi, thank you for calling..."
                  />
                  <p className="text-xs text-muted-foreground">
                    This is what your AI will say when answering calls.
                  </p>
                </div>
              )}
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
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Automations</CardTitle>
              <CardDescription>We'll set up these automations to help you close more deals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Missed Call Follow-up", desc: "Send SMS when a call is missed" },
                { name: "Booking Confirmation", desc: "Confirm appointments automatically" },
                { name: "No Reply Follow-up", desc: "Follow up if no response in 24h" },
              ].map((auto) => (
                <div key={auto.name} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{auto.name}</p>
                    <p className="text-sm text-muted-foreground">{auto.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
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
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Business profile created</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{services.length} services added</span>
                </div>
                {aiEnabled && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>AI Assistant enabled</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Automations configured</span>
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
