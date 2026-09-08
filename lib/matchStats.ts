import { db } from "@/lib/db";
import { matchChannelByGameSlug } from "@/lib/matchChannels";

type MatchLog = {
  players: string[];
  winner: string | null;
};

export type PlayerGameStats = {
  played: number;
  won: number;
  lost: number;
  winRate: number;
  lossRate: number;
};

function parseMatchLogs(content: string): MatchLog[] {
  const matches: MatchLog[] = [];
  let current: MatchLog | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/^match\s+\d+/i.test(line)) {
      current = { players: [], winner: null };
      matches.push(current);
      continue;
    }
    if (!current) continue;

    const playerLine = line.match(/(<@!?\d+>)\s+vs\s+(<@!?\d+>)/i);
    if (playerLine?.[1] && playerLine[2]) {
      current.players = [
        playerLine[1].replace(/<@!?|>/g, ""),
        playerLine[2].replace(/<@!?|>/g, ""),
      ];
      continue;
    }

    if (/^overall\b/i.test(line) || /<@!?\d+>.*\b(?:win|wins|won)\b/i.test(line)) {
      const winner = line.match(/<@!?([0-9]+)>/);
      current.winner = winner?.[1] ?? null;
    }
  }

  return matches;
}

export async function getPlayerMatchStats(userId: string): Promise<Record<string, PlayerGameStats>> {
  const [user, games] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { discordId: true } }),
    db.game.findMany({
      orderBy: { name: "asc" },
      include: {
        discordMessages: {
          where: { processingError: null },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  if (!user) return {};

  const stats: Record<string, PlayerGameStats> = {};
  for (const game of games) {
    const channelId = matchChannelByGameSlug[game.slug];
    if (!channelId) continue;

    const gameStats = { played: 0, won: 0, lost: 0, winRate: 0, lossRate: 0 };
    for (const message of game.discordMessages) {
      if (message.channelId !== channelId) continue;
      for (const match of parseMatchLogs(message.content)) {
        if (!match.players.includes(user.discordId)) continue;
        gameStats.played += 1;
        if (match.winner === user.discordId) gameStats.won += 1;
        else if (match.winner) gameStats.lost += 1;
      }
    }

    if (gameStats.played > 0) {
      gameStats.winRate = Math.round((gameStats.won / gameStats.played) * 100);
      gameStats.lossRate = Math.round((gameStats.lost / gameStats.played) * 100);
      stats[game.slug] = gameStats;
    }
  }

  return stats;
}
