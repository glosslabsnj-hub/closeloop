import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AudioWaveform, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { BRAND } from "@/config/brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login",
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Brand Panel -- hidden on mobile */}
      <div className="hidden md:flex md:w-[40%] flex-col justify-center items-center px-12 bg-gradient-to-br from-primary/90 to-primary/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(172_75%_50%/0.15),transparent_70%)]" />
        <div className="relative z-10 text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
            <AudioWaveform className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{BRAND.name}</h1>
          <p className="text-white/80 text-lg max-w-xs">{BRAND.tagline}</p>
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

          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-muted-foreground">
                We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                Check your inbox and follow the instructions.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-4 gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-center mb-2">
                Reset your password
              </h1>
              <p className="text-center text-muted-foreground mb-8">
                Enter your email and we'll send you a reset link.
              </p>

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
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline underline-offset-4 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
