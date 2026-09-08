import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/leaderboard/StatusBadge";
import { db } from "@/lib/db";
import ProfileStatistics from "@/components/ProfileStatistics";
import { getPlayerMatchStats } from "@/lib/matchStats";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { username: true } });
  return { title: user ? `${user.username} Profile` : "Profile" };
}

export default async function MemberProfilePage({ params }: Props) {
  const { id } = await params;
  const [user, entries, matchStats] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        username: true,
        globalName: true,
        discordId: true,
        avatar: true,
        avatarDecoration: true,
        banner: true,
        profileBackground: true,
        profileBanner: true,
        clanTag: true,
        role: true,
        createdAt: true,
      },
    }),
    db.leaderboardEntry.findMany({
      where: { userId: id, status: { not: "INACTIVE" } },
      include: { game: true },
      orderBy: { rank: "asc" },
    }),
    getPlayerMatchStats(id),
  ]);

  if (!user) return notFound();

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.webp?size=256`
    : null;
  const bannerUrl = user.banner
    ? `https://cdn.discordapp.com/banners/${user.discordId}/${user.banner}.png?size=900`
    : null;
  const profileBannerUrl = user.profileBanner ?? bannerUrl;
  const profileBackgroundStyle = user.profileBackground
    ? { backgroundImage: `linear-gradient(rgba(10, 10, 11, 0.7), rgba(10, 10, 11, 0.92)), url(${user.profileBackground})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" as const }
    : undefined;
  const decorationUrl = user.avatarDecoration
    ? `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatarDecoration}.png?size=256`
    : null;
  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  return (
    <main className="relative min-h-screen" style={profileBackgroundStyle}>
      <div className="bg-rift-glow pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="relative z-10 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Navbar />

          <div className="mt-10 mb-20 space-y-8">
            <div
              className="glass-panel overflow-hidden rounded-2xl"
              style={profileBannerUrl ? {
                backgroundImage: `linear-gradient(rgba(10, 10, 11, 0.62), rgba(10, 10, 11, 0.78)), url(${profileBannerUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              } : undefined}
            >
              <div className="relative h-28 w-full overflow-hidden border-b border-border/60 bg-secondary/60">
                {profileBannerUrl ? (
                  <Image src={profileBannerUrl} alt="Profile banner" fill className="object-cover" unoptimized />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(227,28,61,0.35),_transparent_55%)]" />
                )}
              </div>

              <div className="relative px-8 pb-8 pt-0">
                <div className="-mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-end">
                  <div className="relative">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={user.username} width={96} height={96} className="rounded-full bg-background ring-4 ring-background" unoptimized />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rift-red/10 font-display text-4xl font-bold text-rift-red ring-4 ring-background">
                        {user.username[0]?.toUpperCase()}
                      </div>
                    )}
                    {decorationUrl && (
                      <Image src={decorationUrl} alt="Avatar decoration" width={128} height={128} className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" unoptimized />
                    )}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl font-bold">{user.username}</h1>
                      {user.clanTag && <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">{user.clanTag}</span>}
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{user.role}</span>
                    </div>
                    {user.globalName && user.globalName !== user.username && <p className="mt-0.5 text-sm text-muted-foreground">{user.globalName}</p>}
                    <p className="mt-3 font-mono text-xs text-muted-foreground">Member since {memberSince}</p>
                  </div>
                </div>
              </div>
            </div>

            <ProfileStatistics
              stats={Object.entries(matchStats).map(([slug, stats]) => ({
                ...stats,
                gameName: entries.find((entry) => entry.game.slug === slug)?.game.name ?? slug,
                themeColor: entries.find((entry) => entry.game.slug === slug)?.game.themeColor ?? null,
              }))}
            />

            <section>
              <p className="rift-eyebrow mb-4">Leaderboard Positions</p>
              {entries.length === 0 ? (
                <div className="glass-panel rounded-xl py-12 text-center text-sm text-muted-foreground">This player is not currently ranked in any game.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {entries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/leaderboards/${entry.game.slug}`}
                      className="glass-panel group flex items-center gap-4 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      style={entry.game.themeColor ? { borderColor: `${entry.game.themeColor}33` } : undefined}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-display text-xl font-bold" style={{ background: entry.game.themeColor ? `${entry.game.themeColor}18` : undefined, color: entry.game.themeColor ?? undefined }}>
                        #{entry.rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold uppercase">{entry.game.name}</p>
                        <div className="mt-1"><StatusBadge status={entry.status} /></div>
                      </div>
                      <span className="text-muted-foreground transition-colors group-hover:text-foreground">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <Footer />
        </div>
      </div>
    </main>
  );
}
