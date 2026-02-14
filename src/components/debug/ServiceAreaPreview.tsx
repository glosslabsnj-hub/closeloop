import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { useServiceArea, getServiceAreaSummary } from "@/hooks/useServiceArea";

export function ServiceAreaPreview() {
  const { serviceArea, isLoading } = useServiceArea();

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading service area...</p>
    );
  }

  const summary = getServiceAreaSummary(serviceArea);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <MapPin className="h-4 w-4 shrink-0" />
      <span>{summary}</span>
      <Badge variant="secondary" className="text-xs capitalize">
        {serviceArea.mode}
      </Badge>
    </div>
  );
}
