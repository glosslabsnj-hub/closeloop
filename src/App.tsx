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

// Layouts
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { AppLayout } from "@/components/layouts/AppLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { DriverLayout } from "@/components/layouts/DriverLayout";

// Public Pages
import LandingPage from "@/pages/public/LandingPage";
import PricingPage from "@/pages/public/PricingPage";
import LoginPage from "@/pages/public/LoginPage";
import SignupPage from "@/pages/public/SignupPage";
import EstimateViewPage from "@/pages/public/EstimateViewPage";
import CustomerPortalPage from "@/pages/public/CustomerPortalPage";
import PublicROIReportPage from "@/pages/public/PublicROIReportPage";
import AgenciesPage from "@/pages/public/AgenciesPage";
import ForgotPasswordPage from "@/pages/public/ForgotPasswordPage";
import AgencyReferralSignupPage from "@/pages/public/AgencyReferralSignupPage";

// App Pages
const OnboardingPage = lazy(() => import("@/pages/app/OnboardingPage"));
import DashboardPage from "@/pages/app/DashboardPage";
import SystemMapPage from "@/pages/SystemMapPage";
import UnifiedInboxPage from "@/pages/app/UnifiedInboxPage";
import BookingsPage from "@/pages/app/BookingsPage";
// ServicesPage removed - now redirects to Business Brain
import IntegrationsPage from "@/pages/app/IntegrationsPage";
import AIAssistantPage from "@/pages/app/AIAssistantPage";
import SettingsPage from "@/pages/app/SettingsPage";
import SimulatorPage from "@/pages/app/SimulatorPage";
import GoLivePage from "@/pages/app/GoLivePage";
const BusinessBrainPage = lazy(() => import("@/pages/app/BusinessBrainPage"));
import BusinessBrainGapsPage from "@/pages/app/BusinessBrainGapsPage";
import ReadinessFixCenterPage from "@/pages/app/ReadinessFixCenterPage";
import UsagePage from "@/pages/app/UsagePage";
import EstimatesPage from "@/pages/app/EstimatesPage";
import AgreementsPage from "@/pages/app/AgreementsPage";
import CustomersPage from "@/pages/app/CustomersPage";
import TimeTrackingPage from "@/pages/app/TimeTrackingPage";
import DispatchMapPage from "@/pages/app/DispatchMapPage";
import InventoryPage from "@/pages/app/InventoryPage";
import KitchenDisplayPage from "@/pages/app/KitchenDisplayPage";
import LoyaltyPage from "@/pages/app/LoyaltyPage";
import TestAIPage from "@/pages/app/TestAIPage";

// Module-specific pages
import OrdersPage from "@/pages/app/OrdersPage";
import ReservationsPage from "@/pages/app/ReservationsPage";
import CateringPage from "@/pages/app/CateringPage";
import DispatchPage from "@/pages/app/DispatchPage";
import ImpoundLotPage from "@/pages/app/ImpoundLotPage";
import FleetPage from "@/pages/app/FleetPage";
import MedicalIntakePage from "@/pages/app/MedicalIntakePage";
import SalesPipelinePage from "@/pages/app/SalesPipelinePage";
import TestDrivesPage from "@/pages/app/TestDrivesPage";
import SalesInventoryPage from "@/pages/app/SalesInventoryPage";
import OrderTicketPage from "@/pages/app/OrderTicketPage";
import HelpCenterPage from "@/pages/app/HelpCenterPage";
import ScheduleConnectionPage from "@/pages/app/ScheduleConnectionPage";
import BusinessPartnerPage from "@/pages/app/BusinessPartnerPage";
import ReportsROIPage from "@/pages/app/ReportsROIPage";
// Workflows pages kept for backward compatibility - accessible via automations
import WorkflowEditPage from "@/pages/app/WorkflowEditPage";
import WorkflowRunsPage from "@/pages/app/WorkflowRunsPage";
import WorkflowRunDetailPage from "@/pages/app/WorkflowRunDetailPage";
import LeadRecoveryPage from "@/pages/app/LeadRecoveryPage";
import JobsPage from "@/pages/app/JobsPage";
import AgencyDashboardPage from "@/pages/app/AgencyDashboardPage";
import AgencyLeadFinderPage from "@/pages/app/agency/AgencyLeadFinderPage";
import AgencyClientsPage from "@/pages/app/agency/AgencyClientsPage";
import AgencySavedLeadsPage from "@/pages/app/agency/AgencySavedLeadsPage";
import AgencyCommissionsPage from "@/pages/app/agency/AgencyCommissionsPage";
import AgencyReportsPage from "@/pages/app/agency/AgencyReportsPage";
// Driver Portal Pages
import DriverLoginPage from "@/pages/driver/DriverLoginPage";
import DriverDashboard from "@/pages/driver/DriverDashboard";
import DriverJobDetail from "@/pages/driver/DriverJobDetail";
import DriverImpoundLog from "@/pages/driver/DriverImpoundLog";
import DriverVehicleSelect from "@/pages/driver/DriverVehicleSelect";

import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import AdminTenantsPage from "@/pages/admin/AdminTenantsPage";
import AdminSupportPage from "@/pages/admin/AdminSupportPage";
import AdminDemoLibraryPage from "@/pages/admin/AdminDemoLibraryPage";
import AdminGoldenPathPage from "@/pages/admin/AdminGoldenPathPage";
import AdminSetupRequestsPage from "@/pages/admin/AdminSetupRequestsPage";
import AdminAuditReportPage from "@/pages/admin/AdminAuditReportPage";
import AdminAgencyApplicationsPage from "@/pages/admin/AdminAgencyApplicationsPage";
import AdminTestOnboardingPage from "@/pages/admin/AdminTestOnboardingPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminAgenciesPage from "@/pages/admin/AdminAgenciesPage";
import AdminLeadFinderPage from "@/pages/admin/AdminLeadFinderPage";
import AdminResellerFinderPage from "@/pages/admin/AdminResellerFinderPage";
import AdminMarketingPage from "@/pages/admin/AdminMarketingPage";
import AdminGrowthEnginePage from "@/pages/admin/AdminGrowthEnginePage";
import AdminBlueprintPage from "@/pages/admin/AdminBlueprintPage";
import AdminCommissionPayoutsPage from "@/pages/admin/AdminCommissionPayoutsPage";

// Debug Pages
import TelephonyDebugPage from "@/pages/debug/TelephonyDebugPage";
import AIContextInspectorPage from "@/pages/debug/AIContextInspectorPage";
import AvailabilityDebugPage from "@/pages/debug/AvailabilityDebugPage";
import ExtractionDebugPage from "@/pages/debug/ExtractionDebugPage";
import ContextDebuggerPage from "@/pages/debug/ContextDebuggerPage";
import NotFound from "@/pages/NotFound";

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
            <Route path="/app/onboarding" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}><OnboardingPage /></Suspense>} />
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
              <Route path="/app/business-brain" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}><BusinessBrainPage /></Suspense>} />
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
          </ErrorBoundary>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
