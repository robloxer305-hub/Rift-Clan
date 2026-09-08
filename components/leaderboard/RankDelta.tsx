import { cn } from "@/lib/utils";

type Props = {
  current: number;
  previous?: number | null;
  className?: string;
};

export default function RankDelta({ current, previous, className }: Props) {
  // No previous rank means this is a fresh entry
  if (previous === null || previous === undefined) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-rift-red/30 bg-rift-red/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-rift-red",
          className,
        )}
      >
        <span className="live-dot" />
        NEW
      </span>
    );
  }

  const delta = previous - current; // positive = climbed

  if (delta === 0) {
    return (
      <span className={cn("font-mono text-xs text-muted-foreground", className)}>
        —
      </span>
    );
  }

  if (delta > 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-emerald-400",
          className,
        )}
      >
        ↑{delta}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-rose-400",
        className,
      )}
    >
      ↓{Math.abs(delta)}
    </span>
  );
}
