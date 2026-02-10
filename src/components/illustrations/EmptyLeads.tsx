import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyLeads({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No leads">
      {/* Person 1 - head */}
      <circle
        cx="36"
        cy="40"
        r="10"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Person 1 - shoulders */}
      <path
        d="M20 68a16 16 0 0 1 32 0"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Person 2 - head */}
      <circle
        cx="84"
        cy="40"
        r="10"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Person 2 - shoulders */}
      <path
        d="M68 68a16 16 0 0 1 32 0"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Person 3 - head (smaller, behind) */}
      <circle
        cx="60"
        cy="70"
        r="8"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Person 3 - shoulders */}
      <path
        d="M46 92a14 14 0 0 1 28 0"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Connecting line 1 */}
      <line
        x1="46"
        y1="42"
        x2="74"
        y2="42"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 3"
      />
      {/* Connecting line 2 */}
      <line
        x1="40"
        y1="52"
        x2="56"
        y2="66"
        stroke="hsl(var(--muted-foreground) / 0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 3"
      />
      {/* Connecting line 3 */}
      <line
        x1="80"
        y1="52"
        x2="64"
        y2="66"
        stroke="hsl(var(--muted-foreground) / 0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 3"
      />
    </IllustrationBase>
  );
}
