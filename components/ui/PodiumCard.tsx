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

  return (
    <div
      className={cn("glass-panel flex items-center gap-4 rounded-xl p-4", className)}
      style={{
        borderColor: themeColor ? `${themeColor}33` : undefined,
        boxShadow: themeColor ? `0 0 20px -8px ${themeColor}55` : undefined,
      }}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={username}
          width={44}
          height={44}
          className="rounded-full ring-1"
          style={{ "--tw-ring-color": themeColor ?? undefined } as React.CSSProperties}
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold"
          style={{ background: `${themeColor ?? "#e31c3d"}22`, color: themeColor ?? "#e31c3d" }}
        >
          {username[0]?.toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-bold">{username}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{gameName} · #{rank}</p>
      </div>

      {/* Crown */}
      <span className="ml-auto text-lg text-amber-400">♛</span>
    </div>
  );
}
