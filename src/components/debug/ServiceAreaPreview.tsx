import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle } from "lucide-react";
import { useServiceArea, getServiceAreaSummary } from "@/hooks/useServiceArea";

export function ServiceAreaPreview() {
  const { serviceArea, isLoading } = useServiceArea();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading service area...</p>
        </CardContent>
      </Card>
    );
  }

  const summary = getServiceAreaSummary(serviceArea);
  const hasBaseAddress = serviceArea.base_address.city || serviceArea.base_address.state;
  const hasConfiguration = 
    serviceArea.radius_miles || 
    serviceArea.include.zips.length > 0 || 
    serviceArea.include.counties.length > 0;

  // Generate AI-friendly summary
  const getAISummary = (): string => {
    const { mode, radius_miles, base_address, include } = serviceArea;

    if (mode === "radius" && radius_miles && base_address.city) {
      return `We typically serve within ${radius_miles} miles of ${base_address.city}${base_address.state ? `, ${base_address.state}` : ""}.`;
    }

    if (mode === "zips" && include.zips.length > 0) {
      if (include.zips.length <= 5) {
        return `We serve these ZIP codes: ${include.zips.join(", ")}.`;
      }
      return `We serve ${include.zips.length} ZIP code areas.`;
    }

    if (mode === "counties" && include.counties.length > 0) {
      const countyList = include.counties.slice(0, 3).map(c => `${c.name}, ${c.state}`).join("; ");
      if (include.counties.length > 3) {
        return `We serve ${include.counties.length} counties including ${countyList}, and more.`;
      }
      return `We serve: ${countyList}.`;
    }

    if (mode === "hybrid") {
      const parts: string[] = [];
      if (radius_miles && base_address.city) {
        parts.push(`${radius_miles} miles of ${base_address.city}`);
      }
      if (include.zips.length > 0) {
        parts.push(`${include.zips.length} ZIP codes`);
      }
      if (include.counties.length > 0) {
        parts.push(`${include.counties.length} counties`);
      }
      if (parts.length > 0) {
        return `We serve multiple areas: ${parts.join(", ")}.`;
      }
    }

    return "";
  };

  const aiSummary = getAISummary();

  return (
    <Card className={!hasConfiguration ? "border-amber-500/30 bg-amber-500/5" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Service Area Summary
          <Badge variant="secondary" className="text-xs capitalize">
            {serviceArea.mode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Technical summary */}
        <p className="text-sm text-muted-foreground">{summary}</p>

        {/* AI Preview */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">
            What the AI will say:
          </p>
          {aiSummary ? (
            <p className="text-sm italic">"{aiSummary}"</p>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Not set — the AI may need to ask where you're located.
              </span>
            </div>
          )}
        </div>

        {/* Base address display if set */}
        {hasBaseAddress && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Base:</span>{" "}
            {[
              serviceArea.base_address.line1,
              serviceArea.base_address.city,
              serviceArea.base_address.state,
              serviceArea.base_address.zip,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
