import { type EntryStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const config: Record<
  EntryStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  DEFENDING: {
    label: "Defending",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  NEW: {
    label: "New",
    className:
      "border-rift-red/20 bg-rift-red/10 text-rift-red",
  },
  INACTIVE: {
    label: "Inactive",
    className:
      "border-zinc-600/30 bg-zinc-800/40 text-zinc-500",
  },
};

type Props = { status: EntryStatus; className?: string };

export default function StatusBadge({ status, className }: Props) {
  const { label, className: colorClass } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
        colorClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
