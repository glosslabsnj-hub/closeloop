import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyDispatch({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No dispatch jobs">
      {/* Route line curving between two pins */}
      <path
        d="M32 82c0-20 16-24 28-36s28-8 28-24"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 4"
      />
      {/* Pin marker A */}
      <path
        d="M32 92c0 0-10-8-10-16a10 10 0 1 1 20 0c0 8-10 16-10 16z"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="32"
        cy="76"
        r="3"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="1.5"
      />
      {/* Pin marker B */}
      <path
        d="M88 32c0 0-10-8-10-16a10 10 0 1 1 20 0c0 8-10 16-10 16z"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="88"
        cy="16"
        r="3"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="1.5"
      />
      {/* Decorative dots along route */}
      <circle cx="46" cy="64" r="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" />
      <circle cx="60" cy="48" r="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" />
      <circle cx="74" cy="36" r="1.5" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="1.5" />
    </IllustrationBase>
  );
}
