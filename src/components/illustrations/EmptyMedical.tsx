import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyMedical({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No medical intakes">
      {/* Shield outline */}
      <path
        d="M60 18l28 10v24c0 18-12 30-28 38-16-8-28-20-28-38V28z"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cross inside shield */}
      <line
        x1="60"
        y1="42"
        x2="60"
        y2="62"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="52"
        x2="70"
        y2="52"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Clipboard corner */}
      <rect
        x="78"
        y="72"
        width="28"
        height="36"
        rx="3"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Clipboard clip */}
      <rect
        x="86"
        y="68"
        width="12"
        height="8"
        rx="2"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Clipboard lines */}
      <line x1="84" y1="84" x2="100" y2="84" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="84" y1="90" x2="96" y2="90" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="84" y1="96" x2="98" y2="96" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" />
    </IllustrationBase>
  );
}
