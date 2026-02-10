import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyGeneric({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No items found">
      {/* Magnifying glass circle */}
      <circle
        cx="50"
        cy="50"
        r="22"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Magnifying glass handle */}
      <line
        x1="66"
        y1="66"
        x2="82"
        y2="82"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Small horizontal line inside glass */}
      <line
        x1="40"
        y1="46"
        x2="56"
        y2="46"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="42"
        y1="53"
        x2="54"
        y2="53"
        stroke="hsl(var(--muted-foreground) / 0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Empty box outline */}
      <rect
        x="82"
        y="22"
        width="22"
        height="22"
        rx="3"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Box diagonal (empty indicator) */}
      <line
        x1="87"
        y1="28"
        x2="99"
        y2="38"
        stroke="hsl(var(--muted-foreground) / 0.15)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Decorative dots */}
      <circle cx="22" cy="80" r="2" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" />
      <circle cx="14" cy="70" r="1.5" stroke="hsl(var(--muted-foreground) / 0.12)" strokeWidth="1.5" />
      <circle cx="28" cy="90" r="1.5" stroke="hsl(var(--muted-foreground) / 0.12)" strokeWidth="1.5" />
    </IllustrationBase>
  );
}
