import SmartAutomationsPage from "@/components/automations/SmartAutomationsPage";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function AutomationsPage() {
  return (
    <ErrorBoundary>
      <SmartAutomationsPage />
    </ErrorBoundary>
  );
}
