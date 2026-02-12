import { CalendarPlus } from "lucide-react";
import { TodayCalendarStrip } from "../widgets/TodayCalendarStrip";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { LeadRecoveryWidget } from "../LeadRecoveryWidget";

interface ServiceDashboardLayoutProps {
  quickBookLabel?: string;
}

export function ServiceDashboardLayout({ quickBookLabel }: ServiceDashboardLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <TodayCalendarStrip />
        <QuickActionButton
          label={quickBookLabel || "Quick Book"}
          description="Create a new booking"
          href="/app/bookings/new"
          icon={CalendarPlus}
        />
      </div>

      <ROIPerformanceWidget />
      <LeadRecoveryWidget />
    </div>
  );
}
