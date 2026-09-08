import { type Role } from "@prisma/client";
import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extends the built-in Session.user type with RIFT-specific fields
   * that we populate in the `session` JWT callback in lib/auth.ts.
   */
  interface Session {
    user: {
      id: string;
      discordId: string;
      role: Role;
      clanTag: string | null;
      username: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /** Extends the JWT payload with RIFT-specific fields */
  interface JWT {
    userId?: string;
    discordId?: string;
    role?: Role;
    clanTag?: string | null;
    username?: string;
  }
}
