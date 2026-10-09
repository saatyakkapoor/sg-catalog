import fs from "node:fs/promises";
import path from "node:path";
import { getAdminStorage, usesCloudStorage } from "@/lib/firebase-admin";

const SNAPSHOT = "data/catalog.db";

function localDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const file = url.replace(/^file:/, "");
  return path.isAbsolute(file) ? file : path.join(process.cwd(), file);
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** Pulls the last published SQLite snapshot from Firebase Storage. */
export async function restoreDatabase(): Promise<void> {
  if (!usesCloudStorage()) return;

  const target = localDbPath();
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    const [buffer] = await getAdminStorage().bucket().file(SNAPSHOT).download();
    await fs.writeFile(target, buffer);
    console.log("[db] restored catalog snapshot from Firebase Storage");
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 404) {
      console.log("[db] no remote snapshot yet — starting from the local database");
      return;
    }
    console.warn("[db] could not restore snapshot", error);
  }
}

export function persistDatabase(): void {
  if (!usesCloudStorage()) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void flushDatabase();
  }, 1500);
}

export async function flushDatabase(): Promise<void> {
  if (!usesCloudStorage()) return;
  try {
    const data = await fs.readFile(localDbPath());
    await getAdminStorage().bucket().file(SNAPSHOT).save(data, {
      resumable: false,
      metadata: { contentType: "application/x-sqlite3" },
    });
  } catch (error) {
    console.error("[db] failed to persist catalog snapshot", error);
  }
}
