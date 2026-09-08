import { type Guild } from "discord.js";
import { db } from "@/lib/db";
import { type ParsedEntry } from "./leaderboardParser";

/**
 * Core sync function — takes a freshly-parsed leaderboard and brings the
 * database in line with it.
 */
export async function syncLeaderboard({
  gameSlug,
  entries,
  discordMessageId,
  channelId,
  authorDiscordId,
  messageContent,
  messageUrl,
  editedAt,
  guild,
}: {
  gameSlug: string;
  entries: ParsedEntry[];
  discordMessageId: string;
  channelId: string;
  authorDiscordId: string;
  messageContent: string;
  messageUrl: string;
  editedAt: Date | null;
  guild: Guild | null;
}): Promise<void> {
  const game = await db.game.findUnique({ where: { slug: gameSlug } });
  if (!game) throw new Error(`[sync] No game found for slug "${gameSlug}"`);

  console.log(`[sync] Processing ${entries.length} entries for game "${game.name}"...`);

  if (entries.length === 0) {
    await db.discordMessage.upsert({
      where: { discordMessageId },
      update: {
        content: messageContent,
        editedAt,
        processedAt: new Date(),
        processingError: null,
      },
      create: {
        discordMessageId,
        channelId,
        gameId: game.id,
        authorDiscordId,
        content: messageContent,
        messageUrl,
        editedAt,
        processedAt: new Date(),
      },
    });

    await db.syncLog.create({
      data: {
        gameId: game.id,
        status: "LIVE",
        message: `No leaderboard entries found in message ${discordMessageId} for ${gameSlug}`,
      },
    });
    return;
  }

  // --- 1. Resolve / create users ------------------------------------------
  const resolvedEntries: { rank: number; userId: string; discordId: string }[] = [];

  for (const { rank, discordId } of entries) {
    let displayName: string | null = null;
    let avatar: string | null = null;

    if (guild) {
      try {
        const member = await guild.members.fetch(discordId);
        displayName = member.displayName ?? member.user.username;
        avatar = member.user.avatar ?? null;
      } catch {
        // Fall back if member not fetched or cached
      }
    }

    const user = await db.user.upsert({
      where: { discordId },
      update: {
        ...(displayName ? { username: displayName } : {}),
        ...(avatar ? { avatar } : {}),
      },
      create: {
        discordId,
        username: displayName ?? `Player_${discordId.slice(-4)}`,
        avatar,
      },
    });

    resolvedEntries.push({ rank, userId: user.id, discordId });
  }

  // --- 2-4. Transaction with temporary rank inversion to prevent unique collision ---
  await db.$transaction(
    async (tx) => {
      // Fetch current entries
      const currentEntries = await tx.leaderboardEntry.findMany({
        where: { gameId: game.id },
        select: { id: true, userId: true, rank: true, status: true, previousRank: true },
      });

      const currentByUserId = new Map(currentEntries.map((e) => [e.userId, e]));
      const incomingUserIds = new Set(resolvedEntries.map((e) => e.userId));

      // Temporarily negate existing ranks to prevent unique constraint collisions on (gameId, rank)
      for (const entry of currentEntries) {
        if (entry.rank > 0) {
          await tx.leaderboardEntry.update({
            where: { id: entry.id },
            data: { rank: -1 * entry.rank },
          });
        }
      }

      // Upsert each incoming entry with its real rank
      for (const { rank, userId } of resolvedEntries) {
        const existing = currentByUserId.get(userId);
        const originalRank = existing ? Math.abs(existing.rank) : null;
        const isNew = !existing;
        const rankChanged = originalRank !== rank;

        await tx.leaderboardEntry.upsert({
          where: { gameId_userId: { gameId: game.id, userId } },
          update: {
            previousRank: rankChanged ? originalRank : existing?.previousRank ?? null,
            rank,
            status: existing?.status === "DEFENDING" ? "DEFENDING" : isNew ? "NEW" : "ACTIVE",
            updatedAt: new Date(),
          },
          create: {
            gameId: game.id,
            userId,
            rank,
            previousRank: null,
            status: "NEW",
          },
        });

        // Write rank history if rank changed or new entry
        if (rankChanged || isNew) {
          await tx.rankHistory.create({
            data: {
              userId,
              gameId: game.id,
              previousRank: originalRank,
              newRank: rank,
              reason: editedAt ? "Discord sync (edited)" : "Discord sync",
              discordMessageId,
            },
          });
        }
      }

      // Mark vanished players as INACTIVE (and give them safe high ranks)
      let inactiveOffset = 9000;
      for (const entry of currentEntries) {
        if (!incomingUserIds.has(entry.userId)) {
          inactiveOffset++;
          const origRank = Math.abs(entry.rank);
          await tx.leaderboardEntry.update({
            where: { id: entry.id },
            data: {
              rank: inactiveOffset,
              status: "INACTIVE",
              updatedAt: new Date(),
            },
          });

          if (entry.status !== "INACTIVE") {
            await tx.rankHistory.create({
              data: {
                userId: entry.userId,
                gameId: game.id,
                previousRank: origRank,
                newRank: origRank,
                reason: "Removed from leaderboard (Discord sync)",
                discordMessageId,
              },
            });
          }
        }
      }

      // --- 5. Snapshot ---
      await tx.leaderboardSnapshot.create({
        data: {
          gameId: game.id,
          sourceDiscordMessageId: discordMessageId,
          data: resolvedEntries.map((e) => ({
            userId: e.userId,
            discordId: e.discordId,
            rank: e.rank,
          })),
        },
      });

      // --- 6. Discord message log ---
      await tx.discordMessage.upsert({
        where: { discordMessageId },
        update: {
          content: messageContent,
          editedAt,
          processedAt: new Date(),
          processingError: null,
        },
        create: {
          discordMessageId,
          channelId,
          gameId: game.id,
          authorDiscordId,
          content: messageContent,
          messageUrl,
          editedAt,
          processedAt: new Date(),
        },
      });

      // --- 7. Sync log ---
      await tx.syncLog.create({
        data: {
          gameId: game.id,
          status: "LIVE",
          message: `Synced ${resolvedEntries.length} entries for ${gameSlug} from message ${discordMessageId}`,
        },
      });
    },
    { timeout: 15000 }
  );

  console.log(`[sync] ✓ Database transaction committed for ${game.name}!`);
}

/**
 * Records a processing error without touching any LeaderboardEntry rows.
 */
export async function recordSyncError(
  gameId: string,
  message: string,
  discordMessageId?: string
): Promise<void> {
  await db.syncLog.create({
    data: { gameId, status: "ERROR", message },
  });

  if (discordMessageId) {
    await db.discordMessage
      .update({
        where: { discordMessageId },
        data: { processingError: message },
      })
      .catch(() => {});
  }
}
