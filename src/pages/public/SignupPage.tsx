import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AudioWaveform, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getLadderStep, type PlanSku } from "@/config/pricing";
import { BRAND } from "@/config/brand";

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const skuParam = searchParams.get("sku") as PlanSku | null;
  const industryParam = searchParams.get("industry");

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    businessName?: string;
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Determine the selected SKU - default to base-200
  let selectedSku: PlanSku = "base-200";
  if (skuParam) {
    const step = getLadderStep(skuParam);
    if (step) selectedSku = step.sku;
  }

  // Store plan and capture Google Ads click ID on mount
  useEffect(() => {
    sessionStorage.setItem("selectedPlan", selectedSku);
    if (industryParam) {
      sessionStorage.setItem("selectedIndustry", industryParam);
    }
    // Capture GCLID from URL for offline conversion tracking
    const gclid = searchParams.get("gclid");
    if (gclid) {
      sessionStorage.setItem("gclid", gclid);
    }
  }, [selectedSku, industryParam, searchParams]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!businessName.trim()) {
      newErrors.businessName = "Please enter your business name.";
    }

    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Please create a password.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await signUp(email, password, businessName.trim());

      // Store business name for onboarding
      sessionStorage.setItem("businessName", businessName.trim());

      // Fire Google Ads conversion on successful signup
      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: "AW-17970313271/tRXaCOK_5v4bELfw9PhC",
        });
      }

      toast({
        title: "Account created!",
        description: "Let's set up your business.",
      });
      navigate("/app/onboarding");
    } catch (err: any) {
      const message = err.message?.toLowerCase() || "";
      if (message.includes("already registered") || message.includes("already exists")) {
        setErrors({ email: "An account with this email already exists. Try signing in instead." });
      } else if (message.includes("email")) {
        setErrors({ email: "Please enter a valid email address." });
      } else if (message.includes("password")) {
        setErrors({ password: "Password is too weak. Try adding numbers or symbols." });
      } else {
        setErrors({ general: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] md:min-h-screen flex">
      {/* Left Brand Panel — hidden on mobile */}
      <div className="dark hidden md:flex md:w-[45%] flex-col justify-center items-center px-12 relative overflow-hidden bg-gradient-to-br from-[hsl(230,50%,12%)] via-[hsl(240,40%,10%)] to-[hsl(260,30%,8%)]">
        {/* Spotlight glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,hsl(230_70%_62%/0.2),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_20%_80%,hsl(280_60%_55%/0.08),transparent)] pointer-events-none" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(0_0%_100%/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        <div className="relative z-10 text-center space-y-8 max-w-sm">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 backdrop-blur-md border border-primary/20 glow-primary-sm">
            <AudioWaveform className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{BRAND.name}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">Your AI receptionist that answers calls, captures leads, and books appointments 24/7.</p>
          </div>
          <div className="pt-4 flex flex-col gap-3.5">
            {[
              "24/7 call answering, booking, and lead capture",
              "AI that learns your services, pricing, and FAQs",
              "20+ integrations (Google Calendar, Square, and more)",
              "SMS confirmations and customer CRM built in",
              "Smart call routing and urgent request handling",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-muted-foreground/80 text-sm">
                <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
                {text}
              </div>
            ))}
          </div>
          <div className="pt-4 px-6 py-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-muted-foreground/60 text-xs">7-day free trial. No credit card required. Setup in under 10 minutes.</p>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 bg-background">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 md:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <AudioWaveform className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">{BRAND.name}</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold mb-1.5">
              Start your free trial
            </h1>
            <p className="text-sm text-muted-foreground">7 days free. No credit card required. Live in under 10 minutes.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                type="text"
                placeholder="Your Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="h-12 w-full"
                aria-invalid={!!errors.businessName}
              />
              {errors.businessName && (
                <p className="text-[13px] text-destructive">{errors.businessName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full"
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-[13px] text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full"
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-[13px] text-destructive">{errors.password}</p>
              )}
            </div>

            {errors.general && (
              <p className="text-[13px] text-destructive">{errors.general}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Start Free Trial"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
