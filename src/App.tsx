import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Layouts
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { AppLayout } from "@/components/layouts/AppLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";

// Public Pages
import LandingPage from "@/pages/public/LandingPage";
import PricingPage from "@/pages/public/PricingPage";
import LoginPage from "@/pages/public/LoginPage";
import SignupPage from "@/pages/public/SignupPage";

// App Pages
import OnboardingPage from "@/pages/app/OnboardingPage";
import DashboardPage from "@/pages/app/DashboardPage";
import InboxPage from "@/pages/app/InboxPage";
import LeadsPage from "@/pages/app/LeadsPage";
import BookingsPage from "@/pages/app/BookingsPage";
import ServicesPage from "@/pages/app/ServicesPage";
import AutomationsPage from "@/pages/app/AutomationsPage";
import IntegrationsPage from "@/pages/app/IntegrationsPage";
import AIAssistantPage from "@/pages/app/AIAssistantPage";
import SettingsPage from "@/pages/app/SettingsPage";
import SimulatorPage from "@/pages/app/SimulatorPage";
import GoLivePage from "@/pages/app/GoLivePage";
import CallsPage from "@/pages/app/CallsPage";
import BusinessBrainPage from "@/pages/app/BusinessBrainPage";
import UsagePage from "@/pages/app/UsagePage";

// Module-specific pages
import OrdersPage from "@/pages/app/OrdersPage";
import ReservationsPage from "@/pages/app/ReservationsPage";
import CateringPage from "@/pages/app/CateringPage";
import MenuCenterPage from "@/pages/app/MenuCenterPage";
import DispatchPage from "@/pages/app/DispatchPage";
import MedicalIntakePage from "@/pages/app/MedicalIntakePage";
import OrderTicketPage from "@/pages/app/OrderTicketPage";
import HelpCenterPage from "@/pages/app/HelpCenterPage";
// Workflows pages kept for backward compatibility - accessible via automations
import WorkflowEditPage from "@/pages/app/WorkflowEditPage";
import WorkflowRunsPage from "@/pages/app/WorkflowRunsPage";
import WorkflowRunDetailPage from "@/pages/app/WorkflowRunDetailPage";

// Admin Pages
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import AdminTenantsPage from "@/pages/admin/AdminTenantsPage";
import AdminSupportPage from "@/pages/admin/AdminSupportPage";
import AdminDemoLibraryPage from "@/pages/admin/AdminDemoLibraryPage";
import AdminGoldenPathPage from "@/pages/admin/AdminGoldenPathPage";
import AdminSetupRequestsPage from "@/pages/admin/AdminSetupRequestsPage";
import AdminAuditReportPage from "@/pages/admin/AdminAuditReportPage";

// Debug Pages
import TelephonyDebugPage from "@/pages/debug/TelephonyDebugPage";
import AIContextInspectorPage from "@/pages/debug/AIContextInspectorPage";
import AvailabilityDebugPage from "@/pages/debug/AvailabilityDebugPage";
import ExtractionDebugPage from "@/pages/debug/ExtractionDebugPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Onboarding and Go-Live (no layout) */}
            <Route path="/app/onboarding" element={<OnboardingPage />} />
            <Route path="/app/go-live" element={<GoLivePage />} />

            {/* App Routes */}
            <Route element={<AppLayout />}>
              <Route path="/app/dashboard" element={<DashboardPage />} />
              <Route path="/app/inbox" element={<InboxPage />} />
              <Route path="/app/calls" element={<CallsPage />} />
              <Route path="/app/leads" element={<LeadsPage />} />
              <Route path="/app/bookings" element={<BookingsPage />} />
              <Route path="/app/services" element={<ServicesPage />} />
              <Route path="/app/automations" element={<AutomationsPage />} />
              <Route path="/app/integrations" element={<IntegrationsPage />} />
              <Route path="/app/ai-assistant" element={<AIAssistantPage />} />
              <Route path="/app/simulator" element={<SimulatorPage />} />
              <Route path="/app/business-brain" element={<BusinessBrainPage />} />
              <Route path="/app/usage" element={<UsagePage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              {/* Module-specific routes */}
              <Route path="/app/orders" element={<OrdersPage />} />
              <Route path="/app/reservations" element={<ReservationsPage />} />
              <Route path="/app/catering" element={<CateringPage />} />
              <Route path="/app/menu-center" element={<MenuCenterPage />} />
              <Route path="/app/dispatch" element={<DispatchPage />} />
              <Route path="/app/medical-intake" element={<MedicalIntakePage />} />
              <Route path="/app/orders/:orderId/ticket" element={<OrderTicketPage />} />
              <Route path="/app/help" element={<HelpCenterPage />} />
              {/* Legacy workflow routes redirect to automations or keep for editing */}
              <Route path="/app/workflows" element={<AutomationsPage />} />
              <Route path="/app/workflows/new" element={<WorkflowEditPage />} />
              <Route path="/app/workflows/:id" element={<WorkflowEditPage />} />
              <Route path="/app/workflows/:id/runs" element={<WorkflowRunsPage />} />
              <Route path="/app/workflows/:id/runs/:runId" element={<WorkflowRunDetailPage />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/admin/overview" element={<AdminOverviewPage />} />
              <Route path="/admin/tenants" element={<AdminTenantsPage />} />
              <Route path="/admin/support" element={<AdminSupportPage />} />
              <Route path="/admin/demo-library" element={<AdminDemoLibraryPage />} />
              <Route path="/admin/golden-path" element={<AdminGoldenPathPage />} />
              <Route path="/admin/setup-requests" element={<AdminSetupRequestsPage />} />
              <Route path="/admin/audit-report" element={<AdminAuditReportPage />} />
            </Route>

            {/* Debug Routes (dev/admin only) */}
            <Route path="/debug/telephony" element={<TelephonyDebugPage />} />
            <Route path="/debug/ai-context" element={<AIContextInspectorPage />} />
            <Route path="/debug/availability" element={<AvailabilityDebugPage />} />
            <Route path="/debug/extraction" element={<ExtractionDebugPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
