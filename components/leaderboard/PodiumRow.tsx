import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Player = {
  id: string;
  rank: number;
  username: string;
  clanTag?: string | null;
  discordId: string;
  avatar?: string | null;
  status: string;
};

type Props = {
  players: Player[];
  themeColor?: string | null;
  backgroundImage?: string;
};

const podiumMeta = [
  {
    rank: 1,
    label: "Champion",
    crown: "♛",
    ringClass: "ring-amber-400/60",
    crownClass: "text-amber-400",
    heightClass: "h-20",
    glowColor: "rgba(251,191,36,0.25)",
  },
  {
    rank: 2,
    label: "Runner-up",
    crown: "♜",
    ringClass: "ring-zinc-400/50",
    crownClass: "text-zinc-400",
    heightClass: "h-14",
    glowColor: "rgba(161,161,170,0.15)",
  },
  {
    rank: 3,
    label: "Third Place",
    crown: "♞",
    ringClass: "ring-amber-700/50",
    crownClass: "text-amber-700",
    heightClass: "h-10",
    glowColor: "rgba(180,83,9,0.15)",
  },
];

// Reorder so rank 2 | 1 | 3 (classic podium shape)
const displayOrder = [1, 0, 2] as const;

export default function PodiumRow({ players, themeColor, backgroundImage }: Props) {
  if (players.length === 0) return null;

  const ordered = displayOrder.map((i) => players[i]).filter(Boolean);

  return (
    <div className="mb-8 flex items-end justify-center gap-4">
      {ordered.map((player) => {
        if (!player) return null;
        const meta = podiumMeta.find((m) => m.rank === player.rank)!;
        const avatarUrl = player.avatar
          ? `https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.webp?size=128`
          : null;

        return (
          <div
            key={player.rank}
            className={cn(
              "glass-panel flex flex-col items-center gap-2 rounded-xl px-5 pb-4",
              meta.heightClass === "h-20" ? "pt-5" : "pt-4",
            )}
            style={{
              backgroundImage: backgroundImage
                ? `linear-gradient(180deg, rgba(10, 10, 11, 0.72), rgba(10, 10, 11, 0.92)), url(${backgroundImage})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: `0 0 32px -8px ${meta.glowColor}`,
            }}
          >
            {/* Crown */}
            <span className={cn("text-xl leading-none", meta.crownClass)}>
              {meta.crown}
            </span>

            {/* Avatar */}
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={player.username}
                width={48}
                height={48}
                className={cn(
                  "rounded-full ring-2",
                  meta.ringClass,
                )}
              />
            ) : (
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-bold ring-2",
                  meta.ringClass,
                )}
              >
                {player.username[0]?.toUpperCase()}
              </div>
            )}

            {/* Name */}
            <div className="text-center">
              <Link
                href={`/members/${player.id}`}
                className="font-display text-sm font-bold leading-tight hover:text-rift-red transition-colors"
              >
                {player.username}
                {player.clanTag && (
                  <span className="ml-1 text-muted-foreground text-xs">
                    {player.clanTag}
                  </span>
                )}
              </Link>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {meta.label}
              </p>
            </div>

            {/* Rank badge */}
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold"
              style={{
                background: themeColor ? `${themeColor}22` : undefined,
                color: themeColor ?? "hsl(var(--foreground))",
                boxShadow: themeColor ? `0 0 10px ${themeColor}44` : undefined,
              }}
            >
              #{player.rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}
