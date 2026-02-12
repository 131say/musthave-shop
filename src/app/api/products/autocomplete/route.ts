import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get('q') || '').trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ ok: true, suggestions: [] });
    }

    // Разбиваем запрос на отдельные слова
    const searchTerms = query.trim().split(/\s+/).filter(Boolean);
    
    const whereCondition: any = {
      isActive: true,
    };
    
    if (searchTerms.length > 0) {
      // Ищем товары, где хотя бы одно слово найдено в любом из полей
      whereCondition.OR = searchTerms.flatMap(term => [
        { name: { contains: term } },
        { description: { contains: term } },
        // Также ищем в атрибутах (например, тип кожи)
        {
          attributes: {
            some: {
              value: {
                name: { contains: term }
              }
            }
          }
        },
        // Ищем в названии бренда
        {
          brand: {
            name: { contains: term }
          }
        }
      ]);
    }

    const products = await prisma.product.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        slug: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Ограничиваем до 10 подсказок
    });

    const suggestions = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brandName: p.brand?.name || '',
    }));

    return NextResponse.json({ ok: true, suggestions });
  } catch (error) {
    console.error('autocomplete error', error);
    return NextResponse.json(
      { ok: false, error: 'Ошибка поиска' },
      { status: 500 }
    );
  }
}

