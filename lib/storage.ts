import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  cloudinaryDestroy,
  cloudinaryDownload,
  cloudinaryUpload,
  cloudinaryUrl,
  usesCloudinary,
} from "@/lib/cloudinary";
import {
  getAdminStorage,
  originalObjectPath,
  publicFileUrl,
  publicObjectPath,
  storageBucketName,
  usesCloudStorage,
} from "@/lib/firebase-admin";

/**
 * Image storage, in order of preference:
 * 1. Cloudinary (free forever plan — no credit card)
 * 2. Firebase Storage (needs a Blaze billing account on new projects)
 * 3. Local disk (development + static Firebase Hosting export)
 */

function usesRemote(): boolean {
  return usesCloudinary() || usesCloudStorage();
}

export const ORIGINALS_DIR = "originals";
export const PUBLIC_DIR = "public";

export function storageRoot(): string {
  const configured = process.env.STORAGE_DIR?.trim() || "./storage";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

export function originalsRoot(): string {
  return path.join(storageRoot(), ORIGINALS_DIR);
}

export function publicRoot(): string {
  return path.join(storageRoot(), PUBLIC_DIR);
}

export async function ensureStorageDirs(): Promise<void> {
  if (usesRemote()) return;
  await fs.mkdir(originalsRoot(), { recursive: true });
  await fs.mkdir(publicRoot(), { recursive: true });
}

export function safeBaseName(originalName: string): string {
  const withoutExt = originalName.replace(/\.[^.]+$/, "");
  const slug = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "image";
}

export function uniqueToken(): string {
  return randomBytes(6).toString("hex");
}

export async function writePublicFile(
  relativePath: string,
  data: Buffer
): Promise<void> {
  if (usesCloudinary()) {
    await cloudinaryUpload(data, `public/${relativePath}`, contentTypeFor(relativePath));
    return;
  }
  if (usesCloudStorage()) {
    await getAdminStorage()
      .bucket()
      .file(publicObjectPath(relativePath))
      .save(data, {
        resumable: false,
        metadata: {
          contentType: contentTypeFor(relativePath),
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
    return;
  }
  const target = resolveWithin(publicRoot(), relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

export async function writeOriginalFile(
  relativePath: string,
  data: Buffer
): Promise<void> {
  if (usesCloudinary()) {
    await cloudinaryUpload(
      data,
      `originals/${relativePath}`,
      contentTypeFor(relativePath)
    );
    return;
  }
  if (usesCloudStorage()) {
    await getAdminStorage()
      .bucket()
      .file(originalObjectPath(relativePath))
      .save(data, {
        resumable: false,
        metadata: { contentType: contentTypeFor(relativePath) },
      });
    return;
  }
  const target = resolveWithin(originalsRoot(), relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

export async function readOriginalFile(relativePath: string): Promise<Buffer> {
  if (usesCloudinary()) {
    return cloudinaryDownload(`originals/${relativePath}`);
  }
  if (usesCloudStorage()) {
    const [buffer] = await getAdminStorage()
      .bucket()
      .file(originalObjectPath(relativePath))
      .download();
    return buffer;
  }
  return fs.readFile(resolveWithin(originalsRoot(), relativePath));
}

export async function originalExists(relativePath: string): Promise<boolean> {
  if (usesCloudinary()) {
    try {
      await cloudinaryDownload(`originals/${relativePath}`);
      return true;
    } catch {
      return false;
    }
  }
  if (usesCloudStorage()) {
    const [exists] = await getAdminStorage()
      .bucket()
      .file(originalObjectPath(relativePath))
      .exists();
    return exists;
  }
  try {
    return existsSync(resolveWithin(originalsRoot(), relativePath));
  } catch {
    return false;
  }
}

export async function deletePublicFile(relativePath: string): Promise<void> {
  if (usesCloudinary()) {
    await cloudinaryDestroy(`public/${relativePath}`);
    return;
  }
  if (usesCloudStorage()) {
    await getAdminStorage()
      .bucket()
      .file(publicObjectPath(relativePath))
      .delete({ ignoreNotFound: true });
    return;
  }
  await removeQuietly(resolveWithin(publicRoot(), relativePath));
}

export async function deleteOriginalFile(relativePath: string): Promise<void> {
  if (usesCloudinary()) {
    await cloudinaryDestroy(`originals/${relativePath}`);
    return;
  }
  if (usesCloudStorage()) {
    await getAdminStorage()
      .bucket()
      .file(originalObjectPath(relativePath))
      .delete({ ignoreNotFound: true });
    return;
  }
  await removeQuietly(resolveWithin(originalsRoot(), relativePath));
}

async function removeQuietly(absolutePath: string): Promise<void> {
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}

export function resolveWithin(root: string, relativePath: string): string {
  const normalizedRoot = path.resolve(root);
  const target = path.resolve(normalizedRoot, relativePath);
  if (target !== normalizedRoot && !target.startsWith(normalizedRoot + path.sep)) {
    throw new Error("Resolved path escapes the storage directory.");
  }
  return target;
}

export function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".webp":
      return "image/webp";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export function publicMediaUrl(relativePath: string): string {
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  if (usesCloudinary()) return cloudinaryUrl(`public/${relativePath}`);
  if (usesCloudStorage() || storageBucketName()) {
    return publicFileUrl(relativePath);
  }
  return `/media/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}
