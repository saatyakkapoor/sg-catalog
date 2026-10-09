import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getStorage, type Storage } from "firebase-admin/storage";

export function storageBucketName(): string {
  return (
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    ""
  );
}

export function usesCloudStorage(): boolean {
  return storageBucketName().length > 0;
}

export function getAdminStorage(): Storage {
  if (getApps().length === 0) {
    const bucket = storageBucketName();
    initializeApp({
      credential: applicationDefault(),
      storageBucket: bucket || undefined,
    });
  }
  return getStorage();
}

export function publicObjectPath(relativePath: string): string {
  return `public/${relativePath.replace(/^\/+/, "")}`;
}

export function originalObjectPath(relativePath: string): string {
  return `originals/${relativePath.replace(/^\/+/, "")}`;
}

/** Public, cacheable URL for a watermarked file. */
export function publicFileUrl(relativePath: string): string {
  const bucket = storageBucketName();
  const object = publicObjectPath(relativePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(object)}?alt=media`;
}
