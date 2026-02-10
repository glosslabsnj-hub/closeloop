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

  // Store plan on mount
  useEffect(() => {
    sessionStorage.setItem("selectedPlan", selectedSku);
    if (industryParam) {
      sessionStorage.setItem("selectedIndustry", industryParam);
    }
  }, [selectedSku, industryParam]);

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
      await signUp(email, password);

      // Store business name for onboarding
      sessionStorage.setItem("businessName", businessName.trim());

      toast({
        title: "Account created!",
        description: "Let's set up your business.",
      });
      navigate("/app/onboarding");
    } catch (err: any) {
      const message = err.message?.toLowerCase() || "";
      if (message.includes("already registered") || message.includes("already exists")) {
        setErrors({ email: "An account with this email already exists." });
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
    <div className="min-h-screen flex">
      {/* Left Brand Panel — hidden on mobile */}
      <div className="hidden md:flex md:w-[40%] flex-col justify-center items-center px-12 bg-gradient-to-br from-primary/90 to-primary/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(172_75%_50%/0.15),transparent_70%)]" />
        <div className="relative z-10 text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
            <AudioWaveform className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{BRAND.name}</h1>
          <p className="text-white/80 text-lg max-w-xs">{BRAND.tagline}</p>
          <div className="pt-4">
            <p className="text-white/60 text-sm">Trusted by 500+ local businesses</p>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 bg-card">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 md:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <AudioWaveform className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">{BRAND.name}</span>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-center mb-8">
            Create your account
          </h1>

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
                "Create Account"
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
