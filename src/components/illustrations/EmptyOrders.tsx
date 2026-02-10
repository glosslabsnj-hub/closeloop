import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyOrders({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No orders">
      {/* Receipt outline with wavy bottom */}
      <path
        d="M36 24h48v64l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4V24z"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Receipt lines */}
      <line x1="46" y1="40" x2="74" y2="40" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="48" x2="70" y2="48" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="56" x2="66" y2="56" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Divider line */}
      <line x1="44" y1="64" x2="76" y2="64" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      {/* Total line */}
      <line x1="46" y1="72" x2="60" y2="72" stroke="hsl(var(--primary) / 0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="66" y1="72" x2="74" y2="72" stroke="hsl(var(--primary) / 0.35)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Flow line curving away */}
      <path
        d="M28 60c-6 0-10 4-10 10s4 10 10 10"
        stroke="hsl(var(--muted-foreground) / 0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IllustrationBase>
  );
}
