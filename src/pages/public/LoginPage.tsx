import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AudioWaveform, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);

      // Check user type to redirect appropriately
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Check super_admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();

        if (roleData?.role === "super_admin") {
          navigate("/admin/dashboard");
          return;
        }

        // 2. Check agency user
        const { data: agencyData } = await supabase
          .from("agency_accounts")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (agencyData && agencyData.length > 0) {
          navigate("/app/agency");
          return;
        }

        // 3. Default: regular tenant user
        navigate("/app/dashboard");
      } else {
        navigate("/app/dashboard");
      }
    } catch (err: any) {
      const message = err.message?.toLowerCase() || "";
      if (message.includes("invalid") || message.includes("credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (message.includes("not found")) {
        setError("No account found with this email.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: "Please check your credentials and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] md:min-h-screen flex">
      {/* Left Brand Panel — hidden on mobile */}
      <div className="hidden md:flex md:w-[45%] flex-col justify-center items-center px-12 relative overflow-hidden bg-gradient-to-br from-[hsl(230,50%,12%)] via-[hsl(240,40%,10%)] to-[hsl(260,30%,8%)]">
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
            <p className="text-muted-foreground text-lg leading-relaxed">{BRAND.tagline}</p>
          </div>
          <div className="pt-4 flex flex-col gap-3.5">
            {["Answer calls 24/7", "Book appointments automatically", "Capture every lead"].map((text) => (
              <div key={text} className="flex items-center gap-3 text-muted-foreground/80 text-sm">
                <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
                {text}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground/40 text-xs pt-6">Trusted by 500+ local businesses</p>
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
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 w-full"
              />
            </div>

            {error && (
              <p className="text-[13px] text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-primary font-medium hover:underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
