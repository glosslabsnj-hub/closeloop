import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  Phone, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  PhoneCall,
  AlertTriangle
} from "lucide-react";

type ConnectStatus = "provisioning" | "awaiting_first_call" | "provisioned" | "connected" | "forwarding_verified" | "error" | "subscription_canceled" | null;

interface PhoneNumberData {
  phoneNumber: string | null;
  phoneE164: string | null;
  connectStatus: ConnectStatus;
  provisionedAt: string | null;
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const areaCode = cleaned.substring(1, 4);
    const prefix = cleaned.substring(4, 7);
    const line = cleaned.substring(7, 11);
    return `(${areaCode}) ${prefix}-${line}`;
  }
  return phone;
}

function getStatusConfig(status: ConnectStatus): { 
  label: string; 
  variant: "default" | "secondary" | "outline" | "destructive"; 
  icon: typeof CheckCircle2;
  description: string;
} {
  switch (status) {
    case "connected":
    case "forwarding_verified":
      return { 
        label: "Connected", 
        variant: "default", 
        icon: CheckCircle2,
        description: "Your AI is receiving calls on this number."
      };
    case "provisioned":
    case "awaiting_first_call":
      return { 
        label: "Awaiting First Call", 
        variant: "secondary", 
        icon: Clock,
        description: "Forward your existing number to complete setup."
      };
    case "provisioning":
      return { 
        label: "Provisioning", 
        variant: "outline", 
        icon: Loader2,
        description: "Your phone number is being set up..."
      };
    case "error":
    case "subscription_canceled":
      return { 
        label: "Error", 
        variant: "destructive", 
        icon: AlertCircle,
        description: "There was a problem with your number. Please retry."
      };
    default:
      return { 
        label: "Not Set Up", 
        variant: "outline", 
        icon: Phone,
        description: "No phone number assigned yet."
      };
  }
}

export function PhoneNumberCard() {
  const { tenant, assistantSettings, refreshTenant } = useAuth();
  const { toast } = useToast();
  const subscription = useSubscription(tenant?.id ?? null);
  const hasVoice = subscription?.hasVoice ?? false;
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Fetch phone number from phone_numbers table (source of truth)
  const { data: phoneData, isLoading, refetch } = useQuery<PhoneNumberData>({
    queryKey: ["phone-number-card", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { phoneNumber: null, phoneE164: null, connectStatus: null, provisionedAt: null };

      // Check phone_numbers table first (source of truth)
      const { data: phoneRecord } = await supabase
        .from("phone_numbers")
        .select("phone_e164, status, created_at")
        .eq("tenant_id", tenant.id)
        .eq("purpose", "forwarding")
        .maybeSingle();

      // Also get connect_status from assistant_settings
      const { data: settings } = await supabase
        .from("assistant_settings")
        .select("connect_status, closeloop_number, forwarding_phone_e164, twilio_provisioned_at")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      const phoneE164 = phoneRecord?.phone_e164 || settings?.closeloop_number || settings?.forwarding_phone_e164;
      
      return {
        phoneNumber: phoneE164 ? formatPhoneNumber(phoneE164) : null,
        phoneE164,
        connectStatus: settings?.connect_status as ConnectStatus,
        provisionedAt: phoneRecord?.created_at || settings?.twilio_provisioned_at,
      };
    },
    enabled: !!tenant?.id,
    refetchInterval: 10000, // Poll every 10s to catch status updates
  });

  const copyPhoneNumber = () => {
    if (phoneData?.phoneE164) {
      navigator.clipboard.writeText(phoneData.phoneE164);
      toast({
        title: "Copied!",
        description: "Phone number copied to clipboard",
      });
    }
  };

  const handleRetryProvision = async () => {
    if (!tenant?.id) return;
    
    setIsProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke("provision-twilio-number", {
        body: { tenant_id: tenant.id, number_type: "local" },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Phone Number Assigned! 🎉",
          description: `Your AI number is ${formatPhoneNumber(data.phone_number)}`,
        });
        refetch();
        refreshTenant();
      } else {
        throw new Error(data?.error || "Failed to provision number");
      }
    } catch (err: any) {
      console.error("Provision error:", err);
      toast({
        variant: "destructive",
        title: "Provisioning Failed",
        description: err.message || "Please try again or contact support.",
      });
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleTestCall = async () => {
    if (!tenant?.id || !phoneData?.phoneE164) return;
    
    setIsTesting(true);
    try {
      // For now, open a tel: link to initiate a call
      // In production, this could trigger an outbound test call
      window.location.href = `tel:${phoneData.phoneE164}`;
      
      toast({
        title: "Test Call",
        description: "Your phone should be dialing the AI number. Say something to test!",
      });
    } finally {
      setTimeout(() => setIsTesting(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading phone number...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(phoneData?.connectStatus);
  const StatusIcon = statusConfig.icon;
  const hasNumber = !!phoneData?.phoneNumber;
  const isConnected = phoneData?.connectStatus === "connected" || phoneData?.connectStatus === "forwarding_verified";
  
  // Show urgent repair state if user has a voice plan but no number assigned
  const needsRepair = hasVoice && !hasNumber;

  return (
    <Card className={`overflow-hidden transition-all ${
      isConnected 
        ? "border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" 
        : hasNumber 
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/10"
          : "border-border"
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${
              isConnected ? "bg-primary/15 text-primary" : hasNumber ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground"
            }`}>
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Your AI Phone Number</CardTitle>
            </div>
          </div>
          <Badge variant={statusConfig.variant} className="gap-1">
            <StatusIcon className={`h-3 w-3 ${statusConfig.label === "Provisioning" ? "animate-spin" : ""}`} />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {hasNumber ? (
          <div className="space-y-4">
            {/* Phone Number Display */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <PhoneCall className="h-5 w-5 text-primary" />
                <span className="text-xl font-semibold tracking-wide">
                  {phoneData.phoneNumber}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={copyPhoneNumber}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Status Description */}
            <p className="text-sm text-muted-foreground">
              {statusConfig.description}
            </p>

            {/* Instructions for non-connected state */}
            {!isConnected && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400 mb-2">
                  Complete Setup:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Forward your existing business number to <strong>{phoneData.phoneNumber}</strong></li>
                  <li>Or use this number directly as your business line</li>
                  <li>Place a test call to verify the connection</li>
                </ol>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleTestCall}
                disabled={isTesting}
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
                Test Call
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {needsRepair ? (
              <>
                {/* Urgent repair notice for voice plan users without a number */}
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-destructive mb-1">
                        Phone Number Missing
                      </p>
                      <p className="text-muted-foreground">
                        Your plan includes AI voice, but no phone number was assigned. Click below to provision one now.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleRetryProvision} 
                  disabled={isProvisioning}
                  variant="destructive"
                  className="gap-2 w-full"
                >
                  {isProvisioning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4" />
                      Provision Missing Number
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You need a phone number for your AI to answer calls.
                </p>
                
                <Button 
                  onClick={handleRetryProvision} 
                  disabled={isProvisioning}
                  className="gap-2"
                >
                  {isProvisioning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4" />
                      Get Phone Number
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
