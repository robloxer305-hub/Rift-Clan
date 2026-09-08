import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

/**
 * Next.js dev mode hot-reloads modules, which would otherwise create a
 * fresh PrismaClient (and a fresh connection pool) on every save. We
 * stash the instance on `globalThis` in development so it's reused.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
