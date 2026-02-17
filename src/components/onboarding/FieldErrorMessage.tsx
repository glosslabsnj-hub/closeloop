import { AlertCircle } from "lucide-react";

interface FieldErrorMessageProps {
  message?: string;
}

export function FieldErrorMessage({ message }: FieldErrorMessageProps) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-destructive mt-1" role="alert">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}
