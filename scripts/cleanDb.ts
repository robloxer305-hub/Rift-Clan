import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Cleaning up fake/mock development data...");

  // 1. Delete rank history for dev users
  const deletedRankHistory = await db.rankHistory.deleteMany({
    where: {
      user: {
        discordId: {
          startsWith: "dev_",
        },
      },
    },
  });
  console.log(`Deleted ${deletedRankHistory.count} mock rank history records.`);

  // 2. Delete mock leaderboard entries
  const deletedEntries = await db.leaderboardEntry.deleteMany({
    where: {
      OR: [
        {
          user: {
            discordId: {
              startsWith: "dev_",
            },
          },
        },
        {
          rank: {
            gte: 1000,
          },
        },
        {
          status: "INACTIVE",
        },
      ],
    },
  });
  console.log(`Deleted ${deletedEntries.count} mock/inactive leaderboard entries.`);

  // 3. Delete mock users
  const deletedUsers = await db.user.deleteMany({
    where: {
      discordId: {
        startsWith: "dev_",
      },
    },
  });
  console.log(`Deleted ${deletedUsers.count} mock dev users.`);

  // 4. Show remaining real users and entries
  const realUsers = await db.user.findMany({
    select: { id: true, username: true, discordId: true },
  });
  console.log(`\nRemaining Real Authenticated/Synced Users (${realUsers.length}):`);
  for (const u of realUsers) {
    console.log(` - ${u.username} (${u.discordId})`);
  }

  const realEntries = await db.leaderboardEntry.findMany({
    include: { user: true, game: true },
    orderBy: [{ game: { name: "asc" } }, { rank: "asc" }],
  });
  console.log(`\nRemaining Real Leaderboard Entries (${realEntries.length}):`);
  for (const e of realEntries) {
    console.log(` - [${e.game.name}] #${e.rank}: ${e.user.username} (${e.status})`);
  }
}

main()
  .catch((err) => {
    console.error("Cleanup error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
