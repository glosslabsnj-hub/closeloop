import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Calendar,
  FileText,
  FileCheck,
  Receipt,
  Phone,
  Mail,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface TenantInfo {
  id: string;
  name: string;
  phone_public: string | null;
  address: string | null;
  website_url: string | null;
}

interface CustomerData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_e164: string | null;
}

interface Booking {
  id: string;
  start_at: string;
  status: string;
  notes: string | null;
  service_id: string | null;
}

interface Estimate {
  id: string;
  estimate_number: string;
  title: string | null;
  status: string;
  total_cents: number | null;
  created_at: string;
}

interface Agreement {
  id: string;
  agreement_number: string;
  plan_name: string;
  status: string;
  price_cents: number;
  billing_frequency: string;
  renewal_date: string | null;
}

function formatCurrency(cents: number | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const statusColors: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
};

export default function CustomerPortalPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [searchParams] = useSearchParams();
  const customerToken = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);

  // Load tenant info
  useEffect(() => {
    if (tenantId) {
      loadTenant();
    }
  }, [tenantId]);

  // If token provided, auto-load customer
  useEffect(() => {
    if (customerToken && tenant) {
      loadCustomerByToken(customerToken);
    }
  }, [customerToken, tenant]);

  const loadTenant = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, phone_public, address, website_url")
        .eq("id", tenantId)
        .single();

      if (error || !data) {
        console.error("Tenant not found:", error);
        setIsLoading(false);
        return;
      }

      setTenant(data);
    } catch (err) {
      console.error("Error loading tenant:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerByToken = async (token: string) => {
    // Token is just the customer ID for now (in production, use signed JWT)
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, email, phone_e164")
        .eq("id", token)
        .eq("tenant_id", tenantId)
        .single();

      if (data) {
        setCustomer(data);
        loadCustomerData(data.id);
      }
    } catch (err) {
      console.error("Error loading customer by token:", err);
    }
  };

  const handleLookup = async () => {
    if (!lookupEmail.trim()) return;

    setIsLookingUp(true);
    setLookupError("");

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, email, phone_e164")
        .eq("tenant_id", tenantId)
        .or(`email.eq.${lookupEmail},phone_e164.eq.${lookupEmail}`)
        .single();

      if (error || !data) {
        setLookupError("No account found with that email or phone number.");
        return;
      }

      setCustomer(data);
      loadCustomerData(data.id);
    } catch (err: any) {
      setLookupError("Error looking up account. Please try again.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const loadCustomerData = async (customerId: string) => {
    // Load bookings
    try {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("id, start_at, status, notes, service_id")
        .eq("lead_id", customerId)
        .order("start_at", { ascending: false })
        .limit(20);

      if (bookingsData) setBookings(bookingsData as Booking[]);
    } catch (err) {
      console.error("Error loading bookings:", err);
    }

    // Load estimates
    try {
      const { data: estimatesData } = await supabase
        .from("estimates")
        .select("id, estimate_number, title, status, total_cents, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (estimatesData) setEstimates(estimatesData);
    } catch (err) {
      console.error("Error loading estimates:", err);
    }

    // Load agreements
    try {
      const { data: agreementsData } = await supabase
        .from("service_agreements")
        .select("id, agreement_number, plan_name, status, price_cents, billing_frequency, renewal_date")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (agreementsData) setAgreements(agreementsData);
    } catch (err) {
      console.error("Error loading agreements:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Portal Not Found</h2>
            <p className="text-muted-foreground">
              This customer portal doesn't exist or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{tenant.name}</h1>
              <p className="text-sm text-muted-foreground">Customer Portal</p>
            </div>
            {tenant.phone_public && (
              <a
                href={`tel:${tenant.phone_public}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {tenant.phone_public}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!customer ? (
          /* Login/Lookup Form */
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle>Welcome to {tenant.name}</CardTitle>
              <CardDescription>
                Enter your email or phone number to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lookup">Email or Phone</Label>
                <Input
                  id="lookup"
                  type="text"
                  placeholder="you@example.com or +1234567890"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                />
              </div>
              {lookupError && (
                <p className="text-sm text-red-600">{lookupError}</p>
              )}
              <Button
                onClick={handleLookup}
                disabled={isLookingUp || !lookupEmail.trim()}
                className="w-full"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  "Access My Account"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Customer Dashboard */
          <div className="space-y-6">
            {/* Welcome */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Welcome back, {customer.full_name?.split(" ")[0] || "there"}!
                    </h2>
                    <p className="text-muted-foreground">
                      Here's an overview of your account with {tenant.name}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomer(null)}
                  >
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="bookings">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bookings" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="estimates" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Estimates
                </TabsTrigger>
                <TabsTrigger value="agreements" className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Agreements
                </TabsTrigger>
              </TabsList>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bookings.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No appointments found.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {bookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">Appointment</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(booking.start_at), "EEEE, MMMM d 'at' h:mm a")}
                                </p>
                              </div>
                            </div>
                            <Badge className={statusColors[booking.status] || "bg-gray-100"}>
                              {booking.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Estimates Tab */}
              <TabsContent value="estimates" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Estimates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {estimates.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No estimates found.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {estimates.map((estimate) => (
                          <div
                            key={estimate.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {estimate.title || estimate.estimate_number}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(estimate.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(estimate.total_cents)}</p>
                              <Badge className={statusColors[estimate.status] || "bg-gray-100"}>
                                {estimate.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Agreements Tab */}
              <TabsContent value="agreements" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Service Agreements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {agreements.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No service agreements found.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {agreements.map((agreement) => (
                          <div
                            key={agreement.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileCheck className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{agreement.plan_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {agreement.renewal_date && (
                                    <>Renews {format(new Date(agreement.renewal_date), "MMM d, yyyy")}</>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                {formatCurrency(agreement.price_cents)}
                                <span className="text-sm font-normal text-muted-foreground">
                                  /{agreement.billing_frequency === "monthly" ? "mo" : agreement.billing_frequency === "quarterly" ? "qtr" : "yr"}
                                </span>
                              </p>
                              <Badge className={statusColors[agreement.status] || "bg-gray-100"}>
                                {agreement.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Contact Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Need help?</h3>
                    <p className="text-sm text-muted-foreground">
                      Contact {tenant.name} directly
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {tenant.phone_public && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${tenant.phone_public}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-4 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Powered by CloseLoop
        </div>
      </footer>
    </div>
  );
}
