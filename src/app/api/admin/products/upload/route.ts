import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Sizes based on your UI:
// - admin list: 48x48 (we store 200x200 for crispness)
// - catalog cards: ~200–400 square (we store 400x400)
// - product page: max-w-6xl ~1152px (we store 1200px on long side)
const VARIANTS = {
  thumb: { w: 200, h: 200, fit: "cover" as const, quality: 80 },
  card: { w: 400, h: 400, fit: "cover" as const, quality: 82 },
  large: { w: 1200, h: 1200, fit: "inside" as const, quality: 85 },
};

function safeExtFromMime(mime: string, keepPng: boolean) {
  if (keepPng) return "png";
  // normalize everything else to jpeg for predictable size + caching
  return "jpg";
}

// На Vercel и других serverless-платформах диск только для чтения — загрузка в public/ невозможна
const READONLY_FS_HINT =
  "На этом хостинге загрузка файлов недоступна. Используйте поле «Ссылка на изображение» ниже и вставьте прямую ссылку на картинку (например, с imgur.com, cloudinary.com или вашего сайта).";

export async function POST(req: Request) {
  try {
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;

    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        { error: READONLY_FS_HINT, code: "READONLY_FS" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 5MB" },
        { status: 400 }
      );
    }

    const imagesDir = path.join(process.cwd(), "public", "images", "products");
    await fs.mkdir(imagesDir, { recursive: true });

    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Detect alpha to avoid ruining transparent PNGs
    let meta;
    try {
      meta = await sharp(buffer, { failOn: "none" }).metadata();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid image file. Please upload a valid JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    if (!meta || !meta.format) {
      return NextResponse.json(
        { error: "Could not read image metadata. Please upload a valid image file." },
        { status: 400 }
      );
    }

    const hasAlpha = !!meta.hasAlpha;
    const keepPng = file.type === "image/png" && hasAlpha;
    const ext = safeExtFromMime(file.type, keepPng);

    const originalSize = buffer.length;

    const outputs: Record<string, { url: string; size: number }> = {};

    const makePipeline = (variant: keyof typeof VARIANTS) => {
      const v = VARIANTS[variant];
      const s = sharp(buffer, { failOn: "none" })
        .rotate() // respect EXIF
        .resize({
          width: v.w,
          height: v.h,
          fit: v.fit,
          withoutEnlargement: true,
        });

      if (keepPng) {
        // keep transparency
        return s.png({ compressionLevel: 9, adaptiveFiltering: true });
      }

      // normalize JPEG/WebP/PNG(no alpha) -> JPEG
      return s.jpeg({
        quality: v.quality,
        progressive: true,
        mozjpeg: true,
      });
    };

    for (const variant of Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]) {
      const outName = `${baseName}-${variant}.${ext}`;
      const outPath = path.join(imagesDir, outName);
      const outBuf = await makePipeline(variant).toBuffer();
      await fs.writeFile(outPath, outBuf);
      outputs[variant] = {
        url: `/images/products/${outName}`,
        size: outBuf.length,
      };
    }

    const imageUrl = outputs.large.url; // default for DB (compatible with current schema)
    const finalSize = outputs.large.size;
    const compressed = finalSize < originalSize;

    return NextResponse.json({
      imageUrl,
      variants: {
        thumb: outputs.thumb.url,
        card: outputs.card.url,
        large: outputs.large.url,
      },
      originalSize,
      finalSize,
      compressed,
      keepPng,
    });
  } catch (e: any) {
    console.error("Upload error:", e);
    if (e?.code === "EROFS" || (e?.path && String(e.path).includes("/var/task"))) {
      return NextResponse.json(
        { error: READONLY_FS_HINT, code: "READONLY_FS" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
