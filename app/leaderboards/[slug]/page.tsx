import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RankDelta from "@/components/leaderboard/RankDelta";
import StatusBadge from "@/components/leaderboard/StatusBadge";
import PodiumRow from "@/components/leaderboard/PodiumRow";
import { db } from "@/lib/db";
import { getGameImage } from "@/lib/gameImages";

export const revalidate = 15;

// Next.js 15 — params is now a Promise
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await db.game.findUnique({ where: { slug }, select: { name: true } });
  return {
    title: game ? `${game.name} Leaderboard` : "Leaderboard",
    description: game
      ? `Live ${game.name} rankings for RIFT CLAN members.`
      : undefined,
  };
}

export default async function GameLeaderboard({ params }: Props) {
  const { slug } = await params;

  const game = await db.game.findUnique({ where: { slug } });
  if (!game) return notFound();

  const entries = await db.leaderboardEntry.findMany({
    where: {
      gameId: game.id,
      status: { not: "INACTIVE" },
      rank: { lt: 1000 },
    },
    include: { user: true },
    orderBy: { rank: "asc" },
    take: 200,
  });

  const top3 = entries.slice(0, 3).map((e) => ({
    id: e.user.id,
    rank: e.rank,
    username: e.user.username,
    clanTag: e.user.clanTag,
    discordId: e.user.discordId,
    avatar: e.user.avatar,
    status: e.status,
  }));

  const rest = entries.slice(3);

  // CSS variable for per-game theming
  const gameColorStyle = game.themeColor
    ? ({ "--game-color": game.themeColor } as React.CSSProperties)
    : undefined;
  const gameImage = getGameImage(game.slug);

  return (
    <main className="relative min-h-screen">
      {gameImage && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(10, 10, 11, 0.76), rgba(10, 10, 11, 0.96)), url(${gameImage})` }}
          aria-hidden
        />
      )}
      {/* Ambient glow — tinted to the game's color */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: game.themeColor
            ? `radial-gradient(circle at 50% -5%, ${game.themeColor}22, transparent 50%)`
            : undefined,
        }}
        aria-hidden
      />

      <div className="relative z-10 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Navbar />

          {/* ---------------------------------------------------------------- */}
          {/* Page header                                                       */}
          {/* ---------------------------------------------------------------- */}
          <header className="mt-10 mb-8">
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <Link href="/leaderboards" className="hover:text-foreground transition-colors">
                Leaderboards
              </Link>
              <span>/</span>
              <span className="text-foreground">{game.name}</span>
            </nav>

            <div className="flex items-start justify-between gap-4">
              <div>
                {/* Accent bar driven by game color */}
                <div
                  className="mb-3 h-1 w-12 rounded-full"
                  style={{ background: game.themeColor ?? "hsl(var(--primary))" }}
                />
                <h1
                  className="font-display text-4xl font-extrabold uppercase tracking-wide"
                  style={gameColorStyle}
                >
                  {game.name}{" "}
                  <span className="text-foreground">Leaderboard</span>
                </h1>
                {game.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{game.description}</p>
                )}
              </div>

              {/* Live badge */}
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/50 bg-card/50 px-3 py-1.5">
                <span className="live-dot" />
                <span className="font-mono text-[11px] text-muted-foreground">Live</span>
              </div>
            </div>
          </header>

          {/* ---------------------------------------------------------------- */}
          {/* Empty state                                                       */}
          {/* ---------------------------------------------------------------- */}
          {entries.length === 0 && (
            <div className="glass-panel rounded-xl py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                {/* Discord logo */}
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-[#7289DA]">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.118 18.1.137 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.81 13.81 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </div>
              <p className="font-display text-lg font-bold">No players yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Rankings will appear here once the Discord bot syncs the leaderboard channel.
              </p>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Podium (top 3)                                                    */}
          {/* ---------------------------------------------------------------- */}
          {top3.length > 0 && (
            <PodiumRow
              players={top3}
              themeColor={game.themeColor}
              backgroundImage={gameImage}
            />
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Full rankings table                                               */}
          {/* ---------------------------------------------------------------- */}
          {entries.length > 0 && (
            <section>
              <div
                className="glass-panel overflow-hidden rounded-xl"
                style={
                  gameImage
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(10, 10, 11, 0.76), rgba(10, 10, 11, 0.9)), url(${gameImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="w-16 p-3 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Rank
                      </th>
                      <th className="p-3 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Player
                      </th>
                      <th className="w-20 p-3 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Change
                      </th>
                      <th className="w-28 p-3 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => {
                      // Gold / silver / bronze rank styling
                      const rankClass =
                        entry.rank === 1
                          ? "rank-badge-gold"
                          : entry.rank === 2
                            ? "rank-badge-silver"
                            : entry.rank === 3
                              ? "rank-badge-bronze"
                              : "rank-badge-default";

                      return (
                        <tr
                          key={entry.id}
                          className="border-t border-border/40 transition-colors hover:bg-secondary/30"
                        >
                          {/* Rank */}
                          <td className="p-3">
                            <span className={rankClass}>#{entry.rank}</span>
                          </td>

                          {/* Player */}
                          <td className="p-3">
                            <Link
                              href={`/members/${entry.user.id}`}
                              className="font-medium transition-colors hover:text-rift-red"
                            >
                              {entry.user.username}
                            </Link>
                            {entry.user.clanTag && (
                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                {entry.user.clanTag}
                              </span>
                            )}
                          </td>

                          {/* Rank delta */}
                          <td className="p-3">
                            <RankDelta
                              current={entry.rank}
                              previous={entry.previousRank}
                            />
                          </td>

                          {/* Status */}
                          <td className="p-3">
                            <StatusBadge status={entry.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Table footer */}
                <div className="border-t border-border/40 px-4 py-3">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {entries.length} player{entries.length !== 1 ? "s" : ""} ranked
                    {entries.length === 200 && " · showing top 200"}
                  </p>
                </div>
              </div>
            </section>
          )}

          <Footer />
        </div>
      </div>
    </main>
  );
}
