import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyBookings({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No bookings">
      {/* Calendar outer frame */}
      <rect
        x="28"
        y="32"
        width="52"
        height="52"
        rx="4"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Calendar top bar */}
      <line
        x1="28"
        y1="44"
        x2="80"
        y2="44"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Calendar hangers */}
      <line x1="42" y1="28" x2="42" y2="36" stroke="hsl(var(--primary) / 0.35)" strokeWidth="2" strokeLinecap="round" />
      <line x1="66" y1="28" x2="66" y2="36" stroke="hsl(var(--primary) / 0.35)" strokeWidth="2" strokeLinecap="round" />
      {/* Grid row 1 */}
      <rect x="34" y="50" width="10" height="8" rx="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="49" y="50" width="10" height="8" rx="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="64" y="50" width="10" height="8" rx="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Grid row 2 */}
      <rect x="34" y="63" width="10" height="8" rx="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="49" y="63" width="10" height="8" rx="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="64" y="63" width="10" height="8" rx="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Grid row 3 */}
      <rect x="34" y="76" width="10" height="4" rx="1.5" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="49" y="76" width="10" height="4" rx="1.5" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Clock fragment */}
      <path
        d="M92 28a12 12 0 0 1-12 12"
        stroke="hsl(var(--primary) / 0.3)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="92" y1="28" x2="92" y2="22" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="92" y1="28" x2="97" y2="30" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.5" strokeLinecap="round" />
    </IllustrationBase>
  );
}
