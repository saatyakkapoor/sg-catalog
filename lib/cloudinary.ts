import { createHash } from "node:crypto";

export function cloudinaryCloudName(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    ""
  );
}

export function usesCloudinary(): boolean {
  return Boolean(
    cloudinaryCloudName() &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function cloudinaryUrl(publicId: string): string {
  const cloud = cloudinaryCloudName();
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto/${publicId}`;
}

function signature(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + secret).digest("hex");
}

export async function cloudinaryUpload(
  data: Buffer,
  publicId: string,
  mimeType: string
): Promise<string> {
  const cloud = cloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  const timestamp = Math.round(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(data)], { type: mimeType }));
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("public_id", publicId);
  form.set("signature", signature(params, apiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    { method: "POST", body: form }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary upload failed: ${text.slice(0, 200)}`);
  }
  const json = (await response.json()) as { public_id: string };
  return json.public_id;
}

export async function cloudinaryDestroy(publicId: string): Promise<void> {
  const cloud = cloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  const timestamp = Math.round(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature: signature(params, apiSecret),
  });
  await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, {
    method: "POST",
    body,
  });
}

export async function cloudinaryDownload(publicId: string): Promise<Buffer> {
  const response = await fetch(cloudinaryUrl(publicId));
  if (!response.ok) {
    throw new Error(`Cloudinary download failed for ${publicId}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
