import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { db } from "@/lib/db";

/**
 * Auth.js v5 configuration for RIFT CLAN.
 *
 * Strategy: JWT (no PrismaAdapter) — Discord is the only OAuth provider,
 * so we manage our User table manually in the `signIn` callback rather
 * than fighting the adapter's generic createUser() against our schema's
 * required discordId / username fields. Account/Session Prisma models are
 * retained for future reference; they are not written to by this config.
 *
 * Required env vars (Phase 4):
 *   AUTH_SECRET           — run `npx auth secret` to generate
 *   DISCORD_CLIENT_ID     — Discord Developer Portal → OAuth2
 *   DISCORD_CLIENT_SECRET — Discord Developer Portal → OAuth2
 *   AUTH_URL              — http://localhost:3000 (dev) / your prod URL
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,

  session: { strategy: "jwt" },

  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    }),
  ],

  callbacks: {
    /**
     * Called by the middleware to decide if a route is accessible.
     * Returning false triggers a redirect to the signIn page.
     */
    authorized({ auth: session }) {
      return !!session;
    },

    /**
     * On the first sign-in (and every subsequent one), upsert our User row
     * with the latest Discord profile data, then return true to allow login.
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "discord" || !profile) return false;

      try {
        const rawAvatarDecoration = (profile as any)?.avatar_decoration_data as
          | { asset?: string | null }
          | undefined;
        const avatarDecoration = rawAvatarDecoration?.asset ?? null;

        await db.user.upsert({
          where: { discordId: profile.id as string },
          update: {
            username:
              (profile.username as string) ?? (profile.name as string) ?? "Unknown",
            globalName: (profile.global_name as string) ?? null,
            avatar: (profile.avatar as string) ?? null,
            avatarDecoration,
            banner: (profile.banner as string | null) ?? null,
          },
          create: {
            discordId: profile.id as string,
            username:
              (profile.username as string) ?? (profile.name as string) ?? "Unknown",
            globalName: (profile.global_name as string) ?? null,
            avatar: (profile.avatar as string) ?? null,
            avatarDecoration,
            banner: (profile.banner as string | null) ?? null,
          },
        });
        return true;
      } catch (err) {
        console.error("[auth] signIn upsert failed:", err);
        return false;
      }
    },

    /**
     * Populates the JWT token with our DB user's id + role after sign-in.
     * On subsequent requests the token is read from the cookie — no DB hit.
     */
    async jwt({ token, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const user = await db.user.findUnique({
          where: { discordId: profile.id as string },
          select: {
            id: true,
            role: true,
            discordId: true,
            clanTag: true,
            avatar: true,
            username: true,
          },
        });
        if (user) {
          token.userId = user.id;
          token.discordId = user.discordId;
          token.role = user.role;
          token.clanTag = user.clanTag;
          token.avatar = user.avatar ?? undefined;
          token.username = user.username;
        }
      }
      return token;
    },

    /**
     * Exposes our custom fields on the client-visible Session object.
     * We cast the return value to satisfy Auth.js's overloaded generic
     * while still getting full TypeScript coverage on the extended fields.
     */
    session({ session, token }): any {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId ?? "",
          discordId: token.discordId ?? "",
          role: token.role ?? "MEMBER",
          clanTag: token.clanTag ?? null,
          username: token.username ?? session.user.name ?? "",
          image: token.avatar
            ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.avatar}.webp?size=128`
            : session.user.image,
        },
      };
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
