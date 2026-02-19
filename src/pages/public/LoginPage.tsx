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

      // Check if user is super_admin to redirect appropriately
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();

        if (roleData?.role === "super_admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/app/dashboard");
        }
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
            Sign in to your account
          </h1>

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
