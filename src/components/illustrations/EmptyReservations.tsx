import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyReservations({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No reservations">
      {/* Clock face */}
      <circle
        cx="52"
        cy="52"
        r="28"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Clock hour hand */}
      <line
        x1="52"
        y1="52"
        x2="52"
        y2="34"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Clock minute hand */}
      <line
        x1="52"
        y1="52"
        x2="66"
        y2="46"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Clock center dot */}
      <circle
        cx="52"
        cy="52"
        r="2"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="1.5"
      />
      {/* Hour marks */}
      <line x1="52" y1="26" x2="52" y2="29" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="78" y1="52" x2="75" y2="52" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="52" y1="78" x2="52" y2="75" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="52" x2="29" y2="52" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Table line 1 */}
      <line
        x1="84"
        y1="80"
        x2="108"
        y2="80"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Table line 2 */}
      <line
        x1="88"
        y1="88"
        x2="108"
        y2="88"
        stroke="hsl(var(--muted-foreground) / 0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IllustrationBase>
  );
}
