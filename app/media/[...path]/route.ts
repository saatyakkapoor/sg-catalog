import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { contentTypeFor, publicRoot, resolveWithin } from "@/lib/storage";

/**
 * Serves files from the *public* storage directory only.
 *
 * Originals live in a sibling directory that this route can never resolve into
 * (`resolveWithin` rejects traversal), so unwatermarked masters are not
 * reachable over HTTP.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  const relativePath = (segments ?? []).map(decodeURIComponent).join("/");

  if (!relativePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  let absolutePath: string;
  try {
    absolutePath = resolveWithin(publicRoot(), relativePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(absolutePath);
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(absolutePath),
        "Content-Length": String(file.byteLength),
        // Filenames carry a random token and change whenever an image is
        // reprocessed, so responses can be cached hard.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
