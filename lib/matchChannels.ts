import { env } from "@/lib/env";

export const matchChannelByGameSlug: Record<string, string> = Object.fromEntries(
  [
    ["valorant", env.DISCORD_VALORANT_MATCH_CHANNEL_ID],
    ["roblox", env.DISCORD_ROBLOX_MATCH_CHANNEL_ID],
    ["minecraft", env.DISCORD_MINECRAFT_MATCH_CHANNEL_ID],
    ["cs2", env.DISCORD_CS2_MATCH_CHANNEL_ID],
    ["brawlhalla", env.DISCORD_BRAWLHALLA_MATCH_CHANNEL_ID],
  ].filter((entry): entry is [string, string] => Boolean(entry[1])),
);
