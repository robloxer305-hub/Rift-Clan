import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  value: number | string;
  label: string;
  className?: string;
};

export default function StatBadge({ icon: Icon, value, label, className }: Props) {
  return (
    <div className={cn("flex items-center gap-4 py-1", className)}>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rift-red/10 ring-1 ring-rift-red/25"
        style={{ boxShadow: "0 0 16px -4px rgba(227,28,61,0.3)" }}
      >
        <Icon className="h-5 w-5 text-rift-red" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-display text-2xl font-extrabold leading-none text-foreground tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}
