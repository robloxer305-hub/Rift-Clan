/**
 * Robust Leaderboard Message Parser
 *
 * Supports various formats:
 *   1 👑 <@123456789012345678>
 *   1. 👑 <:custom_crown:9999> <@123456789012345678>
 *   #1 <@!123456789012345678>
 *   **1** - <@123456789012345678>
 *   TOP 5 VALORANT RIFT
 */

export type ParsedEntry = {
  rank: number;
  discordId: string;
};

// Regex to find a Discord mention anywhere on a line: <@1234567890> or <@!1234567890>
const MENTION_RE = /<@!?(\d{15,20})>/;

// Regex to find the leading rank number on a line (e.g., "1", "#1", "**1**", "1.", "1 -", "1 👑")
const RANK_RE = /(?:^|\s|\*|#)(\d{1,3})(?:[\.\:\)\s\-\*]|$)/;

export function parseLeaderboardMessage(content: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const seenRanks = new Set<number>();
  const seenUsers = new Set<string>();

  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check if line contains a Discord user mention
    const mentionMatch = line.match(MENTION_RE);
    if (!mentionMatch || !mentionMatch[1]) continue;

    const discordId = mentionMatch[1];

    // Isolate text before the mention to find the rank number
    const textBeforeMention = line.slice(0, mentionMatch.index);
    const rankMatch = textBeforeMention.match(RANK_RE);

    let rank: number | null = null;

    if (rankMatch && rankMatch[1]) {
      rank = parseInt(rankMatch[1], 10);
    } else {
      // Fallback: search anywhere before the mention for the first integer
      const firstNumMatch = textBeforeMention.match(/(\d{1,3})/);
      if (firstNumMatch && firstNumMatch[1]) {
        rank = parseInt(firstNumMatch[1], 10);
      }
    }

    if (rank !== null && rank > 0 && !seenRanks.has(rank) && !seenUsers.has(discordId)) {
      entries.push({ rank, discordId });
      seenRanks.add(rank);
      seenUsers.add(discordId);
    }
  }

  return entries.sort((a, b) => a.rank - b.rank);
}

/**
 * Fast pre-filter check to see if a message contains a leaderboard structure.
 */
export function isLeaderboardMessage(content: string): boolean {
  const parsed = parseLeaderboardMessage(content);
  return parsed.length > 0;
}
