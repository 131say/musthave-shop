// src/app/api/admin/products/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

function toIntArray(v: any): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // убираем спецсимволы
    .replace(/[\s_-]+/g, '-') // заменяем пробелы и подчёркивания на дефисы
    .replace(/^-+|-+$/g, ''); // убираем дефисы в начале и конце
}

async function getUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function getUniqueBrandSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.brand.findUnique({
      where: { slug },
    });

    if (!existing) return slug;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function ensureBrand(brandNameRaw: unknown) {
  const name = String(brandNameRaw ?? '').trim();
  if (!name) return null;

  const existingByName = await prisma.brand.findUnique({ where: { name } });
  if (existingByName) return existingByName;

  const baseSlug = generateSlug(name);
  const slug = await getUniqueBrandSlug(baseSlug || 'brand');
  return prisma.brand.create({ data: { name, slug } });
}

export async function GET(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const status = (url.searchParams.get('status') || 'ALL').trim();

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        { brand: { is: { name: { contains: q } } } },
      ];
    }

    if (status === 'ACTIVE') where.isActive = true;
    if (status === 'INACTIVE') where.isActive = false;

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: true,
        categories: { include: { category: true } },
        attributes: {
          include: {
            value: { include: { group: true } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, products });
  } catch (e) {
    console.error('admin/products GET error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const body = await req.json().catch(() => null);
    const {
      name,
      description,
      price,
      costPrice,
      brandName,
      oldPrice,
      imageUrl,
      isActive,
      categoryIds,
      attributeValueIds,
    } = (body || {}) as {
      name?: string;
      description?: string;
      price?: number;
      costPrice?: number;
      brandName?: string;
      oldPrice?: number | null;
      imageUrl?: string | null;
      isActive?: boolean;
      categoryIds?: number[];
      attributeValueIds?: number[];
    };

    // Валидация обязательных полей
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Название товара обязательно' },
        { status: 400 },
      );
    }

    // Проверка price и costPrice на валидность (не NaN, не Infinity, положительные)
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: 'Цена должна быть положительным числом' },
        { status: 400 },
      );
    }

    if (typeof costPrice !== 'number' || !Number.isFinite(costPrice) || costPrice <= 0) {
      return NextResponse.json(
        { error: 'Себестоимость должна быть положительным числом' },
        { status: 400 },
      );
    }

    let baseSlug = generateSlug(name);
    // Если slug получился пустым, используем fallback
    if (!baseSlug || baseSlug.trim().length === 0) {
      baseSlug = 'product-' + Date.now();
    }

    const slug = await getUniqueSlug(baseSlug);
    if (!slug || slug.trim().length === 0) {
      return NextResponse.json(
        { error: 'Не удалось создать уникальный идентификатор для товара' },
        { status: 500 },
      );
    }

    // Валидация oldPrice если указан
    let validatedOldPrice: number | null = null;
    if (oldPrice != null) {
      if (typeof oldPrice !== 'number' || !Number.isFinite(oldPrice) || oldPrice <= 0) {
        return NextResponse.json(
          { error: 'Старая цена должна быть положительным числом' },
          { status: 400 },
        );
      }
      validatedOldPrice = Math.round(oldPrice);
    }

    const brand = await ensureBrand(brandName);
    const catIds = toIntArray(categoryIds);
    
    // Безопасная обработка attributeValueIds
    const attrValueIds: number[] = Array.isArray(body.attributeValueIds)
      ? toIntArray(body.attributeValueIds)
      : [];

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        brandId: brand?.id ?? null,
        description: description ? description.trim() : '',
        price: Math.round(price),
        costPrice: Math.round(costPrice),
        oldPrice: validatedOldPrice,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        isActive: isActive ?? true,
        categories: catIds.length
          ? {
              create: catIds.map((categoryId) => ({
                categoryId,
              })),
            }
          : undefined,
      },
    });

    // Создаём связи с атрибутами ТОЛЬКО если есть значения
    // SQLite не поддерживает skipDuplicates, поэтому проверяем существование перед созданием
    if (attrValueIds.length > 0) {
      // Проверяем, какие связи уже существуют
      const existingAttrs = await prisma.productAttribute.findMany({
        where: {
          productId: product.id,
          valueId: { in: attrValueIds },
        },
        select: { valueId: true },
      });

      const existingValueIds = new Set(existingAttrs.map((a) => a.valueId));
      const newValueIds = attrValueIds.filter((id) => !existingValueIds.has(id));

      // Создаём только новые связи
      if (newValueIds.length > 0) {
        await prisma.productAttribute.createMany({
          data: newValueIds.map((valueId) => ({
            productId: product.id,
            valueId,
          })),
        });
      }
    }

    const full = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        brand: true,
        categories: { include: { category: true } },
        attributes: { include: { value: { include: { group: true } } } },
      },
    });

    return NextResponse.json({ ok: true, product: full });
  } catch (e: any) {
    console.error('admin/products POST error', e);
    
    // Возвращаем более детальное сообщение об ошибке для отладки
    const errorMessage = e?.message || 'Внутренняя ошибка сервера';
    const errorCode = e?.code || 'UNKNOWN_ERROR';
    
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        code: process.env.NODE_ENV === 'development' ? errorCode : undefined,
      },
      { status: 500 },
    );
  }
}


