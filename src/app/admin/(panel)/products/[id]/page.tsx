/* fix: prevent image placeholder overlays from blocking clicks */
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
// NOTE: IDs must be numbers everywhere, иначе чекбоксы "не нажимаются" (состояние сразу откатывается)

type CategoryItem = { id: number; name: string; parentId: number | null };
type AttrValue = { id: number; name: string; slug: string; groupId: number };
type AttrGroup = { id: number; name: string; slug: string; values: AttrValue[] };

function toInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function toggleNumberId(
  current: number[],
  idRaw: unknown,
  checked: boolean
): number[] {
  const id = toInt(idRaw);
  if (!id) return current;
  const s = new Set<number>(current);
  if (checked) s.add(id);
  else s.delete(id);
  return Array.from(s);
}

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  oldPrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  slug?: string;
  attributes?: { value: { id: number; name: string; slug: string; group: { id: number; name: string; slug: string } } }[];
};

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = useMemo(() => Number(params?.id), [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imgError, setImgError] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]); // must be number[]
  const [attrGroups, setAttrGroups] = useState<AttrGroup[]>([]);
  const [selectedAttrValues, setSelectedAttrValues] = useState<number[]>([]);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError('Некорректный ID товара');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [a, b, c] = await Promise.all([
          fetch(`/api/admin/products/${id}`).then((r) => r.json()),
          fetch(`/api/admin/categories`).then((r) => r.json()),
          fetch(`/api/admin/attributes`).then((r) => r.json()),
        ]);
        const p = a?.product;
        setProduct(p);
        setName(p?.name || '');
        // @ts-expect-error - brand is included by API
        setBrandName((p as any)?.brand?.name || '');
        setDescription(p?.description || '');
        setPrice(String(p?.price ?? ''));
        setCostPrice(String(p?.costPrice ?? ''));
        setOldPrice(p?.oldPrice == null ? '' : String(p.oldPrice));
        setImageUrl(p?.imageUrl || '');
        setImagePreview(p?.imageUrl || null);
        setImgError(false); // сброс при загрузке нового товара
        setIsActive(!!p?.isActive);
        setCategories(Array.isArray(b?.categories) ? b.categories : []);
        setAttrGroups(Array.isArray(c?.groups) ? c.groups : []);
        // categories can come in different shapes depending on include/select
        const catIds = (p?.categories ?? [])
          .map((x: any) => x?.category?.id ?? x?.id)
          .map((v: any) => toInt(v))
          .filter((n: any) => typeof n === 'number' && n > 0) as number[];
        setCategoryIds(Array.from(new Set(catIds)));

        // attributes
        const attrIds = (p?.attributes ?? [])
          .map((x: any) => x?.valueId ?? x?.attributeValueId ?? x?.id)
          .map((v: any) => toInt(v))
          .filter((n: any) => typeof n === 'number' && n > 0) as number[];
        setSelectedAttrValues(Array.from(new Set(attrIds)));
      } catch (e: any) {
        setError(e?.message || 'Ошибка');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // === ЗАГРУЗКА ИЗОБРАЖЕНИЯ ===
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError(null);
    setImgError(false);
    setUploadProgress(0);
    setImagePreview(null);

    try {
      // Проверка типа файла
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP');
        setUploadingImage(false);
        return;
      }

      // Проверка размера (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError(`Файл слишком большой. Максимальный размер: 5MB`);
        setUploadingImage(false);
        return;
      }

      // Создаём превью для отображения
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Используем XMLHttpRequest для отслеживания прогресса
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Отслеживаем прогресс загрузки
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Обрабатываем ответ
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.imageUrl) {
              setImageUrl(data.imageUrl);
              setUploadError(null);
              setImgError(false);
              setUploadProgress(100);
              
              // Обновляем превью на загруженное изображение
              if (data.imageUrl) {
                setImagePreview(data.imageUrl);
              }
            }
          } catch (err) {
            setUploadError('Ошибка обработки ответа сервера');
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            setUploadError(errorData?.error || 'Ошибка загрузки файла');
          } catch {
            setUploadError('Ошибка загрузки файла');
          }
        }
        setUploadingImage(false);
        e.target.value = '';
      });

      // Обрабатываем ошибки
      xhr.addEventListener('error', () => {
        setUploadError('Ошибка сети при загрузке файла');
        setUploadingImage(false);
        setUploadProgress(0);
        e.target.value = '';
      });

      // Отправляем запрос
      xhr.open('POST', '/api/admin/products/upload');
      xhr.send(formData);
    } catch (err: any) {
      setUploadError(err?.message || 'Ошибка загрузки файла');
      setUploadingImage(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const onSave = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        brandName: brandName.trim() || null,
        description: description.trim(),
        price: Number(price),
        costPrice: Number(costPrice),
        oldPrice: oldPrice ? Number(oldPrice) : null,
        imageUrl: imageUrl.trim() || null,
        isActive,
        categoryIds,
        attributeValueIds: selectedAttrValues,
      };
      
      console.log('attributeValueIds', selectedAttrValues);
      
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка сохранения');

      router.replace('/admin/products');
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!product) return;
    if (!confirm(`Удалить товар "${product.name}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка удаления');
      router.replace('/admin/products');
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Загрузка...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
        {error || 'Товар не найден'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Редактировать товар</h1>
          <div className="text-xs text-slate-500">
            #{product.id}
            {product.slug ? ` • ${product.slug}` : ''}
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          Назад
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <div className="text-xs font-medium text-slate-500">Категории (можно несколько)</div>
            <div className="rounded-xl border p-3 max-h-56 overflow-auto space-y-2">
              {categories.length ? (
                categories
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => {
                    const id = toInt(c.id) ?? 0;
                    const inputId = `cat-${id}`;
                    return (
                      <div key={id} className="flex items-center gap-2 py-1">
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={categoryIds.includes(id)}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const checked = e.target.checked;
                            setCategoryIds((prev) => toggleNumberId(prev, id, checked));
                          }}
                        />
                        <label htmlFor={inputId} className="cursor-pointer select-none text-sm">
                          {c.name} <span className="text-xs text-gray-400">#{id}</span>
                        </label>
                      </div>
                    );
                  })
              ) : (
                <div className="text-sm text-gray-500">Категорий пока нет. Создай в /admin/categories</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">Атрибуты</div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {attrGroups.map((g) => (
                <div key={g.id} className="rounded-xl border p-3">
                  <div className="text-sm font-semibold mb-2">{g.name}</div>
                  <div className="space-y-1">
                    {g.values.map((v) => {
                      const vid = toInt(v.id) ?? 0;
                      const checked = selectedAttrValues.includes(vid);
                      const inputId = `attr-${g.slug}-${vid}`;
                      return (
                        <div key={vid} className="flex items-center gap-2 py-1">
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={checked}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const c = e.target.checked;
                              setSelectedAttrValues((prev) => toggleNumberId(prev, vid, c));
                            }}
                          />
                          <label htmlFor={inputId} className="cursor-pointer select-none text-sm">
                            {v.name}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              (Тип кожи / Назначение / Активы — можно расширять позже)
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">Название*</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">Бренд</div>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
              placeholder="Например: COSRX"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">Описание</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-slate-500">Цена*</div>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Старая цена</div>
              <input
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">Себестоимость (опт) *</div>
            <input
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
              placeholder="3750"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">Фото</div>
            
            {/* Превью: ограничиваем ширину, чтобы не растягивать страницу на мобильных */}
            {imagePreview && (
              <div className="mb-3 w-full max-w-full min-w-0 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="aspect-[4/3] relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Превью"
                    className="max-w-full h-full w-full object-contain"
                    onError={() => {
                      setImgError(true);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Прогресс-бар загрузки */}
            {uploadingImage && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600 dark:text-gray-400">Загрузка...</span>
                  <span className="text-xs text-slate-600 dark:text-gray-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-neutral-700">
                  <div
                    className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Загрузка файла */}
            <div className="mb-2">
              <label className="block">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                  id="image-upload-edit"
                />
                <span
                  className={`inline-block rounded-xl border border-slate-200 px-4 py-2 text-sm cursor-pointer transition ${
                    uploadingImage
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {uploadingImage ? 'Загрузка...' : '📷 Загрузить фото'}
                </span>
              </label>
              {uploadError && (
                <div className="mt-1 text-xs text-red-600">{uploadError}</div>
              )}
            </div>

            {/* Ссылка через prompt — на iOS не вызывает авто-зум при вставке */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = window.prompt('Вставьте прямую ссылку на изображение (URL):', imageUrl || '');
                  if (url == null) return;
                  const trimmed = url.trim();
                  setImageUrl(trimmed);
                  setUploadError(null);
                  setImgError(false);
                  if (trimmed) {
                    const showPreview = trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed);
                    setImagePreview(showPreview ? trimmed : null);
                  } else {
                    setImagePreview(null);
                  }
                  setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
              >
                🔗 Вставить ссылку на фото
              </button>
              {imageUrl ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                  <span className="truncate text-xs text-slate-600 dark:text-gray-400" title={imageUrl}>
                    {imageUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setImagePreview(null);
                      setUploadError(null);
                      setImgError(false);
                      setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0);
                    }}
                    className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
                  >
                    Очистить
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Или нажмите кнопку выше и вставьте URL в окно (на телефоне не вызывает зум).
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="active" className="text-sm text-slate-700">
              Товар активен (виден в каталоге)
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={saving || !name.trim() || !price || !costPrice}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:bg-slate-300"
            >
              {saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
            <button
              onClick={onDelete}
              disabled={saving}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              Удалить
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="text-sm font-semibold">Превью</div>
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
              {/* ВАЖНО: любые оверлеи должны быть pointer-events-none, иначе блокируют клики по всей странице */}
              {imageUrl && imageUrl.startsWith('/') && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-contain"
                  onError={() => {
                    setImgError(true); // защита от бесконечного цикла
                  }}
                />
              ) : null}
              <div
                className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none select-none"
                aria-hidden="true"
              >
                {imageUrl && imageUrl.startsWith('/') && !imgError ? "" : "фото товара"}
              </div>
            </div>
            <div className="p-4 space-y-1">
              <div className="text-sm font-semibold line-clamp-2">
                {name || 'Название товара'}
              </div>
              <div className="text-xs text-slate-500 line-clamp-2">
                {description || 'Описание товара'}
              </div>
              <div className="pt-2 flex items-end justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {(Number(price) || 0).toLocaleString('ru-RU')} ₸
                  </div>
                  <div className="text-xs text-slate-400 line-through">
                    {oldPrice ? `${Number(oldPrice).toLocaleString('ru-RU')} ₸` : ''}
                  </div>
                </div>
                <div
                  className={`text-[11px] px-2 py-1 rounded-full border ${
                    isActive
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {isActive ? 'Активен' : 'Выключен'}
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Это превью только для админки (как будет выглядеть карточка).
          </div>
        </div>
      </div>
    </div>
  );
}


