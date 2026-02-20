import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { SessionExpirationHandler } from "@/components/auth/SessionExpirationHandler";
import ErrorBoundary from "@/components/ErrorBoundary";

// Layouts — eagerly loaded (structural, always needed)
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { AppLayout } from "@/components/layouts/AppLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { DriverLayout } from "@/components/layouts/DriverLayout";

// Landing page — eagerly loaded (most common entry point)
import LandingPage from "@/pages/public/LandingPage";

// Shared loading fallback
const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// Public Pages (lazy — not all visitors hit every public page)
const PricingPage = lazy(() => import("@/pages/public/PricingPage"));
const LoginPage = lazy(() => import("@/pages/public/LoginPage"));
const SignupPage = lazy(() => import("@/pages/public/SignupPage"));
const EstimateViewPage = lazy(() => import("@/pages/public/EstimateViewPage"));
const CustomerPortalPage = lazy(() => import("@/pages/public/CustomerPortalPage"));
const PublicROIReportPage = lazy(() => import("@/pages/public/PublicROIReportPage"));
const AgenciesPage = lazy(() => import("@/pages/public/AgenciesPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/public/ForgotPasswordPage"));
const AgencyReferralSignupPage = lazy(() => import("@/pages/public/AgencyReferralSignupPage"));

// App Pages
const OnboardingPage = lazy(() => import("@/pages/app/OnboardingPage"));
const DashboardPage = lazy(() => import("@/pages/app/DashboardPage"));
const SystemMapPage = lazy(() => import("@/pages/SystemMapPage"));
const UnifiedInboxPage = lazy(() => import("@/pages/app/UnifiedInboxPage"));
const BookingsPage = lazy(() => import("@/pages/app/BookingsPage"));
const IntegrationsPage = lazy(() => import("@/pages/app/IntegrationsPage"));
const AIAssistantPage = lazy(() => import("@/pages/app/AIAssistantPage"));
const SettingsPage = lazy(() => import("@/pages/app/SettingsPage"));
const SimulatorPage = lazy(() => import("@/pages/app/SimulatorPage"));
const GoLivePage = lazy(() => import("@/pages/app/GoLivePage"));
const BusinessBrainPage = lazy(() => import("@/pages/app/BusinessBrainPage"));
const BusinessBrainGapsPage = lazy(() => import("@/pages/app/BusinessBrainGapsPage"));
const ReadinessFixCenterPage = lazy(() => import("@/pages/app/ReadinessFixCenterPage"));
const UsagePage = lazy(() => import("@/pages/app/UsagePage"));
const EstimatesPage = lazy(() => import("@/pages/app/EstimatesPage"));
const AgreementsPage = lazy(() => import("@/pages/app/AgreementsPage"));
const CustomersPage = lazy(() => import("@/pages/app/CustomersPage"));
const TimeTrackingPage = lazy(() => import("@/pages/app/TimeTrackingPage"));
const DispatchMapPage = lazy(() => import("@/pages/app/DispatchMapPage"));
const InventoryPage = lazy(() => import("@/pages/app/InventoryPage"));
const KitchenDisplayPage = lazy(() => import("@/pages/app/KitchenDisplayPage"));
const LoyaltyPage = lazy(() => import("@/pages/app/LoyaltyPage"));
const TestAIPage = lazy(() => import("@/pages/app/TestAIPage"));

