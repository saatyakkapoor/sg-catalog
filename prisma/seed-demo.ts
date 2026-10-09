/**
 * Optional: fills the catalog with sample categories, designs and a placeholder
 * logo so you can see the whole site working before adding real products.
 *
 *   npm run db:seed:demo
 *
 * Everything it creates can be deleted from the admin panel. Re-running it is
 * safe: existing design numbers are skipped.
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { createLogoMedia, createProductMedia } from "../lib/images.server";
import { SETTINGS_ID } from "../lib/settings";
import { productSlug, slugify } from "../lib/slug";

const prisma = new PrismaClient();

const PALETTES = [
  ["#7b1e3b", "#e4b7c2"],
  ["#1f3d5c", "#bcd3e6"],
  ["#2f5d3a", "#cfe3c8"],
  ["#5c3a1f", "#e6d3bc"],
  ["#3c2f52", "#d6cce6"],
  ["#5c521f", "#e6e0bc"],
];

async function makeLogo(): Promise<Buffer> {
  const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <circle cx="256" cy="256" r="230" fill="none" stroke="#1a1a1a" stroke-width="18"/>
    <text x="256" y="300" text-anchor="middle" font-family="Georgia, serif"
          font-size="200" font-weight="bold" fill="#1a1a1a">SG</text>
    <text x="256" y="372" text-anchor="middle" font-family="Helvetica, sans-serif"
          font-size="44" letter-spacing="8" fill="#1a1a1a">DESIGNS</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function makeProductPhoto(
  index: number,
  label: string
): Promise<Buffer> {
  const [dark, light] = PALETTES[index % PALETTES.length];
  const svg = `<svg width="1200" height="1500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${light}"/>
        <stop offset="100%" stop-color="${dark}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="1500" fill="url(#bg)"/>
    <circle cx="600" cy="620" r="300" fill="${light}" fill-opacity="0.35"/>
    <rect x="300" y="960" width="600" height="360" rx="28" fill="${light}" fill-opacity="0.25"/>
    <text x="600" y="640" text-anchor="middle" font-family="Georgia, serif"
          font-size="86" fill="#ffffff" fill-opacity="0.92">${label}</text>
    <text x="600" y="1160" text-anchor="middle" font-family="Helvetica, sans-serif"
          font-size="40" letter-spacing="6" fill="#ffffff" fill-opacity="0.8">SAMPLE PHOTO</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function makeCategoryCover(
  index: number,
  label: string
): Promise<Buffer> {
  const [dark, light] = PALETTES[index % PALETTES.length];
  const svg = `<svg width="1400" height="1050" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="${dark}"/>
        <stop offset="100%" stop-color="${light}"/>
      </linearGradient>
    </defs>
    <rect width="1400" height="1050" fill="url(#bg)"/>
    <circle cx="1120" cy="220" r="260" fill="${light}" fill-opacity="0.3"/>
    <rect x="120" y="640" width="520" height="300" rx="24" fill="${light}" fill-opacity="0.22"/>
    <text x="700" y="540" text-anchor="middle" font-family="Georgia, serif"
          font-size="92" fill="#ffffff" fill-opacity="0.92">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

function toFile(buffer: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(buffer)], name, { type });
}

const CATEGORIES = [
  {
    name: "New Designs",
    description: "The latest additions to our collection, updated every week.",
  },
  {
    name: "Premium Collection",
    description: "Our finest handcrafted pieces, made to order.",
  },
  {
    name: "Everyday Range",
    description: "Comfortable, durable designs for daily use.",
  },
];

const PRODUCTS = [
  {
    designNumber: "1001",
    name: "Rose Zari Border Design",
    category: "New Designs",
    tags: ["rose", "zari", "wedding"],
    specs: [
      { label: "Material", value: "Pure silk with zari border" },
      { label: "Length", value: "6.3 metres" },
    ],
    description:
      "A soft rose base with a hand-woven zari border. Finished with a matching blouse piece.",
  },
  {
    designNumber: "1002",
    name: "Midnight Blue Weave",
    category: "New Designs",
    tags: ["blue", "weave", "festive"],
    specs: [{ label: "Material", value: "Cotton silk blend" }],
    description: "Deep blue handloom weave with a subtle temple border.",
  },
  {
    designNumber: "1015",
    name: "Emerald Heritage Drape",
    category: "Premium Collection",
    tags: ["emerald", "heritage", "bridal"],
    specs: [
      { label: "Material", value: "Kanjivaram silk" },
      { label: "Weight", value: "780 g" },
      { label: "Finish", value: "Hand-finished tassels" },
    ],
    description:
      "An heirloom-grade emerald drape woven over four weeks by a single artisan.",
  },
  {
    designNumber: "1025",
    name: "Golden Sandalwood Classic",
    category: "Premium Collection",
    tags: ["gold", "classic", "sandalwood"],
    specs: [{ label: "Material", value: "Tussar silk" }],
    description:
      "Warm sandalwood tones with a fine gold checked body and contrast pallu.",
  },
  {
    designNumber: "2004",
    name: "Lavender Everyday Cotton",
    category: "Everyday Range",
    tags: ["lavender", "cotton", "daily"],
    specs: [{ label: "Material", value: "Mercerised cotton" }],
    description: "Light, breathable cotton in a calm lavender shade.",
  },
  {
    designNumber: "2011",
    name: "Olive Handloom Stripe",
    category: "Everyday Range",
    tags: ["olive", "stripe", "handloom"],
    specs: [{ label: "Material", value: "Handloom cotton" }],
    description: "Fine olive stripes on an unbleached handloom base.",
  },
];

async function main() {
  // A logo must exist first, otherwise product uploads have nothing to stamp.
  let settings = await prisma.settings.findUnique({
    where: { id: SETTINGS_ID },
    include: { logo: true },
  });
  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: SETTINGS_ID },
      include: { logo: true },
    });
  }

  if (!settings.logoId) {
    const logo = await createLogoMedia(
      toFile(await makeLogo(), "sg-designs-logo.png", "image/png")
    );
    settings = await prisma.settings.update({
      where: { id: SETTINGS_ID },
      data: {
        logoId: logo.id,
        businessName: "SG Designs",
        tagline: "Handcrafted since 1998",
        siteTitle: "Design Catalog",
        siteDescription:
          "Browse our full range of handcrafted designs and enquire on WhatsApp for prices.",
        whatsappNumber: settings.whatsappNumber || "919876543210",
        address: "Shop 12, Silk Market Road\nBengaluru, Karnataka 560002",
        phone: "+91 98765 43210",
        email: "hello@sgdesigns.example",
        footerText:
          "A family-run design house creating handcrafted pieces for three generations.",
        latitude: 12.9716,
        longitude: 77.5946,
      },
      include: { logo: true },
    });
    console.log("Created brand logo and filled in sample business details.");
  }

  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const slug = slugify(category.name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      categoryIds.set(category.name, existing.id);
      // Older demo data had no cover images, so fill the gap without touching
      // anything else the admin may have edited.
      if (!existing.imageId) {
        const cover = await createProductMedia(
          toFile(
            await makeCategoryCover(index, category.name),
            `${slug}-cover.jpg`,
            "image/jpeg"
          ),
          { alt: `${category.name} collection` }
        );
        await prisma.category.update({
          where: { id: existing.id },
          data: { imageId: cover.id },
        });
        console.log(`Added a cover image to category: ${category.name}`);
      }
      continue;
    }
    const cover = await createProductMedia(
      toFile(
        await makeCategoryCover(index, category.name),
        `${slug}-cover.jpg`,
        "image/jpeg"
      ),
      { alt: `${category.name} collection` }
    );
    const created = await prisma.category.create({
      data: {
        name: category.name,
        slug,
        description: category.description,
        imageId: cover.id,
        sortOrder: index + 1,
        isPublished: true,
      },
    });
    categoryIds.set(category.name, created.id);
    console.log(`Created category: ${category.name}`);
  }

  for (const [index, product] of PRODUCTS.entries()) {
    const existing = await prisma.product.findUnique({
      where: { designNumber: product.designNumber },
    });
    if (existing) {
      console.log(`Design No. ${product.designNumber} already exists — skipped.`);
      continue;
    }

    const primary = await createProductMedia(
      toFile(
        await makeProductPhoto(index, `Design ${product.designNumber}`),
        `design-${product.designNumber}.jpg`,
        "image/jpeg"
      ),
      { alt: `${product.name}, design number ${product.designNumber}` }
    );
    const secondary = await createProductMedia(
      toFile(
        await makeProductPhoto(index + 3, `Detail ${product.designNumber}`),
        `design-${product.designNumber}-detail.jpg`,
        "image/jpeg"
      ),
      { alt: `${product.name} close-up detail` }
    );

    await prisma.product.create({
      data: {
        designNumber: product.designNumber,
        name: product.name,
        slug: productSlug(product.designNumber, product.name),
        description: product.description,
        categoryId: categoryIds.get(product.category) ?? null,
        tags: JSON.stringify(product.tags),
        specs: JSON.stringify(product.specs),
        sortOrder: index + 1,
        isPublished: true,
        images: {
          create: [
            { mediaId: primary.id, sortOrder: 0, isPrimary: true },
            { mediaId: secondary.id, sortOrder: 1, isPrimary: false },
          ],
        },
      },
    });
    console.log(`Created Design No. ${product.designNumber} with 2 watermarked images.`);
  }

  console.log("\nDemo data ready. Open http://localhost:3000 to see it.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
