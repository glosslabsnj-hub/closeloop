import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Loader2, CheckCircle2, CreditCard, Lock, ArrowLeft, MessageSquare, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { plans, type PlanInfo } from "@/components/pricing/PricingCards";
import type { PlanCode } from "@/types/database";

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const planCode = searchParams.get("plan") as PlanCode | null;
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get selected plan info
  const selectedPlan = plans.find((p) => p.code === planCode) || plans[1]; // Default to voice plan

  // Redirect to pricing if no plan selected
  useEffect(() => {
    if (!planCode) {
      navigate("/#pricing");
    }
  }, [planCode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign up the user - the plan will be stored after onboarding
      await signUp(email, password);
      
      // Store selected plan in sessionStorage for after onboarding
      sessionStorage.setItem("selectedPlan", selectedPlan.code);
      
      toast({
        title: "Account created!",
        description: "Let's set up your business.",
      });
      navigate("/app/onboarding");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating account",
        description: error.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (code: PlanCode) => {
    switch (code) {
      case "text":
        return MessageSquare;
      case "voice":
        return Phone;
      case "both":
        return Sparkles;
    }
  };

  const PlanIcon = getPlanIcon(selectedPlan.code);

  if (!planCode) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Back link */}
        <Link 
          to="/#pricing" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Change plan
        </Link>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                selectedPlan.highlight ? 'bg-primary' : 'bg-primary/10'
              }`}>
                <PlanIcon className={`h-7 w-7 ${selectedPlan.highlight ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>
            </div>
            <Badge variant="secondary" className="mx-auto mb-2">
              {selectedPlan.name}
            </Badge>
            <CardTitle className="text-2xl">Start your 7-day free trial</CardTitle>
            <CardDescription>
              ${selectedPlan.price}/month after trial ends. Cancel anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <Separator />

              {/* Payment Details - Mock/Placeholder */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4" />
                  Payment Details
                  <Badge variant="outline" className="ml-auto text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Secure
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your card will be saved securely. You won't be charged until your 7-day trial ends.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="card">Card number</Label>
                    <Input
                      id="card"
                      placeholder="4242 4242 4242 4242"
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        disabled
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        disabled
                        className="bg-muted/50"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded border">
                  💳 Stripe payment coming soon — currently running in trial mode
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Start 7-Day Free Trial
                  </>
                )}
              </Button>
            </form>

            <div className="space-y-2">
              {[
                "No charge for 7 days",
                "Cancel anytime before trial ends",
                `Then $${selectedPlan.price}/month`,
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
