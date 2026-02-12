import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteImageVariants } from '@/lib/imageCleanup';
import { requireAdmin } from '@/lib/admin-auth';

function toIntArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(
      v
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0)
    )
  );
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

async function ensureUniqueSlug(base: string, excludeId?: number) {
  let slug = base || 'product';
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.product.findFirst({
      where: excludeId
        ? { slug, NOT: { id: excludeId } }
        : { slug },
      select: { id: true },
    });
    if (!found) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

async function getUniqueBrandSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug || 'brand';
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!found) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
}

async function ensureBrandByName(brandNameRaw: unknown) {
  const name = String(brandNameRaw ?? '').trim();
  if (!name) return null;
  const existing = await prisma.brand.findUnique({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing;
  const baseSlug = slugify(name);
  const slug = await getUniqueBrandSlug(baseSlug);
  return prisma.brand.create({
    data: { name, slug },
    select: { id: true },
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const params = await ctx.params;
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        categories: {
          select: {
            category: { select: { id: true, name: true, slug: true, parentId: true } },
          },
        },
        attributes: { include: { value: { include: { group: true } } } },
      },
    });
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, product });
  } catch (e) {
    console.error('admin/products/[id] GET error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const params = await ctx.params;
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const {
      name,
      brandName,
      description,
      price,
      costPrice,
      oldPrice,
      imageUrl,
      isActive,
      categoryIds,
      attributeValueIds,
    } = (body || {}) as {
      name?: string;
      brandName?: string | null;
      description?: string;
      price?: number;
      costPrice?: number;
      oldPrice?: number | null;
      imageUrl?: string | null;
      isActive?: boolean;
      categoryIds?: number[];
      attributeValueIds?: number[];
    };

    if (!name || typeof price !== 'number' || typeof costPrice !== 'number') {
      return NextResponse.json(
        { error: 'name, price и costPrice обязательны' },
        { status: 400 },
      );
    }

    const base = slugify(name);
    const slug = await ensureUniqueSlug(base, id);

    const brand = await ensureBrandByName(brandName);
    
    // Безопасная обработка attributeValueIds
    const attrValueIds: number[] = Array.isArray(body.attributeValueIds)
      ? toIntArray(body.attributeValueIds)
      : [];

    // Получаем старый товар для проверки изменения imageUrl
    const oldProduct = await prisma.product.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    const oldImageUrl = oldProduct?.imageUrl;
    const newImageUrl = imageUrl || null;
    const imageUrlChanged = oldImageUrl !== newImageUrl;

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name,
          description: description || '',
          price: Math.round(price),
          costPrice: Math.round(costPrice),
          oldPrice: oldPrice == null ? null : Math.round(oldPrice),
          imageUrl: newImageUrl,
          isActive: isActive ?? true,
          slug,
          brandId: brand ? brand.id : null,
        },
      });

      if (Array.isArray(body.categoryIds)) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        const catIds = toIntArray(categoryIds);
        if (catIds.length) {
          await tx.productCategory.createMany({
            data: catIds.map((cid) => ({ productId: id, categoryId: cid })),
          });
        }
      }

      // Полностью пересобираем атрибуты
      await tx.productAttribute.deleteMany({ where: { productId: id } });
      
      // Создаём новые связи ТОЛЬКО если есть значения
      if (attrValueIds.length > 0) {
        await tx.productAttribute.createMany({
          data: attrValueIds.map((valueId) => ({
            productId: id,
            valueId,
          })),
        });
      }
    });

    // Удаляем старые файлы изображений, если imageUrl изменился
    if (imageUrlChanged && oldImageUrl) {
      try {
        await deleteImageVariants(oldImageUrl);
      } catch (cleanupError) {
        // Логируем ошибку, но не прерываем выполнение
        console.error('Error cleaning up old image files:', cleanupError);
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        categories: { include: { category: true } },
        attributes: { include: { value: { include: { group: true } } } },
      },
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (e: any) {
    console.error('UPDATE PRODUCT ERROR:', e);
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера',
        details: process.env.NODE_ENV !== 'production' ? (e?.message || String(e)) : undefined,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const params = await ctx.params;
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }

    // Получаем товар перед удалением, чтобы удалить файлы изображений
    const product = await prisma.product.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    // Удаляем товар из базы
    await prisma.product.delete({ where: { id } });

    // Удаляем файлы изображений
    if (product?.imageUrl) {
      try {
        await deleteImageVariants(product.imageUrl);
      } catch (cleanupError) {
        // Логируем ошибку, но не прерываем выполнение
        console.error('Error cleaning up image files on delete:', cleanupError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('admin/products/[id] DELETE error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}


