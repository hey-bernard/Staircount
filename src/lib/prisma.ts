import path from "path";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// The Prisma CLI resolves a relative sqlite `file:` URL against the schema
// file's directory (prisma/), but the generated client resolves it against
// process.cwd() at runtime - which differ during `next build`/deploy. Resolve
// an absolute path here so both agree on the same database file.
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw?.startsWith("file:")) return raw;
  const relativePath = raw.slice("file:".length);
  const absolutePath = path.resolve(process.cwd(), "prisma", relativePath);
  return `file:${absolutePath}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: resolveDatabaseUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
