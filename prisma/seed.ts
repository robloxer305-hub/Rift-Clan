import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// These five games are RIFT's actual supported titles — reference
// data the app needs to boot.
// All player entries and users come exclusively from real Discord OAuth
// logins and the Discord bot sync in real-time.
const games = [
  {
    slug: "valorant",
    name: "Valorant",
    description: "Tactical 5v5 character-based shooter.",
    themeColor: "#FF4655",
  },
  {
    slug: "roblox",
    name: "Roblox",
    description: "Competitive Roblox play across RIFT's tracked games.",
    themeColor: "#00A2FF",
  },
  {
    slug: "minecraft",
    name: "Minecraft",
    description: "PvP and competitive Minecraft ranking.",
    themeColor: "#5BBF4A",
  },
  {
    slug: "cs2",
    name: "Counter-Strike 2",
    description: "Tactical 5v5 competitive shooter.",
    themeColor: "#DEB03C",
  },
  {
    slug: "brawlhalla",
    name: "Brawlhalla",
    description: "Platform fighting game ranked ladder.",
    themeColor: "#F2A93B",
  },
];

async function main() {
  for (const game of games) {
    await db.game.upsert({
      where: { slug: game.slug },
      update: { name: game.name, description: game.description, themeColor: game.themeColor },
      create: game,
    });
  }
  console.log(`✓ Seeded ${games.length} official RIFT games.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
