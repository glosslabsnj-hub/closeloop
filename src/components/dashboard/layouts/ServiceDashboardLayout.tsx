import { CalendarPlus } from "lucide-react";
import { TodayCalendarStrip } from "../widgets/TodayCalendarStrip";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { MetricsGrid } from "../MetricsGrid";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { LeadRecoveryWidget } from "../LeadRecoveryWidget";

export function ServiceDashboardLayout() {
  return (
    <div className="space-y-6">
      <TodayCalendarStrip />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <QuickActionButton
            label="Quick Book"
            description="Create a new booking"
            href="/app/bookings/new"
            icon={CalendarPlus}
          />
        </div>
        <div className="lg:col-span-3">
          <MetricsGrid />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ROIPerformanceWidget />
        <LeadRecoveryWidget />
      </div>
    </div>
  );
}
