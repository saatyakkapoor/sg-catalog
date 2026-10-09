/**
 * Pushes local originals and watermarked files to Firebase Storage.
 * Safe to re-run: existing objects are overwritten.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  originalsRoot,
  publicRoot,
  writeOriginalFile,
  writePublicFile,
} from "../lib/storage";
import { flushDatabase } from "../lib/db-persist";
import { readFile } from "node:fs/promises";

async function listFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((name) => !name.startsWith("."));
  } catch {
    return [];
  }
}

async function main() {
  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error("Set FIREBASE_STORAGE_BUCKET before uploading.");
  }

  const publicFiles = await listFiles(publicRoot());
  const originalFiles = await listFiles(originalsRoot());

  console.log(`Uploading ${publicFiles.length} public files…`);
  for (const name of publicFiles) {
    const data = await readFile(path.join(publicRoot(), name));
    await writePublicFile(name, data);
    console.log("  public/", name);
  }

  console.log(`Uploading ${originalFiles.length} originals…`);
  for (const name of originalFiles) {
    const data = await readFile(path.join(originalsRoot(), name));
    await writeOriginalFile(name, data);
    console.log("  originals/", name);
  }

  await flushDatabase();
  console.log("Catalog database snapshot uploaded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
