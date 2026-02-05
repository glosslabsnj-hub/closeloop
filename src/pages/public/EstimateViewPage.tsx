import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import SignatureCanvas from "react-signature-canvas";

interface EstimateLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface EstimateData {
  id: string;
  estimate_number: string;
  title: string | null;
  status: string;
  line_items: EstimateLineItem[];
  subtotal_cents: number | null;
  tax_rate_percent: number | null;
  tax_cents: number | null;
  discount_cents: number | null;
  total_cents: number | null;
  valid_until: string | null;
  customer_notes: string | null;
  terms_and_conditions: string | null;
  created_at: string;
  tenant: {
    business_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  customer: {
    full_name: string | null;
    email: string | null;
    phone_e164: string | null;
  } | null;
}

function formatCurrency(cents: number | null): string {
  if (cents === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function EstimateViewPage() {
  const { id } = useParams<{ id: string }>();
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signed, setSigned] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (id) {
      fetchEstimate();
    }
  }, [id]);

  const fetchEstimate = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("estimate-public-view", {
        body: { estimate_id: id },
      });

      if (error) throw error;
      if (!data?.estimate) throw new Error("Estimate not found");

      setEstimate(data.estimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load estimate");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setShowSignature(true);
      return;
    }

    try {
      setAccepting(true);
      const signatureData = signatureRef.current.toDataURL();

      const { error } = await supabase.functions.invoke("estimate-public-action", {
        body: {
          estimate_id: id,
          action: "accept",
          signature_data: signatureData,
        },
      });

      if (error) throw error;

      setSigned(true);
      setEstimate((prev) => prev ? { ...prev, status: "accepted" } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept estimate");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setDeclining(true);

      const { error } = await supabase.functions.invoke("estimate-public-action", {
        body: {
          estimate_id: id,
          action: "decline",
        },
      });

      if (error) throw error;

      setEstimate((prev) => prev ? { ...prev, status: "declined" } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline estimate");
    } finally {
      setDeclining(false);
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Estimate Not Found</h2>
            <p className="text-muted-foreground">{error || "This estimate may have expired or been removed."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = estimate.valid_until && new Date(estimate.valid_until) < new Date();
  const canRespond = estimate.status === "sent" || estimate.status === "viewed";
  const isAccepted = estimate.status === "accepted";
  const isDeclined = estimate.status === "declined";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {estimate.tenant?.business_name && (
            <h1 className="text-2xl font-bold mb-2">{estimate.tenant.business_name}</h1>
          )}
          <p className="text-muted-foreground">Estimate #{estimate.estimate_number}</p>
        </div>

        {/* Status Banner */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Estimate Accepted</p>
              <p className="text-sm text-green-600">Thank you for your business!</p>
            </div>
          </div>
        )}

        {isDeclined && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Estimate Declined</p>
              <p className="text-sm text-red-600">This estimate has been declined.</p>
            </div>
          </div>
        )}

        {isExpired && canRespond && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">Estimate Expired</p>
              <p className="text-sm text-orange-600">This estimate has expired. Please contact us for an updated quote.</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {estimate.title || "Service Estimate"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Created {format(new Date(estimate.created_at), "MMMM d, yyyy")}
                </p>
              </div>
              <Badge variant={isAccepted ? "default" : isDeclined ? "destructive" : "secondary"}>
                {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Customer Info */}
            {estimate.customer && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{estimate.customer.full_name || "Customer"}</p>
                {estimate.customer.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {estimate.customer.email}
                  </p>
                )}
                {estimate.customer.phone_e164 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {estimate.customer.phone_e164}
                  </p>
                )}
              </div>
            )}

            {/* Line Items */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Items & Services</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-sm">
                      <th className="text-left p-3">Description</th>
                      <th className="text-center p-3 w-20">Qty</th>
                      <th className="text-right p-3 w-28">Price</th>
                      <th className="text-right p-3 w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {estimate.line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unit_price_cents)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(item.total_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(estimate.subtotal_cents)}</span>
                </div>
                {(estimate.discount_cents ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(estimate.discount_cents)}</span>
                  </div>
                )}
                {(estimate.tax_cents ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax ({estimate.tax_rate_percent}%)</span>
                    <span>{formatCurrency(estimate.tax_cents)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(estimate.total_cents)}</span>
                </div>
              </div>
            </div>

            {/* Valid Until */}
            {estimate.valid_until && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Calendar className="h-4 w-4" />
                <span>Valid until {format(new Date(estimate.valid_until), "MMMM d, yyyy")}</span>
              </div>
            )}

            {/* Customer Notes */}
            {estimate.customer_notes && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.customer_notes}</p>
              </div>
            )}

            {/* Terms */}
            {estimate.terms_and_conditions && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Terms & Conditions</h3>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{estimate.terms_and_conditions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature Section */}
        {showSignature && canRespond && !isExpired && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Sign to Accept</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Please sign below to accept this estimate. Your signature indicates agreement to the terms and pricing above.
              </p>
              <div className="border rounded-lg bg-white mb-4">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: "w-full h-40",
                    style: { width: "100%", height: "160px" },
                  }}
                  backgroundColor="white"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {canRespond && !isExpired && (
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              onClick={handleDecline}
              disabled={declining || accepting}
              className="min-w-32"
            >
              {declining ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Decline
            </Button>
            <Button
              size="lg"
              onClick={handleAccept}
              disabled={accepting || declining}
              className="min-w-32"
            >
              {accepting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {showSignature ? "Submit Signature" : "Accept Estimate"}
            </Button>
          </div>
        )}

        {/* Contact Info */}
        {estimate.tenant && (estimate.tenant.phone || estimate.tenant.email) && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Questions? Contact us:</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              {estimate.tenant.phone && (
                <a href={`tel:${estimate.tenant.phone}`} className="flex items-center gap-1 hover:text-primary">
                  <Phone className="h-4 w-4" /> {estimate.tenant.phone}
                </a>
              )}
              {estimate.tenant.email && (
                <a href={`mailto:${estimate.tenant.email}`} className="flex items-center gap-1 hover:text-primary">
                  <Mail className="h-4 w-4" /> {estimate.tenant.email}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
