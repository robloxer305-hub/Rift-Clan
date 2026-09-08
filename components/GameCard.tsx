import Link from "next/link";
import { cn } from "@/lib/utils";
import { getGameImage } from "@/lib/gameImages";

type Props = {
  title: string;
  slug: string;
  players?: number;
  description?: string;
  themeColor?: string | null;
  topPlayer?: string | null;
  className?: string;
};

export default function GameCard({
  title,
  slug,
  players = 0,
  description,
  themeColor,
  topPlayer,
  className,
}: Props) {
  const gameImage = getGameImage(slug);

  return (
    <article
      style={
        themeColor
          ? ({ "--game-color": themeColor } as React.CSSProperties)
          : undefined
      }
      className={cn("game-card group relative flex h-full flex-col", className)}
    >
      {gameImage && (
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-35 transition-opacity duration-200 group-hover:opacity-50"
          style={{ backgroundImage: `linear-gradient(135deg, rgba(10, 10, 11, 0.94), rgba(10, 10, 11, 0.38)), url(${gameImage})` }}
          aria-hidden
        />
      )}

      {/* Per-game accent line */}
      <div
        className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg opacity-80 transition-opacity group-hover:opacity-100"
        style={{ background: themeColor ?? "hsl(var(--rift-red))" }}
      />

      <div className="relative z-10 flex h-full flex-col pl-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-h-[3.25rem] flex-1 font-display text-lg font-bold uppercase tracking-wide leading-tight">
            {title}
          </h3>
          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {players} {players === 1 ? "player" : "players"}
          </span>
        </div>

        {description && (
          <p className="mt-1.5 min-h-[2.8rem] text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {topPlayer && (
          <p className="mt-2 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <span className="text-amber-400">♛</span>
            <span className="truncate">{topPlayer}</span>
          </p>
        )}

        {/* Footer row */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <Link
            href={`/leaderboards/${slug}`}
            id={`game-card-${slug}`}
            className="text-xs font-semibold transition-colors"
            style={{ color: themeColor ?? "hsl(var(--rift-red))" }}
          >
            View leaderboard →
          </Link>

          {/* Live pulse */}
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span className="live-dot" />
            Live
          </span>
        </div>
      </div>
    </article>
  );
}
