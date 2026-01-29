import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Settings, LayoutDashboard } from "lucide-react";

interface ModuleUnavailablePageProps {
  title?: string;
  description?: string;
  moduleName?: string;
  showSettingsButton?: boolean;
}

/**
 * Reusable "Not available on your plan" component for module-gated routes.
 * Use this when a user navigates directly to a URL for a module they don't have enabled.
 */
export function ModuleUnavailablePage({
  title = "Feature Not Available",
  description = "This feature requires a module that isn't enabled for your account.",
  moduleName,
  showSettingsButton = true,
}: ModuleUnavailablePageProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center shadow-soft-lg">
        <CardHeader className="pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">
            {description}
            {moduleName && (
              <span className="block mt-2 text-sm">
                Required module: <strong>{moduleName}</strong>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {showSettingsButton && (
            <Button 
              onClick={() => navigate("/app/settings")} 
              className="w-full" 
              size="lg"
            >
              <Settings className="mr-2 h-4 w-4" />
              Manage Modules
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => navigate("/app/dashboard")}
            className="w-full"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
