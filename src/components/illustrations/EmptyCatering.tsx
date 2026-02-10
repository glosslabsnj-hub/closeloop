import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyCatering({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No catering events">
      {/* Star / sparkle shape */}
      <path
        d="M52 20l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Small sparkle */}
      <path
        d="M82 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"
        stroke="hsl(var(--primary) / 0.3)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Calendar corner */}
      <rect
        x="62"
        y="62"
        width="40"
        height="40"
        rx="4"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Calendar top bar */}
      <line
        x1="62"
        y1="72"
        x2="102"
        y2="72"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Calendar hangers */}
      <line x1="72" y1="59" x2="72" y2="66" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="92" y1="59" x2="92" y2="66" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Calendar grid dots */}
      <circle cx="72" cy="80" r="1.5" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" />
      <circle cx="82" cy="80" r="1.5" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" />
      <circle cx="92" cy="80" r="1.5" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" />
      <circle cx="72" cy="90" r="1.5" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" />
      <circle cx="82" cy="90" r="1.5" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" />
    </IllustrationBase>
  );
}
