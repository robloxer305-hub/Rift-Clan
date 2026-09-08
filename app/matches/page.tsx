import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db } from "@/lib/db";
import { getGameImage } from "@/lib/gameImages";
import { matchChannelByGameSlug } from "@/lib/matchChannels";

export const revalidate = 30;

export const metadata = {
  title: "Matches",
  description: "Recent match results across RIFT CLAN games.",
};

const matchGameLinks = [
  { slug: "valorant", label: "Valorant" },
  { slug: "roblox", label: "Roblox" },
  { slug: "minecraft", label: "Minecraft" },
  { slug: "cs2", label: "Counter-Strike 2" },
  { slug: "brawlhalla", label: "Brawlhalla" },
];

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type ParsedMatch = {
  number: number;
  players: string;
  rounds: { mode: string; data: string; winner: string | null }[];
};

function formatLogLine(line: string, usernames: Map<string, string>) {
  return line.replace(/<@!?(\d+)>/g, (mention, discordId: string) => usernames.get(discordId) ?? mention);
}

function parseMatches(content: string, usernames: Map<string, string>): ParsedMatch[] {
  const matches: ParsedMatch[] = [];
  let current: ParsedMatch | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = formatLogLine(rawLine.trim(), usernames);
    const matchHeader = line.match(/^match\s+(\d+)/i);
    if (matchHeader) {
      current = { number: Number(matchHeader[1]), players: "Players not listed", rounds: [] };
      matches.push(current);
      continue;
    }
    if (!current) continue;

    const players = line.match(/^(.+?)\s+vs\s+(.+?)\s*:?$/i);
    if (players?.[1] && players[2]) {
      current.players = `${players[1].trim()} vs ${players[2].trim()}`;
      continue;
    }

    const finalResult = line.match(/^(.+?)\s+(?:win|wins|won)\s+(\d+\s*-\s*\d+)\s*$/i);
    if (finalResult?.[1] && finalResult[2]) {
      current.rounds.push({
        mode: "Overall",
        data: finalResult[2].trim(),
        winner: finalResult[1].trim(),
      });
      continue;
    }

    const round = line.match(/^(Skirmish|Unrated|Overall|[A-Za-z][A-Za-z0-9 '&-]*)\s*:?\s*(.+)$/i);
    if (round?.[1] && round[2]) {
      const details = round[2].trim();
      const winnerSplit = details.match(/^(.*?)\s+to\s+(.+)$/i)
        ?? details.match(/^(.+?)\s+wins?\s*\(([^)]+)\)/i)
        ?? details.match(/^(\d+\s*-\s*\d+)\s+(.+?)\s+wins?/i);
      current.rounds.push({
        mode: round[1],
        data: winnerSplit?.[2] && /wins?\s*\(/i.test(details)
          ? winnerSplit[2].trim()
          : winnerSplit?.[1]?.trim() ?? details,
        winner: winnerSplit?.[2] && /wins?\s*\(/i.test(details)
          ? winnerSplit[1]?.trim() ?? null
          : winnerSplit?.[2]?.trim() ?? null,
      });
    }
  }

  return matches;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: requestedGame } = await searchParams;
  const selectedSlug = matchGameLinks.some((game) => game.slug === requestedGame)
    ? requestedGame!
    : "valorant";

  const [games, users] = await Promise.all([
    db.game.findMany({
      orderBy: { name: "asc" },
      include: {
        discordMessages: {
          where: { processingError: null },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.user.findMany({ select: { discordId: true, username: true } }),
  ]);
  const usernames = new Map(users.map((user) => [user.discordId, user.username]));

  const gamesWithMatches = games.map((game) => ({
    ...game,
    discordMessages: game.discordMessages.filter(
      (message) => matchChannelByGameSlug[game.slug] === message.channelId,
    ),
  }));
  const selectedGame = gamesWithMatches.find((game) => game.slug === selectedSlug);
  const selectedMatches = selectedGame
    ? selectedGame.discordMessages
        .flatMap((message) =>
          parseMatches(message.content, usernames).map((match) => ({ message, match })),
        )
        .sort((a, b) => a.match.number - b.match.number)
    : [];
  const hasMatches = selectedMatches.length > 0;
  const selectedImage = getGameImage(selectedSlug);

  return (
    <main className="relative min-h-screen">
      {selectedImage && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(10, 10, 11, 0.68), rgba(10, 10, 11, 0.96)), url(${selectedImage})`,
          }}
          aria-hidden
        />
      )}
      <div className="bg-rift-glow pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="relative z-10 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Navbar />

          <header className="mt-12 mb-8">
            <p className="rift-eyebrow text-rift-red">
              <span className="live-dot mr-2" />
              Discord Match Logs
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold uppercase tracking-wide">
              Matches
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Recent match results synced from each game&apos;s Discord log.
            </p>
          </header>

          <nav className="glass-panel mb-8 flex flex-wrap gap-1 rounded-xl p-1.5" aria-label="Match games">
            {matchGameLinks.map((game) => (
              <Link
                key={game.slug}
                href={`/matches?game=${game.slug}`}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  selectedSlug === game.slug
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {game.label}
              </Link>
            ))}
          </nav>

          {!selectedGame || !hasMatches ? (
            <div className="glass-panel rounded-xl py-20 text-center">
              <p className="font-display text-xl text-muted-foreground">
                No {selectedGame?.name ?? "game"} matches yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Match results will appear here when the Discord logs are synced.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {gamesWithMatches.filter((game) => game.slug === selectedSlug).map((game) => {
                const image = getGameImage(game.slug);
                if (game.discordMessages.length === 0) return null;

                return (
                  <section key={game.id} className="space-y-3">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <div
                          className="mb-2 h-1 w-10 rounded-full"
                          style={{ background: game.themeColor ?? "hsl(var(--primary))" }}
                        />
                        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">
                          {game.name}
                        </h2>
                      </div>
                      <Link
                        href={`/leaderboards/${game.slug}`}
                        className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        View leaderboard →
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {selectedMatches.map(({ message, match }) => (
                            <article
                              key={`${message.id}-${match.number}`}
                              className="glass-panel relative overflow-hidden rounded-xl"
                              style={image ? {
                                backgroundImage: `linear-gradient(90deg, rgba(10, 10, 11, 0.94), rgba(10, 10, 11, 0.76)), url(${image})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              } : undefined}
                            >
                              <div className="relative z-10">
                                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                                  <h3 className="font-display text-base font-bold uppercase">Match {match.number}</h3>
                                  <time className="font-mono text-[10px] text-muted-foreground" dateTime={message.createdAt.toISOString()}>
                                    {formatTimestamp(message.editedAt ?? message.createdAt)}
                                  </time>
                                </div>
                                <div className="space-y-3 px-4 py-4">
                                  <p className="font-display text-sm font-bold text-foreground">{match.players}</p>
                                  {match.rounds.length > 0 ? match.rounds.map((round) => (
                                    <div key={round.mode} className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border/40 pt-3">
                                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{round.mode}</span>
                                      <span className="flex flex-wrap items-center justify-end gap-3 text-right font-mono text-xs text-foreground/90">
                                        <span>{round.data}</span>
                                        {round.winner && <span className="text-emerald-400">Winner: {round.winner}</span>}
                                      </span>
                                    </div>
                                  )) : (
                                    <p className="text-xs text-muted-foreground">No round results recorded.</p>
                                  )}
                                </div>
                                <div className="border-t border-border/40 px-4 py-2">
                                  <a href={message.messageUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground">
                                    Open original Discord log →
                                  </a>
                                </div>
                              </div>
                            </article>
                      ))}
                      {/*
                      {game.discordMessages.map((message) => (
                        <article
                          key={message.id}
                          className="glass-panel relative overflow-hidden rounded-xl"
                          style={
                            image
                              ? {
                                  backgroundImage: `linear-gradient(90deg, rgba(10, 10, 11, 0.94), rgba(10, 10, 11, 0.76)), url(${image})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                        >
                          <div className="relative z-10">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
                              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                <span className="live-dot" />
                                Match log
                              </span>
                              <time className="font-mono text-[10px] text-muted-foreground" dateTime={message.createdAt.toISOString()}>
                                {formatTimestamp(message.editedAt ?? message.createdAt)}
                              </time>
                            </div>
                            <div className="overflow-x-auto px-4 py-4">
                              <div className="min-w-[520px] space-y-1 font-mono text-xs leading-relaxed text-foreground/90">
                                {message.content.split(/\r?\n/).map((line, index) => (
                                  <p
                                    key={`${message.id}-${index}`}
                                    className={line.trim().toLowerCase().startsWith("match") ? "mt-3 text-foreground first:mt-0" : undefined}
                                  >
                                    {formatLogLine(line, usernames) || "\u00a0"}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-border/40 px-4 py-2">
                              <a
                                href={message.messageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                              >
                                Open original Discord log →
                              </a>
                            </div>
                          </div>
                        </article>
                      ))} */}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <Footer />
        </div>
      </div>
    </main>
  );
}
