/**
 * Customers Page Router
 * 
 * Renders the appropriate customers page based on business mode:
 * - Dispatch mode: Shows DispatchCustomersPage with account types, quick dispatch
 * - Other modes: Shows ServiceCustomersPage with traditional CRM view
 */

import { useTenantConfig } from "@/hooks/useTenantConfig";
import ServiceCustomersPage from "./ServiceCustomersPage";
import DispatchCustomersPage from "./DispatchCustomersPage";

export default function CustomersPage() {
  const { businessMode } = useTenantConfig();

  // Render dispatch-optimized page for dispatch businesses
  if (businessMode === "dispatch") {
    return <DispatchCustomersPage />;
  }

  // Default to service/general customers page
  return <ServiceCustomersPage />;
}
