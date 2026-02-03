import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Check, Loader2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

// Normalize phone number to E.164 format
function normalizeToE164(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (phone.startsWith("+")) return phone;
  return digits.length > 0 ? `+${digits}` : "";
}

// Format phone for display
function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function AdminPhoneSettings() {
  const { user, isSuperAdmin } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current admin phone settings
  useEffect(() => {
    if (!user || !isSuperAdmin) return;

    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("admin_settings")
          .select("admin_phone_e164, admin_phone_verified")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.admin_phone_e164) {
          setSavedPhone(data.admin_phone_e164);
          setPhoneNumber(formatPhoneDisplay(data.admin_phone_e164));
          setIsVerified(data.admin_phone_verified || false);
        }
      } catch (error) {
        console.error("Failed to fetch admin phone settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user, isSuperAdmin]);

  const handleSavePhone = async () => {
    if (!user || !phoneNumber.trim()) return;

    const normalizedPhone = normalizeToE164(phoneNumber);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          user_id: user.id,
          admin_phone_e164: normalizedPhone,
          admin_phone_verified: false, // Reset verification on change
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      setSavedPhone(normalizedPhone);
      setIsVerified(false);
      toast.success("Admin phone number saved! Calls from this number will route to your selected tenant.");
    } catch (error: any) {
      console.error("Failed to save admin phone:", error);
      toast.error("Failed to save phone number");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkVerified = async () => {
    if (!user || !savedPhone) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("admin_settings")
        .update({
          admin_phone_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setIsVerified(true);
      toast.success("Phone marked as verified!");
    } catch (error: any) {
      console.error("Failed to verify phone:", error);
      toast.error("Failed to verify phone");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Admin Test Phone
        </CardTitle>
        <CardDescription>
          Register your personal phone number to use the universal test line. When you call{" "}
          <span className="font-mono font-medium">+1 (855) 329-7357</span>, calls will route to your currently selected tenant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="admin-phone">Your Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="admin-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSavePhone}
                  disabled={isSaving || !phoneNumber.trim()}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>

            {savedPhone && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Registered:</span>
                  <span className="font-mono text-sm font-medium">
                    {formatPhoneDisplay(savedPhone)}
                  </span>
                  {isVerified ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Unverified
                    </Badge>
                  )}
                </div>
                {!isVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkVerified}
                    disabled={isSaving}
                  >
                    Mark Verified
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg text-sm">
              <Info className="h-4 w-4 mt-0.5 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Register your personal cell phone number above</li>
                  <li>Select any tenant in the Admin Tenant Switcher</li>
                  <li>Call <span className="font-mono">+1 (855) 329-7357</span> from your phone</li>
                  <li>The AI will answer as the selected business</li>
                </ol>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
