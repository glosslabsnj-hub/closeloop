import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AllClear({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="All clear">
      {/* Large checkmark */}
      <path
        d="M36 62l16 16 32-36"
        stroke="hsl(var(--primary) / 0.45)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Radiating arc 1 - top right */}
      <path
        d="M78 28c4-2 8-2 12 0"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Radiating arc 2 - right */}
      <path
        d="M92 48c2-4 2-8 0-12"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Radiating arc 3 - top */}
      <path
        d="M54 24c2-4 6-6 10-6"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Small sparkle top-right */}
      <line x1="98" y1="26" x2="98" y2="20" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="95" y1="23" x2="101" y2="23" stroke="hsl(var(--muted-foreground) / 0.18)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Small sparkle bottom-left */}
      <line x1="22" y1="82" x2="22" y2="76" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="79" x2="25" y2="79" stroke="hsl(var(--muted-foreground) / 0.15)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Decorative circle fragment */}
      <path
        d="M30 92a52 52 0 0 0 60-36"
        stroke="hsl(var(--muted-foreground) / 0.12)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 6"
      />
    </IllustrationBase>
  );
}
