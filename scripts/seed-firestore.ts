import { readFile } from "node:fs/promises";
import path from "node:path";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { PrismaClient } from "@prisma/client";

const projectId = "unlisted-shares-india";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

const prisma = new PrismaClient();
const db = getFirestore();
const auth = getAuth();

function fileToDataUrl(absolutePath: string, mimeType: string, bytes: Buffer): string {
  const mime = mimeType || (absolutePath.endsWith(".png") ? "image/png" : "image/webp");
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function readPublic(relative: string | null | undefined): Promise<string | null> {
  if (!relative) return null;
  const absolute = path.join(process.cwd(), "storage/public", relative);
  try {
    const bytes = await readFile(absolute);
    const mime = relative.endsWith(".png") ? "image/png" : "image/webp";
    return fileToDataUrl(absolute, mime, bytes);
  } catch {
    return null;
  }
}

async function main() {
  const [settings, categories, products, media] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "site" } }),
    prisma.category.findMany(),
    prisma.product.findMany({
      include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] } },
    }),
    prisma.media.findMany(),
  ]);

  const batch = db.batch();

  for (const item of media) {
    let variants: Record<string, string> = {};
    try {
      variants = JSON.parse(item.variants || "{}") as Record<string, string>;
    } catch {
      variants = {};
    }
    const resolved: Record<string, string> = {};
    for (const [key, value] of Object.entries(variants)) {
      const dataUrl = await readPublic(value);
      if (dataUrl) resolved[key] = dataUrl;
    }
    const original = item.originalPath
      ? await readPublic(
          // originals live in storage/originals; fall back to a public variant
          null
        )
      : null;
    batch.set(db.collection("sg_media").doc(item.id), {
      filename: item.filename,
      originalName: item.originalName,
      mimeType: item.mimeType,
      kind: item.kind,
      width: item.width,
      height: item.height,
      bytes: item.bytes,
      variants: JSON.stringify(resolved),
      alt: item.alt,
      originalData: resolved.detail ?? resolved.card ?? original,
      createdAt: item.createdAt.toISOString(),
    });
  }

  for (const category of categories) {
    batch.set(db.collection("sg_categories").doc(category.id), {
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageId: category.imageId,
      sortOrder: category.sortOrder,
      isPublished: category.isPublished,
    });
  }

  for (const product of products) {
    batch.set(db.collection("sg_products").doc(product.id), {
      designNumber: product.designNumber,
      name: product.name,
      slug: product.slug,
      description: product.description,
      tags: JSON.parse(product.tags || "[]"),
      specs: JSON.parse(product.specs || "[]"),
      categoryId: product.categoryId,
      imageIds: product.images.map((image) => image.mediaId),
      sortOrder: product.sortOrder,
      isPublished: product.isPublished,
      createdAt: product.createdAt.toISOString(),
    });
  }

  if (settings) {
    const { id, updatedAt, logo, watermarkLogo, ...rest } = settings as typeof settings & {
      logo?: unknown;
      watermarkLogo?: unknown;
    };
    batch.set(db.collection("sg_settings").doc("site"), {
      ...rest,
      logoId: settings.logoId,
      watermarkLogoId: settings.watermarkLogoId,
    });
  }

  await batch.commit();

  const email = process.env.ADMIN_EMAIL || "admin@sgcatalog.local";
  const password = process.env.ADMIN_PASSWORD || "Shagun@231001";
  try {
    await auth.getUserByEmail(email);
    console.log("Admin auth user already exists:", email);
  } catch {
    await auth.createUser({
      email,
      password,
      displayName: process.env.ADMIN_NAME || "Shagun",
      emailVerified: true,
    });
    console.log("Created admin auth user:", email);
  }

  console.log(
    `Seeded ${media.length} images, ${categories.length} categories, ${products.length} products.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
