import Image from "next/image";
import { cn } from "@/lib/utils";

/** A single game-champion card for the homepage podium strip. */
type Props = {
  gameName: string;
  slug: string;
  themeColor: string | null;
  rank: number;
  username: string;
  discordId: string;
  avatar: string | null;
  className?: string;
};

const MEDAL: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "♛", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  2: { label: "♛", color: "#A1A1AA", bg: "rgba(161,161,170,0.10)" },
  3: { label: "♛", color: "#92400E", bg: "rgba(146,64,14,0.12)" },
};

export default function PodiumCard({
  gameName,
  slug,
  themeColor,
  rank,
  username,
  discordId,
  avatar,
  className,
}: Props) {
  const avatarUrl = avatar
    ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=128`
    : null;

  const medal = MEDAL[rank];
  const accentColor = themeColor ?? "#e31c3d";

  return (
    <div
      className={cn(
        "glass-panel group relative flex items-center gap-3 overflow-hidden rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5",
        className
      )}
      style={{
        borderColor: `${accentColor}30`,
        boxShadow: `0 0 24px -10px ${accentColor}50`,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl opacity-80 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(180deg, ${accentColor}, transparent)` }}
      />

      {/* Avatar */}
      <div className="relative ml-2 shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={username}
            width={40}
            height={40}
            className="rounded-full ring-2"
            style={{ "--tw-ring-color": `${accentColor}60` } as React.CSSProperties}
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-base font-bold"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            {username[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold leading-tight">{username}</p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {gameName}
          <span className="mx-1.5 opacity-40">·</span>
          <span style={{ color: accentColor }}>#{rank}</span>
        </p>
      </div>

      {/* Medal */}
      {medal && (
        <span
          className="ml-auto shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-sm"
          style={{ color: medal.color, background: medal.bg }}
          title={`Rank #${rank}`}
        >
          {medal.label}
        </span>
      )}
    </div>
  );
}
