import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyEstimates({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No estimates">
      {/* Document outline */}
      <path
        d="M34 20h36l16 16v60a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Page fold */}
      <path
        d="M70 20v12a4 4 0 0 0 4 4h12"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Document lines */}
      <line x1="40" y1="48" x2="72" y2="48" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="56" x2="66" y2="56" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="64" x2="70" y2="64" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Divider */}
      <line x1="40" y1="74" x2="76" y2="74" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      {/* Total line */}
      <line x1="56" y1="82" x2="76" y2="82" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Dollar sign arc */}
      <path
        d="M96 56c6-2 10 0 10 6s-10 8-10 6"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M96 68c-6 2-10 0-10-6s10-8 10-6"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dollar vertical line */}
      <line
        x1="96"
        y1="50"
        x2="96"
        y2="74"
        stroke="hsl(var(--primary) / 0.3)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IllustrationBase>
  );
}
