import Link from "next/link";
import { Swords, Users, Gamepad2, Trophy } from "lucide-react";
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

      {/* Decorative grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(242,242,244,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(242,242,244,1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <Navbar />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto mt-16 w-full max-w-6xl pb-4 md:mt-28">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
            {/* Left — headline + CTAs */}
            <div className="flex-1">
              <HeroSection />
            </div>

            {/* Right — champion podium */}
            {champions.length > 0 && (
              <div className="w-full shrink-0 lg:w-80">
                <div className="mb-4 flex items-center justify-between">
                  <p className="rift-eyebrow">Top Champions</p>
                  <span className="font-mono text-[10px] text-muted-foreground/50">Rank #1 per game</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {champions.slice(0, 5).map((entry) => (
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
        <section className="mx-auto mt-16 w-full max-w-6xl">
          <div className="stats-bar relative overflow-hidden">
            {/* Subtle red glow behind stat bar */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                background: "radial-gradient(ellipse at 50% 50%, rgba(227,28,61,0.35), transparent 70%)",
              }}
              aria-hidden
            />
            <StatBadge icon={Users} value={totalMembers} label="Members" />
            <div className="stats-divider" />
            <StatBadge icon={Gamepad2} value={games.length} label="Active Games" />
            <div className="stats-divider" />
            <StatBadge icon={Swords} value={totalChallenges} label="Challenges" />
            <div className="stats-divider" />
            <StatBadge icon={Trophy} value={champions.length} label="Champions" />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Game cards                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="leaderboards"
          className="mx-auto mt-20 w-full max-w-6xl"
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
              className="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          <GameCardGrid
            games={games.map((g) => ({
              ...g,
              topPlayer: topPlayerByGame[g.id] ?? null,
            }))}
          />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* RiftBall CTA                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto mt-20 w-full max-w-6xl">
          <div
            className="glass-panel relative overflow-hidden rounded-2xl p-8 sm:p-10"
            style={{
              background: "linear-gradient(135deg, rgba(10,10,11,0.8) 0%, rgba(227,28,61,0.08) 100%)",
              borderColor: "rgba(227,28,61,0.25)",
              boxShadow: "0 0 60px -20px rgba(227,28,61,0.35)",
            }}
          >
            {/* Decorative background blobs */}
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, #E31C3D, transparent 70%)" }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full opacity-10 blur-2xl"
              style={{ background: "radial-gradient(circle, #FF3B54, transparent 70%)" }}
              aria-hidden
            />

            {/* "ARCADE" eyebrow */}
            <p className="rift-eyebrow relative z-10 text-rift-red">Arcade</p>

            <div className="relative z-10 mt-3 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-lg">
                <h2 className="font-display text-4xl font-extrabold uppercase tracking-wide text-foreground">
                  Rift<span className="text-rift-red">Ball</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  A fast, competitive mini-game for the RIFT community. Slide, dribble,
                  and strike your way to glory in a quick arcade showdown built for
                  Discord and the web.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Fast-paced", "Skill-based", "1v1 matches"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-rift-red/25 bg-rift-red/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-rift-red"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href="/riftball"
                id="riftball-launch-cta"
                className="btn-primary inline-flex w-fit items-center justify-center gap-2 px-7 py-3 text-sm uppercase tracking-wide"
                style={{
                  boxShadow: "0 0 30px -6px rgba(227,28,61,0.6)",
                }}
              >
                <span>Launch RiftBall</span>
                <span className="text-base">⚽</span>
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
