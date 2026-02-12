import { prisma } from '@/lib/prisma';
import CatalogClient from './CatalogClient';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CatalogSearchParams = {
  q?: string;
  min?: string;
  max?: string;
  sale?: string;
  brands?: string;
  categories?: string;
  skin?: string;
  goals?: string;
  actives?: string;
  scenarioId?: string;
  assist?: string;
};

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: CatalogSearchParams | Promise<CatalogSearchParams>;
}) {
  const sp = (await searchParams) || {};
  const q = (sp.q || '').trim();
  const min = Number.isFinite(Number(sp.min)) ? Number(sp.min) : undefined;
  const max = Number.isFinite(Number(sp.max)) ? Number(sp.max) : undefined;
  const sale = sp.sale === '1';

  const selectedBrandSlugs = (sp.brands || '')
    .split(',')
    .map(s => safeDecode(s.trim()))
    .filter(Boolean);

  const selectedCategorySlugs = (sp.categories || '')
    .split(',')
    .map(s => safeDecode(s.trim()))
    .filter(Boolean);

  const selectedSkinSlugs = (sp.skin || '')
    .split(',')
    .map(s => safeDecode(s.trim()))
    .filter(Boolean);

  const selectedGoalsSlugs = (sp.goals || '')
    .split(',')
    .map(s => safeDecode(s.trim()))
    .filter(Boolean);

  const selectedActivesSlugs = (sp.actives || '')
    .split(',')
    .map(s => safeDecode(s.trim()))
    .filter(Boolean);

  // Динамически собираем все параметры атрибутов из URL
  // Поддерживаем все группы атрибутов, не только skin/goals/actives
  const attributeParams: Record<string, string[]> = {};
  if (selectedSkinSlugs.length > 0) attributeParams['skin-type'] = selectedSkinSlugs;
  if (selectedGoalsSlugs.length > 0) attributeParams['goals'] = selectedGoalsSlugs;
  if (selectedActivesSlugs.length > 0) attributeParams['actives'] = selectedActivesSlugs;
  
  // Обрабатываем остальные параметры атрибутов из URL
  for (const [key, value] of Object.entries(sp)) {
    if (key && typeof value === 'string' && !['q', 'min', 'max', 'sale', 'brands', 'categories', 'skin', 'goals', 'actives', 'scenarioId', 'assist'].includes(key)) {
      // Это может быть параметр атрибута (например, spf, line, volume и т.д.)
      const slugs = value.split(',').map(s => safeDecode(s.trim())).filter(Boolean);
      if (slugs.length > 0) {
        attributeParams[key] = slugs;
      }
    }
  }

  const where: any = {
    isActive: true,
  };

  // Attribute filters - динамически обрабатываем все группы атрибутов
  const attrSlugGroups: { groupSlug: string; slugs: string[] }[] = Object.entries(attributeParams).map(([groupSlug, slugs]) => ({
    groupSlug,
    slugs
  })).filter(x => x.slugs.length > 0);

  // Логирование для отладки
  if (selectedActivesSlugs.length > 0) {
    console.log('[Catalog] Выбранные активы (slugs):', selectedActivesSlugs);
    console.log('[Catalog] Группы атрибутов для фильтрации:', attrSlugGroups);
  }

  // Собираем все условия поиска
  const searchConditions: any[] = [];

  if (q) {
    // Разбиваем запрос на отдельные слова для более гибкого поиска
    const searchTerms = q.trim().split(/\s+/).filter(Boolean);
    
    if (searchTerms.length > 0) {
      // Для каждого слова ищем в разных полях
      // Используем AND, чтобы все слова были найдены (хотя бы одно вхождение каждого слова)
      const textSearchConditions = searchTerms.map(term => {
        // Нормализуем термин для поиска (приводим к нижнему регистру для slug)
        const termLower = term.toLowerCase();
        const termNormalized = term.trim();
        
        return {
          OR: [
            { name: { contains: termNormalized } },
            { description: { contains: termNormalized } },
            // Ищем в атрибутах товара по названию (например, тип кожи "жирная" или "Жирная")
            {
              attributes: {
                some: {
                  value: {
                    OR: [
                      { name: { contains: termNormalized } },
                      // Также ищем по slug (например, "zhirnaya" для "жирная")
                      { slug: { contains: termLower } }
                    ]
                  }
                }
              }
            },
            // Ищем в названии бренда
            {
              brand: {
                name: { contains: termNormalized }
              }
            }
          ]
        };
      });
      
      // Если есть только текстовый поиск, добавляем его в where.AND
      // Если есть и фильтры по атрибутам, объединяем их правильно
      if (attrSlugGroups.length === 0) {
        where.AND = textSearchConditions;
      } else {
        // Если есть и текстовый поиск, и фильтры по атрибутам, объединяем их
        searchConditions.push(...textSearchConditions);
      }
    }
  }

  // Фильтры по атрибутам (slug)
  if (attrSlugGroups.length > 0) {
    // Если есть несколько групп атрибутов, каждая группа должна иметь хотя бы одно совпадение
    const attrConditions = attrSlugGroups.map(group => ({
      attributes: {
        some: {
          value: {
            slug: { in: group.slugs },
            group: {
              slug: group.groupSlug
            }
          }
        }
      }
    }));
    
    if (q && searchConditions.length > 0) {
      // Если есть и текстовый поиск, и фильтры - объединяем через AND
      // Товар должен соответствовать текстовому поиску И фильтрам по атрибутам
      // Но текстовый поиск уже включает поиск в атрибутах, поэтому нужно быть аккуратным
      const allConditions = [...searchConditions];
      
      // Добавляем фильтры по атрибутам только если они не покрываются текстовым поиском
      // Но для простоты добавим их как отдельные условия
      allConditions.push(...attrConditions);
      
      where.AND = allConditions;
    } else {
      // Если только фильтры по атрибутам
      if (attrConditions.length === 1) {
        where.attributes = attrConditions[0].attributes;
      } else {
        where.AND = attrConditions;
      }
    }
  }

  if (min != null || max != null) {
    where.price = {};
    if (min != null) where.price.gte = min;
    if (max != null) where.price.lte = max;
  }
  if (sale) {
    where.oldPrice = { not: null };
  }
  if (selectedBrandSlugs.length) {
    where.brand = { slug: { in: selectedBrandSlugs } };
  }
  if (selectedCategorySlugs.length) {
    where.categories = {
      some: { category: { slug: { in: selectedCategorySlugs } } },
    };
  }

  // Добавляем таймаут для запросов к базе данных
  const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

  let products: any[] = [];
  let brands: any[] = [];
  let categories: any[] = [];
  let groups: any[] = [];

  try {
    console.log('[Catalog] Начало загрузки данных...');
    console.log('[Catalog] WHERE условие для запроса:', JSON.stringify(where, null, 2));
    const startTime = Date.now();
    
    const result = await Promise.race([
      Promise.all([
        prisma.product.findMany({
          where,
          include: {
            brand: true,
            categories: { include: { category: true } },
            attributes: { include: { value: { include: { group: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        prisma.brand.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: { 
              select: { 
                products: {
                  where: { isActive: true }
                }
              } 
            },
          },
        }),
        prisma.category.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: { 
              select: { 
                products: {
                  where: {
                    product: { isActive: true }
                  }
                }
              } 
            },
          },
        }),
        prisma.attributeGroup.findMany({
          orderBy: { name: 'asc' },
          include: {
            values: {
              orderBy: { name: 'asc' },
              include: {
                _count: { 
                  select: { 
                    products: {
                      where: {
                        product: { isActive: true }
                      }
                    }
                  } 
                },
              },
            },
          },
        }),
      ]),
      timeout(10000), // 10 секунд таймаут
    ]) as any;

    [products, brands, categories, groups] = result;
    const duration = Date.now() - startTime;
    console.log(`[Catalog] Данные загружены за ${duration}ms`);
    console.log(`[Catalog] Найдено товаров: ${products.length}`);
    if (selectedActivesSlugs.length > 0) {
      console.log(`[Catalog] Товары с выбранными активами (${selectedActivesSlugs.join(', ')}): ${products.length}`);
      // Проверяем, какие активы есть у найденных товаров
      const productActives = new Set<string>();
      products.forEach((p: any) => {
        (p.attributes || []).forEach((attr: any) => {
          if (attr.value?.group?.slug === 'actives') {
            productActives.add(attr.value.slug);
          }
        });
      });
      console.log(`[Catalog] Активы в найденных товарах:`, Array.from(productActives));
    }
    
    // Проверяем все доступные активы
    const activesGroup = groups.find((g: any) => g.slug === 'actives');
    if (activesGroup) {
      console.log(`[Catalog] Всего активов в системе: ${activesGroup.values?.length || 0}`);
      console.log(`[Catalog] Активы со slug'ами:`, activesGroup.values?.map((v: any) => ({ name: v.name, slug: v.slug, count: v._count?.products || 0 })));
    }
  } catch (error) {
    console.error('[Catalog] Ошибка загрузки каталога:', error);
    // Возвращаем пустые данные, чтобы страница не зависла
    products = [];
    brands = [];
    categories = [];
    groups = [];
  }

  const brandItems = brands.map(b => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    count: b._count?.products ?? 0,
  }));

  const categoryItems = categories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    count: c._count?.products ?? 0,
  }));

  const attrGroups = groups.map(g => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    values: (g.values || []).map(v => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      count: v._count?.products ?? 0,
    })),
  }));

  return (
    <CatalogClient
      products={products as any}
      brands={brandItems}
      categories={categoryItems}
      attrGroups={attrGroups as any}
      initialSearch={sp as any}
    />
  );
}


