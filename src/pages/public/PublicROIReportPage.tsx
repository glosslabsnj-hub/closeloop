import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, DollarSign, TrendingUp, Truck, ShoppingBag } from "lucide-react";

interface ROIData {
  tenant_name: string;
  business_mode: string;
  total_calls: number;
  bookings_created: number;
  dispatch_jobs_created: number;
  food_orders_created: number;
  total_revenue_cents: number;
  conversion_rate: number;
}

const modeTerms: Record<string, { entity: string; entityIcon: typeof Calendar }> = {
  service: { entity: "appointments", entityIcon: Calendar },
  dispatch: { entity: "jobs", entityIcon: Truck },
  food: { entity: "orders", entityIcon: ShoppingBag },
  medical: { entity: "appointments", entityIcon: Calendar },
  general: { entity: "conversions", entityIcon: TrendingUp },
};

export default function PublicROIReportPage() {
  const { tenantId, shareToken } = useParams<{ tenantId: string; shareToken: string }>();
  const [data, setData] = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchROI() {
      if (!tenantId || !shareToken) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        const response = await supabase.functions.invoke("public-roi-report", {
          body: { tenant_id: tenantId, share_token: shareToken },
        });

        if (response.error) {
          setError(response.error.message || "Failed to load report");
          return;
        }

        setData(response.data as ROIData);
      } catch (err: any) {
        setError(err.message || "Failed to load report");
      } finally {
        setLoading(false);
      }
    }

    fetchROI();
  }, [tenantId, shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{error || "Report not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const terms = modeTerms[data.business_mode] || modeTerms.general;
  const EntityIcon = terms.entityIcon;
  const totalEntities = data.bookings_created + data.dispatch_jobs_created + data.food_orders_created;
  const revenueDollars = data.total_revenue_cents / 100;
  const roiMultiplier = revenueDollars > 0 && data.total_calls > 0
    ? Math.round(revenueDollars / (data.total_calls * 2)) // Rough cost per call estimate
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-2xl py-12 px-4">
        {/* Header */}
        <div className="text-center space-y-3 mb-10">
          <Badge variant="secondary" className="text-xs">AI Performance Report</Badge>
          <h1 className="text-3xl font-bold tracking-tight">{data.tenant_name}</h1>
          <p className="text-muted-foreground">
            See how AI is handling calls and driving revenue
          </p>
        </div>

        {/* Hero Stat */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Total Revenue from AI Calls</p>
            <p className="text-5xl font-bold text-primary">
              ${revenueDollars.toLocaleString()}
            </p>
            {roiMultiplier > 1 && (
              <p className="text-sm text-muted-foreground mt-2">
                {roiMultiplier}x return on investment
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Phone className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{data.total_calls.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Calls Handled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <EntityIcon className="h-6 w-6 mx-auto text-emerald-600 mb-2" />
              <p className="text-2xl font-bold">{totalEntities.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground capitalize">{terms.entity} Booked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{Math.round(data.conversion_rate * 100)}%</p>
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-6 w-6 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold">
                ${data.total_calls > 0 ? Math.round(revenueDollars / data.total_calls).toLocaleString() : 0}
              </p>
              <p className="text-xs text-muted-foreground">Revenue per Call</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm font-medium">Want results like these for your business?</p>
            <p className="text-xs text-muted-foreground">
              CloseLoop's AI receptionist handles every call, books {terms.entity}, and drives revenue 24/7.
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </a>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by CloseLoop AI
        </p>
      </div>
    </div>
  );
}
