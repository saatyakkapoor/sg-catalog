/**
 * Creates the first admin account and the single settings row.
 * Safe to re-run: existing records are left untouched.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME ?? "Store Admin";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env before seeding."
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists — leaving it unchanged.`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await bcrypt.hash(password, 12),
        role: "admin",
      },
    });
    console.log(`Created admin account: ${email}`);
  }

  const settings = await prisma.settings.findUnique({ where: { id: "site" } });
  if (settings) {
    console.log("Settings row already exists — leaving it unchanged.");
  } else {
    await prisma.settings.create({ data: { id: "site" } });
    console.log("Created default settings row.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
