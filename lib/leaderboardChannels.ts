import { env } from "@/lib/env";

export const leaderboardChannelByGameSlug: Record<string, string> = Object.fromEntries(
  [
    ["valorant", env.DISCORD_VALORANT_CHANNEL_ID],
    ["roblox", env.DISCORD_ROBLOX_CHANNEL_ID],
    ["minecraft", env.DISCORD_MINECRAFT_CHANNEL_ID],
    ["cs2", env.DISCORD_CS2_CHANNEL_ID],
    ["brawlhalla", env.DISCORD_BRAWLHALLA_CHANNEL_ID],
  ].filter((entry): entry is [string, string] => Boolean(entry[1])),
);