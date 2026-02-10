import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { TodayCalendarStrip } from "../widgets/TodayCalendarStrip";
import { PatientIntakeQueue } from "../widgets/PatientIntakeQueue";
import { MetricsGrid } from "../MetricsGrid";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";

export function MedicalDashboardLayout() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 bg-amber-500/5">
          <Shield className="h-3 w-3" />
          HIPAA Compliant
        </Badge>
      </div>

      <TodayCalendarStrip />

      <div className="grid gap-6 lg:grid-cols-2">
        <PatientIntakeQueue />
        <MetricsGrid />
      </div>

      <ROIPerformanceWidget />
    </div>
  );
}
