import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypeByExt: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const inlinePlaceholderSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#f3f4f6"/>
  <rect x="90" y="90" width="420" height="420" rx="24" fill="#e5e7eb"/>
  <path d="M190 390l70-80 60 70 60-90 90 110H190z" fill="#cbd5e1"/>
  <circle cx="250" cy="250" r="34" fill="#cbd5e1"/>
  <text x="300" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#6b7280">Нет фото</text>
</svg>`;

async function readFileIfExists(p: string) {
  try {
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;

  const productsDir = path.join(process.cwd(), "public", "images", "products");

  // normalize + prevent path traversal
  const requested = (parts ?? []).join("/");
  const safeRel = path.posix.normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");

  const absTarget = path.join(productsDir, safeRel);
  const absTargetResolved = path.resolve(absTarget);
  const productsDirResolved = path.resolve(productsDir);

  if (!absTargetResolved.startsWith(productsDirResolved + path.sep) && absTargetResolved !== productsDirResolved) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const ext = path.extname(absTargetResolved).toLowerCase();
  const ct = contentTypeByExt[ext] || "application/octet-stream";

  const bytes = await readFileIfExists(absTargetResolved);
  if (bytes) {
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "no-store",
      },
    });
  }

  const placeholderPath = path.join(process.cwd(), "public", "images", "placeholder.svg");
  const ph = await readFileIfExists(placeholderPath);

  return new NextResponse(ph ?? Buffer.from(inlinePlaceholderSvg, "utf-8"), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
