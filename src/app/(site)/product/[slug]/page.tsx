import * as prismaMod from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"
import AddToCartButton from "./ui/AddToCartButton"
import AddToWishlistButton from "./ui/AddToWishlistButton"
import ProductReviews from "./ui/ProductReviews"
import StickyBuyButton from "./ui/StickyBuyButton"
import BackToCatalogLink from "@/components/catalog/BackToCatalogLink"
import { getLargeImage } from "@/lib/imageUtils"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

const prisma: any = (prismaMod as any).prisma ?? (prismaMod as any).default

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function extractTrailingId(s: string): number | null {
  const m = s.match(/-(\d+)$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isInteger(n) && n > 0 ? n : null
}

function toNumber(v: any): number | null {
  if (v == null) return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "bigint") return Number(v)
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  // Prisma.Decimal обычно имеет toNumber()/toString()
  if (typeof v?.toNumber === "function") {
    const n = v.toNumber()
    return Number.isFinite(n) ? n : null
  }
  if (typeof v?.toString === "function") {
    const n = Number(v.toString())
    return Number.isFinite(n) ? n : null
  }
  return null
}

function fmtPrice(v: any) {
  const n = toNumber(v)
  if (n == null) return "—"
  return n.toLocaleString("ru-RU")
}

function buildCartItem(product: any) {
  return {
    id: Number(product.id),
    slug: String(product.slug),
    name: String(product.name),
    brandName: product.brand?.name ?? null,
    price: toNumber(product.price) || 0,
    oldPrice: toNumber(product.oldPrice),
    imageUrl: (typeof product.imageUrl === "string" ? product.imageUrl : null) as string | null,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const decoded = safeDecode(String(rawSlug ?? ""))
  const maybeId = extractTrailingId(decoded)

  let product: any = null

  // 1) если slug-id — сначала по id
  if (maybeId != null) {
    product = await prisma.product.findFirst({
      where: { id: maybeId, isActive: true },
      include: {
        brand: true,
        categories: { include: { category: true } },
        attributes: { include: { value: { include: { group: true } } } },
      },
    })
  }

  // 2) fallback по slug
  if (!product) {
    product = await prisma.product.findFirst({
      where: { slug: decoded, isActive: true },
      include: {
        brand: true,
        categories: { include: { category: true } },
        attributes: { include: { value: { include: { group: true } } } },
      },
    })
  }

  if (!product) notFound()

  const categories =
    (product.categories ?? [])
      .map((pc: any) => pc?.category)
      .filter(Boolean) ?? []

  const attrsByGroup = new Map<string, { name: string; values: string[] }>()
  for (const pa of product.attributes ?? []) {
    const v = pa?.value
    const g = v?.group
    if (!v || !g) continue
    const key = String(g.slug ?? g.id)
    const cur = attrsByGroup.get(key) ?? { name: String(g.name ?? "—"), values: [] }
    cur.values.push(String(v.name ?? "—"))
    attrsByGroup.set(key, cur)
  }

  const price = product.price
  const oldPrice = product.oldPrice
  const hasSale =
    toNumber(oldPrice) != null &&
    toNumber(price) != null &&
    (toNumber(oldPrice) as number) > (toNumber(price) as number)

  const imgSrc = getLargeImage(product.imageUrl) || "/images/placeholder.svg"

  // Извлекаем объем из названия или описания (например, "30ml", "100 мл")
  function extractVolume(name: string, description?: string | null): string | null {
    const text = `${name} ${description || ""}`.toLowerCase();
    const mlMatch = text.match(/(\d+)\s*(?:мл|ml)/);
    if (mlMatch) {
      return `${mlMatch[1]} мл`;
    }
    const gMatch = text.match(/(\d+)\s*(?:г|g)/);
    if (gMatch) {
      return `${gMatch[1]} г`;
    }
    return null;
  }

  const volume = extractVolume(product.name, product.description);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:pb-8">
      <div className="mb-6">
        <BackToCatalogLink className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200" />
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">#{product.id} • {product.slug}</div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          {product.imageUrl ? (
            <img
              src={imgSrc}
              alt={String(product.name ?? "Товар")}
              className="h-auto w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-40 sm:h-56 items-center justify-center rounded-xl bg-gray-50 dark:bg-neutral-800">
              <div className="text-center p-4">
                <svg
                  className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 sm:h-12 sm:w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">Фото появится в ближайшее время</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">{product.brand?.name ?? "Без бренда"}</div>
          <h1 className="mt-2 text-2xl font-semibold dark:text-white">{product.name}</h1>

          <div className="mt-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <div className="text-2xl font-semibold dark:text-white">{fmtPrice(price)} ₸</div>
              {hasSale ? (
                <div className="text-sm text-gray-400 dark:text-gray-500 line-through">{fmtPrice(oldPrice)} ₸</div>
              ) : null}
            </div>
            {volume && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Цена за {volume}</p>
            )}
          </div>

          {categories.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c: any) => (
                <span
                  key={String(c.slug ?? c.id)}
                  className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300"
                >
                  {c.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-6 text-sm leading-6 text-gray-700 whitespace-pre-wrap dark:text-gray-300">
            {product.description?.trim() ? product.description : "Описание пока не добавлено."}
          </div>

          {attrsByGroup.size ? (
            <div className="mt-6 space-y-4">
              {Array.from(attrsByGroup.values()).map((g) => (
                <div key={g.name}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {g.name}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.values.map((v) => (
                      <span
                        key={g.name + ":" + v}
                        className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-neutral-800 dark:text-gray-300"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-8 space-y-4">
            {/* Главная кнопка */}
            <AddToCartButton item={buildCartItem(product)} />
            
            {/* Выделенный текст про оплату */}
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 dark:border-green-900/40 dark:bg-green-950/30">
              <span className="text-base">🟢</span>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Без регистрации · Оплата через Kaspi
              </p>
            </div>

            {/* Блок "Что будет после оплаты" */}
            <div className="rounded-xl border bg-gray-50 p-4 dark:border-neutral-800 dark:bg-neutral-800">
              <p className="text-sm font-medium dark:text-white">После оплаты:</p>
              <ul className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
                <li>• Мы подтвердим заказ</li>
                <li>• Напишем в WhatsApp / SMS</li>
              </ul>
            </div>

            {/* Ссылка для участников */}
            <div className="text-center">
              <Link 
                href={`/login?next=${encodeURIComponent(`/product/${rawSlug}`)}`}
                className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Уже участник? Войти
              </Link>
            </div>

            {/* Кнопка "В избранное" (менее заметная, выше основных действий) */}
            <div className="mt-4">
              <AddToWishlistButton productId={Number(product.id)} />
            </div>

            {/* Дополнительные действия */}
            <div className="mt-4 pt-4 border-t dark:border-neutral-800">
              <Link className="block w-full rounded-xl border px-4 py-2.5 text-sm text-center hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700" href="/cart">
                Перейти в корзину →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ProductReviews productId={Number(product.id)} />
      
      {/* Sticky кнопка для мобильных */}
      <StickyBuyButton item={buildCartItem(product)} />
    </main>
  )
}
