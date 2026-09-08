import Link from "next/link";
import { Swords, Users, Gamepad2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import GameCardGrid from "@/components/GameCardGrid";
import StatBadge from "@/components/ui/StatBadge";
import PodiumCard from "@/components/ui/PodiumCard";
import { db } from "@/lib/db";

export const revalidate = 30;

export default async function HomePage() {
  const [games, totalMembers, totalChallenges, champions] = await Promise.all([
    db.game.findMany({
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
    }),
    db.user.count(),
    db.challenge.count(),
    // #1 player per game for the homepage podium strip
    db.leaderboardEntry.findMany({
      where: { rank: 1 },
      include: { user: true, game: true },
      orderBy: { game: { name: "asc" } },
    }),
  ]);

  // Compute top-player name per game for the game cards
  const topPlayerByGame = Object.fromEntries(
    champions.map((e) => [e.gameId, e.user.username]),
  );

  return (
    <main className="relative flex min-h-screen flex-col">
      {/* Ambient glow layer — fixed behind everything */}
      <div className="bg-rift-glow pointer-events-none fixed inset-0 z-0" aria-hidden />

      <div className="relative z-10 flex flex-col px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <Navbar />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto mt-16 w-full max-w-6xl pb-4 md:mt-24">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Left — headline + CTAs */}
            <div className="flex-1">
              <HeroSection />
            </div>

            {/* Right — champion podium */}
            {champions.length > 0 && (
              <div className="w-full max-w-xs shrink-0 lg:w-72">
                <p className="rift-eyebrow mb-4">Top Champions</p>
                <div className="flex flex-col gap-3">
                  {champions.slice(0, 3).map((entry) => (
                    <PodiumCard
                      key={entry.id}
                      gameName={entry.game.name}
                      slug={entry.game.slug}
                      themeColor={entry.game.themeColor}
                      rank={entry.rank}
                      username={entry.user.username}
                      discordId={entry.user.discordId}
                      avatar={entry.user.avatar}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Stats bar                                                         */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto mt-12 w-full max-w-6xl">
          <div className="stats-bar">
            <StatBadge icon={Users} value={totalMembers} label="Members" />
            <div className="stats-divider" />
            <StatBadge icon={Gamepad2} value={games.length} label="Active Games" />
            <div className="stats-divider" />
            <StatBadge icon={Swords} value={totalChallenges} label="Challenges" />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Game cards                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="leaderboards"
          className="mx-auto mt-12 w-full max-w-6xl"
        >
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="rift-eyebrow">Leaderboards</p>
              <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
                Choose your arena
              </h2>
            </div>
            <Link
              href="/leaderboards"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all →
            </Link>
          </div>

          <GameCardGrid
            games={games.map((g) => ({
              ...g,
              topPlayer: topPlayerByGame[g.id] ?? null,
            }))}
          />
        </section>

        <section className="mx-auto mt-12 w-full max-w-6xl">
          <div className="glass-panel overflow-hidden rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="rift-eyebrow">Arcade</p>
                <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-rift-red">
                  RiftBall
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  A fast, competitive mini-game for the RIFT community. Slide, dribble, and strike your way to glory in a quick arcade showdown built for Discord and the web.
                </p>
              </div>

              <Link
                href="/riftball"
                className="btn-primary inline-flex w-fit items-center justify-center px-5 py-3 text-sm uppercase tracking-wide"
              >
                Launch RiftBall
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mx-auto w-full max-w-6xl">
          <Footer />
        </div>
      </div>
    </main>
  );
}