// Module-specific pages
const OrdersPage = lazy(() => import("@/pages/app/OrdersPage"));
const ReservationsPage = lazy(() => import("@/pages/app/ReservationsPage"));
const CateringPage = lazy(() => import("@/pages/app/CateringPage"));
const DispatchPage = lazy(() => import("@/pages/app/DispatchPage"));
const ImpoundLotPage = lazy(() => import("@/pages/app/ImpoundLotPage"));
const FleetPage = lazy(() => import("@/pages/app/FleetPage"));
const MedicalIntakePage = lazy(() => import("@/pages/app/MedicalIntakePage"));
const SalesPipelinePage = lazy(() => import("@/pages/app/SalesPipelinePage"));
const TestDrivesPage = lazy(() => import("@/pages/app/TestDrivesPage"));
const SalesInventoryPage = lazy(() => import("@/pages/app/SalesInventoryPage"));
const OrderTicketPage = lazy(() => import("@/pages/app/OrderTicketPage"));
const HelpCenterPage = lazy(() => import("@/pages/app/HelpCenterPage"));
const ScheduleConnectionPage = lazy(() => import("@/pages/app/ScheduleConnectionPage"));
const BusinessPartnerPage = lazy(() => import("@/pages/app/BusinessPartnerPage"));
const ReportsROIPage = lazy(() => import("@/pages/app/ReportsROIPage"));
const WorkflowEditPage = lazy(() => import("@/pages/app/WorkflowEditPage"));
const WorkflowRunsPage = lazy(() => import("@/pages/app/WorkflowRunsPage"));
const WorkflowRunDetailPage = lazy(() => import("@/pages/app/WorkflowRunDetailPage"));
const LeadRecoveryPage = lazy(() => import("@/pages/app/LeadRecoveryPage"));
const JobsPage = lazy(() => import("@/pages/app/JobsPage"));
const AgencyDashboardPage = lazy(() => import("@/pages/app/AgencyDashboardPage"));
const AgencyLeadFinderPage = lazy(() => import("@/pages/app/agency/AgencyLeadFinderPage"));
const AgencyClientsPage = lazy(() => import("@/pages/app/agency/AgencyClientsPage"));
const AgencySavedLeadsPage = lazy(() => import("@/pages/app/agency/AgencySavedLeadsPage"));
const AgencyCommissionsPage = lazy(() => import("@/pages/app/agency/AgencyCommissionsPage"));
const AgencyReportsPage = lazy(() => import("@/pages/app/agency/AgencyReportsPage"));

// Driver Portal Pages
const DriverLoginPage = lazy(() => import("@/pages/driver/DriverLoginPage"));
const DriverDashboard = lazy(() => import("@/pages/driver/DriverDashboard"));
const DriverJobDetail = lazy(() => import("@/pages/driver/DriverJobDetail"));
const DriverImpoundLog = lazy(() => import("@/pages/driver/DriverImpoundLog"));
const DriverVehicleSelect = lazy(() => import("@/pages/driver/DriverVehicleSelect"));

