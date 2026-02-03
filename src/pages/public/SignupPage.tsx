import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Loader2, CheckCircle2, CreditCard, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getLadderStep,
  getTierInfo,
  formatPrice,
  type PlanSku,
} from "@/config/pricing";

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const skuParam = searchParams.get("sku") as PlanSku | null;
  // Industry pre-selection from demo player
  const industryParam = searchParams.get("industry");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Determine the selected SKU - default to base-200
  let selectedSku: PlanSku = "base-200";
  if (skuParam) {
    const step = getLadderStep(skuParam);
    if (step) selectedSku = step.sku;
  }

  const selectedStep = getLadderStep(selectedSku);
  const tierInfo = selectedStep ? getTierInfo(selectedStep.tier) : null;

  // Redirect to pricing if no valid plan selected
  useEffect(() => {
    if (!selectedStep) {
      navigate("/#pricing");
    }
  }, [selectedStep, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign up the user - the plan will be stored after onboarding
      await signUp(email, password);
      
      // Store selected SKU in sessionStorage for after onboarding
      sessionStorage.setItem("selectedPlan", selectedSku);
      
      // Store industry if provided (from demo player)
      if (industryParam) {
        sessionStorage.setItem("selectedIndustry", industryParam);
      }
      
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

  if (!selectedStep || !tierInfo) {
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
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
                <Phone className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <Badge variant="secondary" className="mx-auto mb-2">
              {tierInfo.displayName}
            </Badge>
            <CardTitle className="text-2xl">Get started with {selectedStep.name}</CardTitle>
            <CardDescription>
              {formatPrice(selectedStep.price)}/month. Cancel anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected Plan Details */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="font-medium mb-1">{selectedStep.name}</div>
              <div className="text-muted-foreground">
                {selectedStep.includedMinutes && `${selectedStep.includedMinutes.toLocaleString()} minutes included`}
              </div>
            </div>

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
                  Your card will be saved securely and charged upon account activation.
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
                  💳 Stripe payment coming soon — currently running in demo mode
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
                    Create Account & Continue
                  </>
                )}
              </Button>
            </form>

            <div className="space-y-2">
              {[
                "Cancel anytime",
                `${formatPrice(selectedStep.price)}/month`,
                `${selectedStep.includedMinutes?.toLocaleString()} minutes included`,
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