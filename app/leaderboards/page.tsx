import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GameCard from "@/components/GameCard";
import { db } from "@/lib/db";

export const revalidate = 30;

export const metadata = {
  title: "Leaderboards",
  description: "Browse live competitive leaderboards across all RIFT CLAN games.",
};

export default async function LeaderboardsIndex() {
  const games = await db.game.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          leaderboardEntries: {
            where: { status: { not: "INACTIVE" } },
          },
        },
      },
    },
  });

  // Top player per game for the card
  const topEntries = await db.leaderboardEntry.findMany({
    where: { rank: 1 },
    include: { user: true },
  });
  const topPlayerByGame = Object.fromEntries(
    topEntries.map((e) => [e.gameId, e.user.username]),
  );

  return (
    <main className="relative min-h-screen">
      <div className="bg-rift-glow pointer-events-none fixed inset-0 z-0" aria-hidden />

      <div className="relative z-10 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Navbar />

          {/* Header */}
          <header className="mt-12 mb-8">
            <p className="rift-eyebrow text-rift-red">
              <span className="live-dot mr-2" />
              Live Rankings
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold uppercase tracking-wide">
              Leaderboards
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Select a game to view live rankings, rank history, and active challenges.
            </p>
          </header>

          {/* Game grid */}
          {games.length > 0 ? (
            <div className="game-grid">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  title={game.name}
                  slug={game.slug}
                  description={game.description ?? ""}
                  players={game._count.leaderboardEntries}
                  themeColor={game.themeColor}
                  topPlayer={topPlayerByGame[game.id] ?? null}
                />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-xl py-20 text-center">
              <p className="font-display text-xl text-muted-foreground">No games found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Run{" "}
                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">
                  npm run db:seed
                </code>{" "}
                to seed the five RIFT games.
              </p>
            </div>
          )}

          <Footer />
        </div>
      </div>
    </main>
  );
}