// Admin Pages
const AdminOverviewPage = lazy(() => import("@/pages/admin/AdminOverviewPage"));
const AdminTenantsPage = lazy(() => import("@/pages/admin/AdminTenantsPage"));
const AdminSupportPage = lazy(() => import("@/pages/admin/AdminSupportPage"));
const AdminDemoLibraryPage = lazy(() => import("@/pages/admin/AdminDemoLibraryPage"));
const AdminGoldenPathPage = lazy(() => import("@/pages/admin/AdminGoldenPathPage"));
const AdminSetupRequestsPage = lazy(() => import("@/pages/admin/AdminSetupRequestsPage"));
const AdminAuditReportPage = lazy(() => import("@/pages/admin/AdminAuditReportPage"));
const AdminAgencyApplicationsPage = lazy(() => import("@/pages/admin/AdminAgencyApplicationsPage"));
const AdminTestOnboardingPage = lazy(() => import("@/pages/admin/AdminTestOnboardingPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminAgenciesPage = lazy(() => import("@/pages/admin/AdminAgenciesPage"));
const AdminLeadFinderPage = lazy(() => import("@/pages/admin/AdminLeadFinderPage"));
const AdminResellerFinderPage = lazy(() => import("@/pages/admin/AdminResellerFinderPage"));
const AdminMarketingPage = lazy(() => import("@/pages/admin/AdminMarketingPage"));
const AdminGrowthEnginePage = lazy(() => import("@/pages/admin/AdminGrowthEnginePage"));
const AdminBlueprintPage = lazy(() => import("@/pages/admin/AdminBlueprintPage"));
const AdminCommissionPayoutsPage = lazy(() => import("@/pages/admin/AdminCommissionPayoutsPage"));

// Debug Pages
const TelephonyDebugPage = lazy(() => import("@/pages/debug/TelephonyDebugPage"));
const AIContextInspectorPage = lazy(() => import("@/pages/debug/AIContextInspectorPage"));
const AvailabilityDebugPage = lazy(() => import("@/pages/debug/AvailabilityDebugPage"));
const ExtractionDebugPage = lazy(() => import("@/pages/debug/ExtractionDebugPage"));
const ContextDebuggerPage = lazy(() => import("@/pages/debug/ContextDebuggerPage"));

const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
    <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SessionExpirationHandler />
          <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/agencies" element={<AgenciesPage />} />
            </Route>

            {/* Public Estimate View (no layout - clean customer experience) */}
            <Route path="/estimate/:id" element={<EstimateViewPage />} />

            {/* Customer Portal (no layout - clean customer experience) */}
            <Route path="/portal/:tenantId" element={<CustomerPortalPage />} />

            {/* Public ROI Report (no layout - shareable) */}
            <Route path="/roi/:tenantId/:shareToken" element={<PublicROIReportPage />} />

            {/* Agency Referral Signup (no layout - branded signup) */}
            <Route path="/join/:agencySlug" element={<AgencyReferralSignupPage />} />

            {/* Onboarding and Go-Live (no layout) */}
            <Route path="/app/onboarding" element={<OnboardingPage />} />
            <Route path="/app/go-live" element={<GoLivePage />} />
            <Route path="/app/system-map" element={<SystemMapPage />} />

            {/* App Routes */}
            <Route element={<AppLayout />}>
              <Route path="/app/dashboard" element={<DashboardPage />} />
              <Route path="/app/inbox" element={<UnifiedInboxPage />} />
              {/* Legacy routes - redirect to unified inbox tabs */}
              <Route path="/app/calls" element={<Navigate to="/app/inbox?tab=calls" replace />} />
              <Route path="/app/leads" element={<Navigate to="/app/inbox?tab=leads" replace />} />
              <Route path="/app/customers" element={<CustomersPage />} />
              <Route path="/app/bookings" element={<BookingsPage />} />
              <Route path="/app/services" element={<Navigate to="/app/business-brain?section=services" replace />} />
              <Route path="/app/integrations" element={<IntegrationsPage />} />
              <Route path="/app/integrations/schedule" element={<ScheduleConnectionPage />} />
              <Route path="/app/ai-assistant" element={<AIAssistantPage />} />
              {/* Legacy routes - redirect to integrations */}
              <Route path="/app/automations" element={<IntegrationsPage />} />
              <Route path="/app/simulator" element={<SimulatorPage />} />
              <Route path="/app/test-ai" element={<TestAIPage />} />
              <Route path="/app/business-brain" element={<BusinessBrainPage />} />
              <Route path="/app/business-brain/gaps" element={<BusinessBrainGapsPage />} />
              <Route path="/app/readiness" element={<ReadinessFixCenterPage />} />
              <Route path="/app/usage" element={<UsagePage />} />
              <Route path="/app/estimates" element={<EstimatesPage />} />
              <Route path="/app/agreements" element={<AgreementsPage />} />
              <Route path="/app/time-tracking" element={<TimeTrackingPage />} />
              <Route path="/app/dispatch-map" element={<DispatchMapPage />} />
              <Route path="/app/inventory" element={<InventoryPage />} />
              <Route path="/app/kitchen" element={<KitchenDisplayPage />} />
              <Route path="/app/loyalty" element={<LoyaltyPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              {/* Module-specific routes */}
              <Route path="/app/orders" element={<OrdersPage />} />
              <Route path="/app/reservations" element={<ReservationsPage />} />
              <Route path="/app/catering" element={<CateringPage />} />
              <Route path="/app/dispatch" element={<DispatchPage />} />
              <Route path="/app/impound-lot" element={<ImpoundLotPage />} />
              <Route path="/app/fleet" element={<FleetPage />} />
              <Route path="/app/medical-intake" element={<MedicalIntakePage />} />
              <Route path="/app/sales-pipeline" element={<SalesPipelinePage />} />
              <Route path="/app/test-drives" element={<TestDrivesPage />} />
              <Route path="/app/sales-inventory" element={<SalesInventoryPage />} />
              <Route path="/app/jobs" element={<JobsPage />} />
              <Route path="/app/orders/:orderId/ticket" element={<OrderTicketPage />} />
              <Route path="/app/reports/roi" element={<ReportsROIPage />} />
              <Route path="/app/leads/recovery" element={<LeadRecoveryPage />} />
              <Route path="/app/partner" element={<BusinessPartnerPage />} />
              <Route path="/app/agency" element={<AgencyDashboardPage />} />
              <Route path="/app/agency/clients" element={<AgencyClientsPage />} />
              <Route path="/app/agency/leads" element={<AgencyLeadFinderPage />} />
              <Route path="/app/agency/leads/saved" element={<AgencySavedLeadsPage />} />
              <Route path="/app/agency/commissions" element={<AgencyCommissionsPage />} />
              <Route path="/app/agency/reports" element={<AgencyReportsPage />} />
              <Route path="/app/help" element={<HelpCenterPage />} />
              {/* Legacy: Menu Center now lives in Business Brain */}
              <Route path="/app/menu-center" element={<Navigate to="/app/business-brain" replace />} />
              {/* Legacy workflow routes - deprecated but accessible via direct URL */}
              <Route path="/app/workflows" element={<IntegrationsPage />} />
              <Route path="/app/workflows/new" element={<WorkflowEditPage />} />
              <Route path="/app/workflows/:id" element={<WorkflowEditPage />} />
              <Route path="/app/workflows/:id/runs" element={<WorkflowRunsPage />} />
              <Route path="/app/workflows/:id/runs/:runId" element={<WorkflowRunDetailPage />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/overview" element={<AdminOverviewPage />} />
              <Route path="/admin/tenants" element={<AdminTenantsPage />} />
              <Route path="/admin/agencies" element={<AdminAgenciesPage />} />
              <Route path="/admin/lead-finder" element={<AdminLeadFinderPage />} />
              <Route path="/admin/reseller-finder" element={<AdminResellerFinderPage />} />
              <Route path="/admin/marketing" element={<AdminMarketingPage />} />
              <Route path="/admin/support" element={<AdminSupportPage />} />
              <Route path="/admin/demo-library" element={<AdminDemoLibraryPage />} />
              <Route path="/admin/golden-path" element={<AdminGoldenPathPage />} />
              <Route path="/admin/setup-requests" element={<AdminSetupRequestsPage />} />
              <Route path="/admin/audit-report" element={<AdminAuditReportPage />} />
              <Route path="/admin/test-onboarding" element={<AdminTestOnboardingPage />} />
              <Route path="/admin/agency-applications" element={<AdminAgencyApplicationsPage />} />
              <Route path="/admin/growth-engine" element={<AdminGrowthEnginePage />} />
              <Route path="/admin/blueprint" element={<AdminBlueprintPage />} />
              <Route path="/admin/commission-payouts" element={<AdminCommissionPayoutsPage />} />
            </Route>

            {/* Driver Portal Routes */}
            <Route path="/driver-login" element={<DriverLoginPage />} />
            <Route element={<DriverLayout />}>
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/driver/jobs/:id" element={<DriverJobDetail />} />
              <Route path="/driver/impound" element={<DriverImpoundLog />} />
              <Route path="/driver/vehicle" element={<DriverVehicleSelect />} />
            </Route>

            {/* Debug Routes (super_admin only — protected by AdminLayout) */}
            <Route element={<AdminLayout />}>
              <Route path="/debug/telephony" element={<TelephonyDebugPage />} />
              <Route path="/debug/ai-context" element={<AIContextInspectorPage />} />
              <Route path="/debug/availability" element={<AvailabilityDebugPage />} />
              <Route path="/debug/extraction" element={<ExtractionDebugPage />} />
              <Route path="/debug/context" element={<ContextDebuggerPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
