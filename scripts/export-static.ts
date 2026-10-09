import { spawn } from "node:child_process";
import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const stashDir = path.join(root, ".static-stash");
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://shagun-digital.web.app";

const stashItems = [
  "app/admin/_actions",
  "app/api",
  "app/media",
  "components/admin",
  "middleware.ts",
];

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function stashServerOnly(): Promise<void> {
  await rm(stashDir, { recursive: true, force: true });
  await mkdir(stashDir, { recursive: true });
  for (const item of stashItems) {
    const from = path.join(root, item);
    if (!(await exists(from))) continue;
    const to = path.join(stashDir, item);
    await mkdir(path.dirname(to), { recursive: true });
    await rename(from, to);
  }
}

async function restoreServerOnly(): Promise<void> {
  for (const item of stashItems) {
    const from = path.join(stashDir, item);
    if (!(await exists(from))) continue;
    const to = path.join(root, item);
    await mkdir(path.dirname(to), { recursive: true });
    await rename(from, to);
  }
  await rm(stashDir, { recursive: true, force: true });
}

async function copyPublicMedia(): Promise<void> {
  const src = path.join(root, "storage/public");
  const dest = path.join(root, "public/media");
  await rm(dest, { recursive: true, force: true });
  if (!(await exists(src))) return;
  await cp(src, dest, { recursive: true });
}

function run(
  command: string,
  args: string[],
  extraEnv: Record<string, string | undefined> = {}
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function main() {
  await copyPublicMedia();
  await stashServerOnly();
  try {
    await run("npx", ["prisma", "generate"]);
    await run("npx", ["next", "build"], {
      STATIC_EXPORT: "1",
      NEXT_PUBLIC_SITE_URL: siteUrl,
    });
  } finally {
    await restoreServerOnly();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
