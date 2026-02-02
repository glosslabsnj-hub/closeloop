import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  id?: string;
}

export function SettingsSection({ title, description, children, id }: SettingsSectionProps) {
  return (
    <div className="page-section" id={id}>
      <div className="border-b border-border pb-4 mb-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="content-stack">{children}</div>
    </div>
  );
}
