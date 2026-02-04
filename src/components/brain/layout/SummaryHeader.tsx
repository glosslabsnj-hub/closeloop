/**
 * Business Brain Summary Header
 * 
 * Always-visible read-only summary showing:
 * - Business name
 * - Mode
 * - Today's hours
 * - Calendar status
 * - Service area summary
 */

import { 
  Building2, 
  Clock, 
  MapPin, 
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<BusinessMode, string> = {
  service: "Service Business",
  dispatch: "Dispatch / Delivery",
  food: "Food & Restaurant",
  medical: "Medical Practice",
  general: "General",
};

interface SummaryHeaderProps {
  className?: string;
}

export function SummaryHeader({ className }: SummaryHeaderProps) {
  const { tenant } = useAuth();
  const { businessMode, hipaaMode } = useTenantConfig();

  if (!tenant) return null;

  const t = tenant as any;
  const businessName = t.name || "Your Business";
  const hoursToday = t.hours_today || null;
  const serviceAreaSummary = t.service_area_summary || 
    (t.service_area_config_json?.base_address?.city 
      ? `${t.service_area_config_json.base_address.city}, ${t.service_area_config_json.base_address.state}`
      : null
    );
  const hasCalendar = false; // Would check calendar_connections in real impl

  return (
    <div className={cn(
      "rounded-lg border bg-card/50 p-4",
      className
    )}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Business Name */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{businessName}</span>
          <Badge variant="secondary" className="text-xs">
            {MODE_LABELS[businessMode]}
          </Badge>
          {hipaaMode && (
            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
              HIPAA
            </Badge>
          )}
        </div>

        {/* Separator */}
        <div className="hidden sm:block h-4 w-px bg-border" />

        {/* Today's Hours */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {hoursToday ? (
            <span className="text-muted-foreground">{hoursToday}</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 text-xs">Hours not set</span>
          )}
        </div>

        {/* Service Area */}
        {serviceAreaSummary && (
          <>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{serviceAreaSummary}</span>
            </div>
          </>
        )}

        {/* Calendar Status */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {hasCalendar ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Synced
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">No calendar</span>
          )}
        </div>
      </div>
    </div>
  );
}
