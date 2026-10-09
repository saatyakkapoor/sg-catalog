/**
 * Pure media helpers. Safe to import from client components — no `sharp`, no
 * filesystem access.
 */

export type MediaVariants = {
  detail?: string;
  card?: string;
  thumb?: string;
};

export type MediaLike = {
  id: string;
  filename: string;
  mimeType: string;
  kind: string;
  width: number;
  height: number;
  variants: string;
  alt?: string | null;
  originalName?: string;
};

export const MEDIA_KIND = {
  product: "product",
  logo: "logo",
} as const;

export function parseVariants(raw: string | null | undefined): MediaVariants {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const { detail, card, thumb } = parsed as Record<string, unknown>;
    return {
      detail: typeof detail === "string" ? detail : undefined,
      card: typeof card === "string" ? card : undefined,
      thumb: typeof thumb === "string" ? thumb : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Public URL for a watermarked file.
 * Cloudinary (optional, free) → Firebase Storage → same-origin /media
 * (Firebase Hosting static files, also free).
 */
export function mediaUrl(relativePath: string): string {
  if (/^(https?:|data:|blob:)/i.test(relativePath)) return relativePath;
  const cloud =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    "";
  if (cloud) {
    const id = `public/${relativePath.replace(/^\/+/, "")}`;
    return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${id}`;
  }
  const bucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    "";
  if (bucket) {
    const object = `public/${relativePath.replace(/^\/+/, "")}`;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(object)}?alt=media`;
  }
  return `/media/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export type MediaSize = "thumb" | "card" | "detail";

/**
 * Best available URL for the requested size, falling back up and then down so
 * a partially-processed image still renders something.
 */
export function mediaSrc(
  media: MediaLike | null | undefined,
  size: MediaSize = "card"
): string | null {
  if (!media) return null;
  const variants = parseVariants(media.variants);
  const order: MediaSize[] =
    size === "thumb"
      ? ["thumb", "card", "detail"]
      : size === "card"
        ? ["card", "detail", "thumb"]
        : ["detail", "card", "thumb"];

  for (const key of order) {
    const value = variants[key];
    if (value) return mediaUrl(value);
  }
  return null;
}

export function mediaAlt(
  media: MediaLike | null | undefined,
  fallback: string
): string {
  const alt = media?.alt?.trim();
  return alt && alt.length > 0 ? alt : fallback;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
