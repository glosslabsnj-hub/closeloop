import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AudioWaveform, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/config/brand";

interface AgencyInfo {
  agency_id: string;
  agency_name: string;
  branding_json: Record<string, unknown>;
}

export default function AgencyReferralSignupPage() {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo | null>(null);
  const [resolving, setResolving] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  // Resolve the agency slug on mount
  useEffect(() => {
    if (!agencySlug) {
      setNotFound(true);
      setResolving(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("resolve-agency-slug", {
          body: { slug: agencySlug },
        });

        if (error || !data?.agency_id) {
          setNotFound(true);
        } else {
          setAgencyInfo(data as AgencyInfo);
        }
      } catch {
        setNotFound(true);
      } finally {
        setResolving(false);
      }
    })();
  }, [agencySlug]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!businessName.trim()) newErrors.businessName = "Please enter your business name.";
    if (!email.trim()) newErrors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Please enter a valid email address.";
    if (!password) newErrors.password = "Please create a password.";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters.";
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

      // Store referral info for onboarding
      sessionStorage.setItem("businessName", businessName.trim());
      sessionStorage.setItem("referralAgencySlug", agencySlug || "");
      sessionStorage.setItem("selectedPlan", "growth-150");

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

  // Loading state
  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Agency Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The referral link you followed doesn't match any active agency partner. Please check the link and try again.
            </p>
            <Button asChild variant="outline">
              <Link to="/signup">Sign Up Directly</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <AudioWaveform className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">{BRAND.name}</span>
          </div>
        </div>

        {/* Agency Welcome */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Referred by</p>
          <h1 className="text-xl font-semibold">{agencyInfo?.agency_name}</h1>
          <p className="text-sm text-muted-foreground">
            Create your account to get started with AI-powered voice for your business.
          </p>
        </div>

        {/* Form */}
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

          <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>
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

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
