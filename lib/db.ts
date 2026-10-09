import { PrismaClient } from "@prisma/client";
import { persistDatabase, restoreDatabase } from "@/lib/db-persist";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: Promise<void> | undefined;
};

function createClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, operation }) {
          const result = await query(args);
          if (
            operation !== "findUnique" &&
            operation !== "findUniqueOrThrow" &&
            operation !== "findFirst" &&
            operation !== "findFirstOrThrow" &&
            operation !== "findMany" &&
            operation !== "count" &&
            operation !== "aggregate" &&
            operation !== "groupBy"
          ) {
            persistDatabase();
          }
          return result;
        },
      },
    },
  });
}

type ExtendedClient = ReturnType<typeof createClient>;

export const prisma = (globalForPrisma.prisma ??
  createClient()) as unknown as PrismaClient & ExtendedClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma as unknown as PrismaClient;
}

export function ensureDatabase(): Promise<void> {
  if (!globalForPrisma.dbReady) {
    globalForPrisma.dbReady = restoreDatabase();
  }
  return globalForPrisma.dbReady;
}
