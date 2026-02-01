import { Link } from "react-router-dom";
import { useServices } from "@/hooks/useServices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Brain, DollarSign, Clock, Briefcase, Loader2 } from "lucide-react";

/**
 * ServicesPage - Read-only view with CTA to Business Brain
 *
 * Service management has moved to Business Brain for centralized control.
 * This page now shows a read-only list with a redirect to edit in Brain.
 */
export default function ServicesPage() {
  const { services, isLoading } = useServices();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const formatPrice = (service: any) => {
    if (service.price_type === "quote_only") return "Quote Required";
    if (!service.price_amount) return "Not Set";
    const prefix = service.price_type === "starting_at" ? "From " : "";
    return `${prefix}$${service.price_amount}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading services...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">
            View your services catalog
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/app/business-brain">
            <Brain className="mr-2 h-4 w-4" />
            Edit in Business Brain
          </Link>
        </Button>
      </div>

      {/* Migration Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Service Management Has Moved
          </CardTitle>
          <CardDescription>
            All service editing now happens in Business Brain for centralized control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Add, edit, and delete services</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Configure pricing rules and estimates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Manage service details in one place</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List (Read-Only) */}
      {services && services.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    {service.description && (
                      <CardDescription className="mt-1">{service.description}</CardDescription>
                    )}
                  </div>
                  {!service.is_active && (
                    <Badge variant="outline" className="ml-2">
                      Inactive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatPrice(service)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(service.duration_minutes)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Briefcase}
              title="No services yet"
              description="Go to Business Brain to add your first service."
              action={{
                label: "Go to Business Brain",
                onClick: () => window.location.href = "/app/business-brain",
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
