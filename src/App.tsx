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
import AIAssistantPage from "@/pages/app/AIAssistantPage";
import SettingsPage from "@/pages/app/SettingsPage";
import SimulatorPage from "@/pages/app/SimulatorPage";

// Admin Pages
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import AdminTenantsPage from "@/pages/admin/AdminTenantsPage";
import AdminSupportPage from "@/pages/admin/AdminSupportPage";

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

            {/* Onboarding (no layout) */}
            <Route path="/app/onboarding" element={<OnboardingPage />} />

            {/* App Routes */}
            <Route element={<AppLayout />}>
              <Route path="/app/dashboard" element={<DashboardPage />} />
              <Route path="/app/inbox" element={<InboxPage />} />
              <Route path="/app/leads" element={<LeadsPage />} />
              <Route path="/app/bookings" element={<BookingsPage />} />
              <Route path="/app/services" element={<ServicesPage />} />
              <Route path="/app/automations" element={<AutomationsPage />} />
              <Route path="/app/ai-assistant" element={<AIAssistantPage />} />
              <Route path="/app/simulator" element={<SimulatorPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/admin/overview" element={<AdminOverviewPage />} />
              <Route path="/admin/tenants" element={<AdminTenantsPage />} />
              <Route path="/admin/support" element={<AdminSupportPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
