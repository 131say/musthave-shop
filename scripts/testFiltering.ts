// Скрипт для тестирования фильтрации по атрибутам
import { config } from 'dotenv';
config();

import { prisma } from '../src/lib/prisma';

async function testFiltering() {
  console.log('=== ТЕСТ ФИЛЬТРАЦИИ ПО АТРИБУТАМ ===\n');

  // 1. Проверяем все группы атрибутов
  console.log('1. Группы атрибутов:');
  const groups = await prisma.attributeGroup.findMany({
    orderBy: { name: 'asc' },
    include: {
      values: {
        include: {
          _count: {
            select: {
              products: {
                where: {
                  product: { isActive: true }
                }
              }
            }
          }
        }
      }
    }
  });

  for (const group of groups) {
    console.log(`  - ${group.name} (slug: "${group.slug}", id: ${group.id})`);
    console.log(`    Значений: ${group.values.length}`);
    const totalProducts = group.values.reduce((sum, v) => sum + (v._count?.products || 0), 0);
    console.log(`    Всего товаров с атрибутами этой группы: ${totalProducts}`);
    
    // Показываем первые 5 значений
    const sampleValues = group.values.slice(0, 5);
    for (const val of sampleValues) {
      console.log(`      • ${val.name} (slug: "${val.slug}") - ${val._count?.products || 0} товаров`);
    }
    if (group.values.length > 5) {
      console.log(`      ... и еще ${group.values.length - 5} значений`);
    }
    console.log('');
  }

  // 2. Тестируем фильтрацию по активам
  console.log('\n2. Тест фильтрации по активам:');
  const activesGroup = groups.find(g => g.slug === 'actives');
  if (activesGroup && activesGroup.values.length > 0) {
    const testActive = activesGroup.values[0];
    console.log(`  Тестируем фильтр по активу: "${testActive.name}" (slug: "${testActive.slug}")`);
    
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        attributes: {
          some: {
            value: {
              slug: testActive.slug,
              group: {
                slug: 'actives'
              }
            }
          }
        }
      },
      include: {
        attributes: {
          include: {
            value: {
              include: {
                group: true
              }
            }
          }
        }
      },
      take: 5
    });

    console.log(`  Найдено товаров: ${products.length}`);
    for (const p of products) {
      const actives = p.attributes
        .filter(a => a.value.group.slug === 'actives')
        .map(a => a.value.name);
      console.log(`    - ${p.name} (ID: ${p.id})`);
      console.log(`      Активы: ${actives.join(', ') || 'нет'}`);
    }
  } else {
    console.log('  ❌ Группа "actives" не найдена или пуста');
  }

  // 3. Тестируем фильтрацию по SPF
  console.log('\n3. Тест фильтрации по SPF:');
  const spfGroup = groups.find(g => g.slug === 'spf');
  if (spfGroup && spfGroup.values.length > 0) {
    const testSpf = spfGroup.values[0];
    console.log(`  Тестируем фильтр по SPF: "${testSpf.name}" (slug: "${testSpf.slug}")`);
    
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        attributes: {
          some: {
            value: {
              slug: testSpf.slug,
              group: {
                slug: 'spf'
              }
            }
          }
        }
      },
      take: 5
    });

    console.log(`  Найдено товаров: ${products.length}`);
    for (const p of products) {
      console.log(`    - ${p.name} (ID: ${p.id})`);
    }
  } else {
    console.log('  ❌ Группа "spf" не найдена или пуста');
  }

  // 4. Проверяем товары без атрибутов
  console.log('\n4. Товары без атрибутов:');
  const productsWithoutAttrs = await prisma.product.findMany({
    where: {
      isActive: true,
      attributes: {
        none: {}
      }
    },
    take: 10
  });
  console.log(`  Найдено: ${productsWithoutAttrs.length}`);
  for (const p of productsWithoutAttrs.slice(0, 5)) {
    console.log(`    - ${p.name} (ID: ${p.id})`);
  }

  // 5. Проверяем товары с атрибутами разных групп
  console.log('\n5. Пример товара со всеми атрибутами:');
  const productWithAttrs = await prisma.product.findFirst({
    where: {
      isActive: true,
      attributes: {
        some: {}
      }
    },
    include: {
      attributes: {
        include: {
          value: {
            include: {
              group: true
            }
          }
        }
      }
    }
  });

  if (productWithAttrs) {
    console.log(`  Товар: ${productWithAttrs.name} (ID: ${productWithAttrs.id})`);
    const attrsByGroup = new Map<string, string[]>();
    for (const attr of productWithAttrs.attributes) {
      const groupSlug = attr.value.group.slug;
      if (!attrsByGroup.has(groupSlug)) {
        attrsByGroup.set(groupSlug, []);
      }
      attrsByGroup.get(groupSlug)!.push(attr.value.name);
    }
    
    for (const [groupSlug, values] of attrsByGroup.entries()) {
      const group = groups.find(g => g.slug === groupSlug);
      console.log(`    ${group?.name || groupSlug}: ${values.join(', ')}`);
    }
  }

  console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
}

testFiltering()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
