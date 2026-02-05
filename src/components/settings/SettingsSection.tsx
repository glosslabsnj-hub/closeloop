import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  id?: string;
}

/**
 * Legacy SettingsSection - wrapper without Card styling
 * @deprecated Use SettingsCard instead for consistent styling
 */
export function SettingsSection({ title, description, children, id }: SettingsSectionProps) {
  return (
    <div className="space-y-6" id={id}>
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

/**
 * SettingsCard - Consistent settings section with Card styling
 * 
 * Features:
 * - Consistent header with title and description
 * - Optional footer with save button
 * - Loading/dirty state handling
 */
interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  onSave?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  saveLabel?: string;
  className?: string;
  headerAction?: ReactNode;
}

export function SettingsCard({
  title,
  description,
  children,
  onSave,
  isSaving = false,
  isDirty = true,
  saveLabel = "Save Changes",
  className,
  headerAction,
}: SettingsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      {onSave && (
        <CardFooter className="border-t bg-muted/30 flex justify-end py-4">
          <Button onClick={onSave} disabled={isSaving || !isDirty}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saveLabel}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
