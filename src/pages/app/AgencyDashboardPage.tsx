import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building2, Clock, ArrowRight, XCircle, AlertTriangle, Sparkles, Copy, Check, LinkIcon } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AgencyOverview } from "@/components/agency/AgencyOverview";
import { AgencyTenantList } from "@/components/agency/AgencyTenantList";
import { AgencyCommissionHistory } from "@/components/agency/AgencyCommissionHistory";
import { AgencyLeadFinder } from "@/components/agency/AgencyLeadFinder";
import { QuickProvisionWizard } from "@/components/agency/QuickProvisionWizard";
import { AgencyPaymentLinkDialog } from "@/components/agency/AgencyPaymentLinkDialog";
import { useAgencyAccount, useAgencyTenants, useAgencyMetrics, useAgencyCommissions } from "@/hooks/useAgencyData";
import { useAgencyClientReadiness } from "@/hooks/useAgencyClientReadiness";
import { useMyAgencyApplication } from "@/hooks/useAgencyApplications";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AgencyDashboardPage() {
  const { data: agency, isLoading: agencyLoading, error: agencyError, refetch: refetchAgency } = useAgencyAccount();
  const { data: tenants, isLoading: tenantsLoading, error: _tenantsError } = useAgencyTenants(agency?.id);
  const { data: metrics, isLoading: metricsLoading } = useAgencyMetrics(agency?.id);
  const { data: commissionData, isLoading: commissionsLoading } = useAgencyCommissions(agency?.id);
  const { data: myApplication, isLoading: appLoading } = useMyAgencyApplication();
  const tenantIds = (tenants || []).map((t) => t.tenant_id);
  const { data: readinessMap } = useAgencyClientReadiness(tenantIds);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionLead, setProvisionLead] = useState<{ name: string; industry?: string } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDialogTenant, setPaymentDialogTenant] = useState<{ id: string; name: string } | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  const commissionRate = (agency?.billing_config_json as Record<string, unknown>)?.commission_rate as number | undefined;

  // Loading state
  if (agencyLoading || appLoading) {
    return (
      <div className="container max-w-6xl py-8 px-4 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 w-16 bg-muted rounded mb-2" />
              <div className="h-8 w-48 bg-muted rounded" />
            </div>
            <div className="h-9 w-28 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[76px] bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (agencyError) {
    return (
      <div className="container max-w-6xl py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-lg py-16">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Couldn't load your agency dashboard</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                This is usually a temporary connection issue. Try again, or come back in a minute.
              </p>
              <Button variant="outline" onClick={() => refetchAgency()}>
                Try again
              </Button>
              <div className="flex items-center justify-center gap-3 text-sm">
                <Link to="/app" className="text-primary hover:underline">Back to Dashboard</Link>
                <span className="text-border">·</span>
                <a href="mailto:support@getfluxdata.com" className="text-muted-foreground hover:underline">Contact Support</a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // No agency account — check application status
  if (!agency) {
    // Rejected application
    if (myApplication && myApplication.status === "rejected") {
      return (
        <div className="container max-w-6xl py-8 px-4 sm:px-6">
          <div className="mx-auto max-w-lg py-16">
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-7 w-7 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold">Application Not Approved</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Unfortunately, your agency application was not approved at this time.
                  {myApplication.admin_notes && (
                    <span className="block mt-2 italic">"{myApplication.admin_notes}"</span>
                  )}
                </p>
                <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium">{myApplication.company_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applied</span>
                    <span className="font-medium">{format(new Date(myApplication.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  If you believe this was a mistake, please contact our support team.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Pending/reviewing application
    if (myApplication && (myApplication.status === "new" || myApplication.status === "reviewing")) {
      return (
        <div className="container max-w-6xl py-8 px-4 sm:px-6">
          <div className="mx-auto max-w-lg py-16">
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
                  <Clock className="h-7 w-7 text-amber-500" />
                </div>
                <h2 className="text-xl font-semibold">Application Under Review</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Your agency partner application is being reviewed. We'll notify you once it's approved — typically within 24 hours.
                </p>
                <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium">{myApplication.company_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize">{myApplication.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium">{format(new Date(myApplication.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // No application — show CTA
    return (
      <div className="container max-w-6xl py-8 px-4 sm:px-6">
        <div className="text-center py-16 space-y-4">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Become an Agency Partner</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Earn recurring commissions by reselling AI voice to your clients. Free to join.
          </p>
          <Button asChild>
            <Link to="/agencies">
              Apply Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleProvisionFromLead = (lead: { name: string; industry?: string }) => {
    setProvisionLead(lead);
    setProvisionOpen(true);
  };

  const handleActivateTenant = (tenantId: string, tenantName: string) => {
    setPaymentDialogTenant({ id: tenantId, name: tenantName });
    setPaymentDialogOpen(true);
  };

  const referralLink = agency.agency_slug
    ? `${window.location.origin}/join/${agency.agency_slug}`
    : null;

  const hasClients = (tenants?.length ?? 0) > 0;

  return (
    <ErrorBoundary context="loading your agency dashboard">
    <div className="container max-w-6xl py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Agency</p>
          <h1 className="text-2xl font-bold tracking-tight">{agency.agency_name}</h1>
        </div>
        <Button onClick={() => { setProvisionLead(null); setProvisionOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Referral Link Card */}
      {referralLink && (
        <Card className="border-dashed">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Your Referral Link</p>
                  <p className="text-sm font-mono truncate">{referralLink}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0"
                onClick={async () => {
                  await navigator.clipboard.writeText(referralLink);
                  setReferralCopied(true);
                  toast.success("Referral link copied");
                  setTimeout(() => setReferralCopied(false), 2000);
                }}
              >
                {referralCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {referralCopied ? "" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Welcome banner for new agencies with 0 clients */}
      {!hasClients && !tenantsLoading && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/5 to-blue-500/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold">Welcome to your Agency Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Get started by adding your first client or using the Lead Finder to discover local businesses
                  that need an AI receptionist. You earn {Math.round((commissionRate ?? 0.20) * 100)}% on every subscription.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => { setProvisionLead(null); setProvisionOpen(true); }}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Your First Client
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => document.getElementById("lead-finder")?.scrollIntoView({ behavior: "smooth" })}>
                    Find Leads
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <AgencyOverview
        metrics={metrics}
        isLoading={metricsLoading}
        commissionThisMonthCents={commissionData?.thisMonthCents ?? 0}
        commissionRate={commissionRate}
      />

      {/* Managed Clients */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Managed Clients</h2>
          {hasClients && (
            <span className="text-xs text-muted-foreground">{tenants?.length} client{tenants?.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <AgencyTenantList
          tenants={tenants || []}
          metrics={metrics}
          isLoading={tenantsLoading}
          onActivateTenant={handleActivateTenant}
          readinessMap={readinessMap}
        />
      </section>

      {/* Lead Finder */}
      <section id="lead-finder">
        <AgencyLeadFinder onProvisionLead={handleProvisionFromLead} />
      </section>

      {/* Commission History */}
      <AgencyCommissionHistory
        commissions={commissionData?.commissions ?? []}
        isLoading={commissionsLoading}
        agencyId={agency.id}
        payoutConfig={(agency as any).payout_config_json || {}}
      />

      {/* Quick Provision Wizard */}
      <QuickProvisionWizard
        open={provisionOpen}
        onOpenChange={setProvisionOpen}
        agencyId={agency.id}
        prefillLead={provisionLead ?? undefined}
      />

      {/* Payment Link Dialog */}
      {paymentDialogTenant && (
        <AgencyPaymentLinkDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          tenantId={paymentDialogTenant.id}
          tenantName={paymentDialogTenant.name}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
