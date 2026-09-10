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
  const accent = themeColor ?? "#E31C3D";

  return (
    <article
      style={
        {
          "--game-color": accent,
          "--game-glow": `${accent}55`,
        } as React.CSSProperties
      }
      className={cn(
        "game-card group relative flex h-full flex-col overflow-hidden",
        "hover:shadow-[0_8px_40px_-8px_var(--game-glow)]",
        "hover:border-[var(--game-color)]/40",
        className
      )}
    >
      {/* Background image — fades in brighter on hover */}
      {gameImage && (
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-300 group-hover:opacity-70"
          style={{
            backgroundImage: `url(${gameImage})`,
            opacity: 0.22,
          }}
          aria-hidden
        />
      )}

      {/* Dark gradient overlay — always present, strengthens content legibility */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: `linear-gradient(160deg, rgba(10,10,11,0.82) 0%, rgba(10,10,11,0.55) 50%, rgba(10,10,11,0.88) 100%)`,
        }}
        aria-hidden
      />

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-24"
        style={{
          background: `linear-gradient(to top, rgba(10,10,11,0.95), transparent)`,
        }}
        aria-hidden
      />

      {/* Per-game accent line */}
      <div
        className="absolute left-0 top-0 z-[3] h-full w-[3px] rounded-l-lg opacity-80 transition-all duration-200 group-hover:opacity-100 group-hover:w-[4px]"
        style={{ background: `linear-gradient(180deg, ${accent}, ${accent}40)` }}
      />

      <div className="relative z-[4] flex h-full flex-col pl-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-h-[3.25rem] flex-1 font-display text-lg font-bold uppercase tracking-wide leading-tight">
            {title}
          </h3>
          <span
            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              background: `${accent}18`,
              color: accent,
              border: `1px solid ${accent}30`,
            }}
          >
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
            <span style={{ color: "#F59E0B" }}>♛</span>
            <span className="truncate">{topPlayer}</span>
          </p>
        )}

        {/* Footer row */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <Link
            href={`/leaderboards/${slug}`}
            id={`game-card-${slug}`}
            className="group/link flex items-center gap-1 text-xs font-semibold transition-all"
            style={{ color: accent }}
          >
            View leaderboard
            <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
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
