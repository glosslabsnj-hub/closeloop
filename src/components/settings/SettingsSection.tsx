import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
