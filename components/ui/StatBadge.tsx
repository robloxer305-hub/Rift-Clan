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
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rift-red/10 ring-1 ring-rift-red/20">
        <Icon className="h-4 w-4 text-rift-red" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-display text-xl font-bold leading-none text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}
