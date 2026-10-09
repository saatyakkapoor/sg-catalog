import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { originalExists, readOriginalFile } from "@/lib/storage";
import { applyWatermark, clampWatermarkConfig } from "@/lib/watermark";

/**
 * Renders a sample image with the requested watermark settings so the admin can
 * see the effect before saving. Admin-only; nothing here touches stored files.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const logoId = url.searchParams.get("logoId") ?? "";
  const config = clampWatermarkConfig({
    opacity: Number.parseFloat(url.searchParams.get("opacity") ?? "0.18"),
    scale: Number.parseFloat(url.searchParams.get("scale") ?? "0.22"),
    rotation: Number.parseFloat(url.searchParams.get("rotation") ?? "-30"),
    repetitions: Number.parseFloat(url.searchParams.get("repetitions") ?? "4"),
  });

  // Neutral checkered sample so the watermark's visibility is easy to judge on
  // both light and dark areas.
  const width = 900;
  const height = 700;
  const sample = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 226, g: 217, b: 202 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
             <defs>
               <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                 <stop offset="0%" stop-color="#f7f2ea"/>
                 <stop offset="55%" stop-color="#cfc3b0"/>
                 <stop offset="100%" stop-color="#3a352d"/>
               </linearGradient>
             </defs>
             <rect width="${width}" height="${height}" fill="url(#g)"/>
             <text x="${width / 2}" y="${height / 2}" text-anchor="middle"
                   font-family="Georgia, serif" font-size="34" fill="#6b665c">
               Sample product photo
             </text>
           </svg>`
        ),
      },
    ])
    .png()
    .toBuffer();

  if (!logoId) {
    return imageResponse(await sharp(sample).webp({ quality: 80 }).toBuffer());
  }

  const logo = await prisma.media.findUnique({ where: { id: logoId } });
  if (!logo?.originalPath || !(await originalExists(logo.originalPath))) {
    return imageResponse(await sharp(sample).webp({ quality: 80 }).toBuffer());
  }

  try {
    const watermarked = await applyWatermark(sample, {
      logo: await readOriginalFile(logo.originalPath),
      ...config,
    });
    return imageResponse(await sharp(watermarked).webp({ quality: 82 }).toBuffer());
  } catch {
    return imageResponse(await sharp(sample).webp({ quality: 80 }).toBuffer());
  }
}

function imageResponse(buffer: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "no-store",
    },
  });
}
