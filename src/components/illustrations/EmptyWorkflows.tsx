import { IllustrationBase } from "./IllustrationBase";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyWorkflows({ className, size }: Props) {
  return (
    <IllustrationBase className={className} size={size} label="No workflows">
      {/* Node 1 */}
      <circle
        cx="24"
        cy="60"
        r="12"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Node 1 inner dot */}
      <circle
        cx="24"
        cy="60"
        r="3"
        stroke="hsl(var(--primary) / 0.3)"
        strokeWidth="1.5"
      />
      {/* Node 2 */}
      <circle
        cx="60"
        cy="36"
        r="12"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Node 2 inner dot */}
      <circle
        cx="60"
        cy="36"
        r="3"
        stroke="hsl(var(--primary) / 0.3)"
        strokeWidth="1.5"
      />
      {/* Node 3 */}
      <circle
        cx="96"
        cy="60"
        r="12"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Node 3 inner dot */}
      <circle
        cx="96"
        cy="60"
        r="3"
        stroke="hsl(var(--primary) / 0.3)"
        strokeWidth="1.5"
      />
      {/* Arrow line 1: Node 1 -> Node 2 */}
      <path
        d="M34 54l14-10"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow head 1 */}
      <path
        d="M46 44l2 0-1-2"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow line 2: Node 2 -> Node 3 */}
      <path
        d="M72 42l12 10"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow head 2 */}
      <path
        d="M82 52l2 0-1-2"
        stroke="hsl(var(--muted-foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Decorative connection line below */}
      <path
        d="M36 68c8 12 16 16 24 16s16-4 24-16"
        stroke="hsl(var(--muted-foreground) / 0.15)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="3 3"
      />
    </IllustrationBase>
  );
}
