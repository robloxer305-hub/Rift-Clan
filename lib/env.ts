import { z } from "zod";

// Do not load dotenv here. Next.js already populates process.env in server/runtime contexts,
// and importing Node-only modules like "path" or "dotenv" in the Edge runtime breaks middleware.

/**
 * Every environment variable the app touches is declared here, once.
 * Nothing outside this file should read `process.env` directly — that
 * keeps a missing/mistyped var from surfacing as a confusing runtime
 * error three layers deep in the leaderboard sync or the Discord bot.
 *
 * Vars are grouped by the phase that introduces them. Groups not yet
 * wired up are `.optional()` so Phase 1 can boot with just a database;
 * tighten a group to `.min(1)` as its phase lands.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  // --- Phase 1: database (server-only) --------------------------------
  // These are optional for client-side validation to avoid errors during SSR
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(), // unpooled connection, needed by `prisma migrate` on Neon/Supabase

  // --- Phase 4: Discord OAuth (Auth.js) -------------------------------
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_URL: z.string().url().optional(),
  DISCORD_CLIENT_ID: z.string().min(1).optional(),
  DISCORD_CLIENT_SECRET: z.string().min(1).optional(),

  // --- Phase 5/6: Discord bot + leaderboard sync ----------------------
  DISCORD_BOT_TOKEN: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  DISCORD_ADMIN_ROLE_ID: z.string().min(1).optional(), // role authorized to post leaderboard updates

  GEMINI_API_KEY: z.string().min(1).optional(),

  DISCORD_VALORANT_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_ROBLOX_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_MINECRAFT_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_CS2_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_BRAWLHALLA_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_VALORANT_MATCH_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_ROBLOX_MATCH_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_MINECRAFT_MATCH_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_CS2_MATCH_CHANNEL_ID: z.string().min(1).optional(),
  DISCORD_BRAWLHALLA_MATCH_CHANNEL_ID: z.string().min(1).optional(),

  // --- Phase 11: realtime ---------------------------------------------
  PUSHER_APP_ID: z.string().min(1).optional(),
  PUSHER_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1).optional(),

  // --- Music: yt-dlp path (auto-detected if omitted) ------------------
  YTDLP_PATH: z.string().optional(),
  FFMPEG_PATH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment variables. Check .env against .env.example:\n${formatted}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();
