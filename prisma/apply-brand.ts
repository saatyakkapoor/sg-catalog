/**
 * Applies Shagun Digital branding, WhatsApp, maps, watermark logo, and the
 * owner password from .env onto the existing database.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createLogoMedia, reprocessAllProductMedia } from "../lib/images.server";

const prisma = new PrismaClient();
const SETTINGS_ID = "site";

function toFile(buffer: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(buffer)], name, { type });
}

async function main() {
  const logoPath = path.join(process.cwd(), "public/brand/logo.png");
  const logo = await createLogoMedia(
    toFile(readFileSync(logoPath), "shagun-digital-logo.png", "image/png")
  );

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {},
  });

  await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: {
      businessName: "Shagun Digital",
      tagline: "शगुन का साथ, भरोसे के साथ",
      siteTitle: "Print Design Catalogue",
      siteDescription:
        "Browse Shagun Non-wovens Digital print designs and enquire on WhatsApp.",
      logoId: logo.id,
      watermarkLogoId: logo.id,
      watermarkEnabled: true,
      whatsappNumber: "917406359443",
      whatsappGeneralMessage:
        "Hello, I would like to make an enquiry regarding your designs.",
      whatsappProductMessage:
        "Hello, I am interested in {productName}.\n\nDesign No.: {designNumber}\n\nPlease share the price and details.",
      phone: "+91 74063 59443",
      email: "",
      address: "A.S. Exports, Mirzapur",
      mapLink: "https://maps.app.goo.gl/w8qwe8u4fFPEpF599",
      mapEmbedUrl:
        "https://www.google.com/maps?q=25.1422424,82.5462154&z=17&output=embed",
      latitude: 25.1422424,
      longitude: 82.5462154,
      footerText:
        "Shagun Non-wovens Digital — print designs, numbered for easy enquiry.",
    },
  });

  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: process.env.ADMIN_NAME ?? "Shagun",
        passwordHash,
        role: "admin",
      },
      update: {
        passwordHash,
        name: process.env.ADMIN_NAME ?? "Shagun",
      },
    });
  }

  const reprocessed = await reprocessAllProductMedia();
  console.log(
    "Shagun branding applied. Logo id:",
    logo.id,
    "re-watermarked:",
    reprocessed.updated
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
