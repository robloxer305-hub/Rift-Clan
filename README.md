<<<<<<< HEAD
# RIFT CLAN

Competitive gaming clan platform — live leaderboards for Valorant, Roblox,
Minecraft, CS2, and Brawlhalla, synced automatically from Discord.

This repo is being built in phases (see the project brief). **This commit
is Phase 1: project scaffold, design system, and database schema only.**
There's no leaderboard UI, auth, or Discord bot yet — that's Phases 2–6.

## Phase 1 — what's here

- Next.js 15 (App Router) + TypeScript, strict mode
- Tailwind CSS configured with the RIFT design tokens (colors, fonts,
  radii) in `tailwind.config.ts` / `app/globals.css`
- `components.json` so `npx shadcn add <component>` works from Phase 2 on
- Prisma schema with every model the platform needs: users, games,
  leaderboard entries + snapshots, rank history, challenges, match
  results, Discord message log, sync log, admin audit log
- `lib/env.ts` — Zod-validated environment variables (app fails fast at
  boot with a clear message if something's missing, instead of failing
  later with `undefined`)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Postgres

Create a free Postgres database on [Neon](https://neon.tech) or
[Supabase](https://supabase.com) — either works. Copy the connection
string.

```bash
cp .env.example .env
```

Open `.env` and set `DATABASE_URL` (and `DIRECT_URL` if your provider
gives you a separate unpooled connection string — Neon and Supabase
both do). Everything else in `.env.example` is for later phases and
can stay blank for now.

### 3. Push the schema and seed the games

```bash
npm run db:push    # creates all tables from prisma/schema.prisma
npm run db:seed    # inserts the 5 real games (Valorant, Roblox, Minecraft, CS2, Brawlhalla)
```

Use `npm run db:studio` any time to browse the database in a GUI.

### 4. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000` — you should see the RIFT wordmark on a
dark glass panel with the red glow. That confirms fonts, Tailwind
tokens, and the Postgres connection are all wired up correctly.

## Project structure (target — filled in across phases)

```
app/
  layout.tsx          # ✅ Phase 1 — fonts, metadata
  page.tsx             # ✅ Phase 1 — placeholder, full hero in Phase 2
  globals.css          # ✅ Phase 1 — design tokens
  leaderboards/
    page.tsx            # Phase 3
    [game]/page.tsx      # Phase 3
  players/
    page.tsx            # Phase 9
    [discordId]/page.tsx # Phase 9
  challenges/page.tsx   # Phase 8
  admin/page.tsx        # Phase 10
  api/                  # route handlers (auth, sync webhook, etc.)

components/
  layout/   ui/   leaderboard/   player/   challenge/

lib/
  env.ts     # ✅ Phase 1
  db.ts      # ✅ Phase 1
  utils.ts   # ✅ Phase 1
  discord/   # Phase 5/6 — Discord API + auth helpers
  leaderboard/ # Phase 6/7 — parsing, diffing, rank math
  validation/  # Zod schemas for API input

prisma/
  schema.prisma  # ✅ Phase 1 — full schema
  seed.ts        # ✅ Phase 1 — seeds the 5 games

bot/
  index.ts             # Phase 5 — separate discord.js service
  leaderboardParser.ts  # Phase 6
  discordEvents.ts      # Phase 5/6
```

## Why a few things are set up this way

- **The bot is a separate process, not a Next.js API route.** discord.js
  needs a persistent gateway connection; Vercel's serverless functions
  don't hold connections open. The bot (Phase 5) runs on a
  long-lived host (Railway/Fly.io/a small VPS) and talks to the same
  Postgres database and to the website via a signed internal API call.
- **Auth.js's `Account`/`Session` models live in the same schema as
  everything else**, rather than a separate auth database, so a
  Discord OAuth login and a Discord bot-driven leaderboard update are
  both just writes to the same `User` row — no sync step between two
  systems.
- **`LeaderboardEntry` holds only the current standing; `RankHistory` and
  `LeaderboardSnapshot` hold everything that ever happened.** This is
  what the brief's "do not delete history" requirement maps to at the
  schema level — a sync never deletes and recreates rows, it diffs
  against the current entries and writes history alongside the update.

## Next: Phase 2

Global design system components (navbar, footer, buttons, cards) and
the real home page — hero, animated background, the "RIFT LEADERBOARDS"
game cards, and the live top-3 podium — built on top of this scaffold.
=======
# Rift-Clan
>>>>>>> 8aba547796b36e1b598821e993051f70648b96e8
