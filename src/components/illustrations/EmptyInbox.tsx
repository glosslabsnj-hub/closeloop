import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyInbox({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No inbox items">
      {/* Phone handset */}
      <path
        d="M38 72c-4-4-6-10-6-16 0-2 1-4 3-5l5-3c2-1 4-0.5 5 1.5l3 6c1 2 0.5 4-1 5l-2 2c1 4 4 7 7 10 3 3 6 6 10 7l2-2c1-1.5 3-2 5-1l6 3c2 1 2.5 3 1.5 5l-3 5c-1 2-3 3-5 3-6 0-12-2-16-6z"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signal arc 1 */}
      <path
        d="M72 38c4-4 7-3 10 0"
        stroke="hsl(var(--primary) / 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signal arc 2 */}
      <path
        d="M68 30c7-5 14-5 20 0"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signal arc 3 */}
      <path
        d="M64 22c10-6 21-6 30 0"
        stroke="hsl(var(--muted-foreground) / 0.15)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IllustrationBase>
  );
}
