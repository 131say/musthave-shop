'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';

type CategoryItem = { id: number; name: string; slug: string; parentId: number | null };
type AttrValue = { id: number; name: string; slug: string; groupId: number; sort: number };
type AttrGroup = { id: number; name: string; slug: string; values: AttrValue[]; sort: number };

function toInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function toggleNumberId(current: number[], idRaw: unknown, checked: boolean): number[] {
  const id = toInt(idRaw);
  if (!id) return current;
  const s = new Set<number>(current);
  if (checked) s.add(id);
  else s.delete(id);
  return Array.from(s);
}

type Tab = 'categories' | 'attributes' | 'product';

export default function NewProductPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('product');

  // Данные
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [attrGroups, setAttrGroups] = useState<AttrGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Категории
  const [catName, setCatName] = useState('');
  const [catParentId, setCatParentId] = useState<string>('');
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatParentId, setEditCatParentId] = useState<string>('');

  // Атрибуты - группы
  const [groupName, setGroupName] = useState('');
  const [editGroupId, setEditGroupId] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState('');

  // Атрибуты - значения
  const [valueName, setValueName] = useState('');
  const [valueGroupId, setValueGroupId] = useState<string>('');
  const [editValueId, setEditValueId] = useState<number | null>(null);
  const [editValueName, setEditValueName] = useState('');
  const [editValueGroupId, setEditValueGroupId] = useState<string>('');

  // Товар
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [selectedAttrValues, setSelectedAttrValues] = useState<number[]>([]);
  const [jsonInput, setJsonInput] = useState('');

  const loadData = async () => {
    try {
      const [catRes, attrRes] = await Promise.all([
        fetch('/api/admin/categories', { cache: 'no-store' }),
        fetch('/api/admin/attributes', { cache: 'no-store' }),
      ]);
      const catJson = await catRes.json();
      const attrJson = await attrRes.json();
      if (catJson?.categories) setCategories(catJson.categories);
      if (attrJson?.groups) setAttrGroups(attrJson.groups);
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // === КАТЕГОРИИ ===
  const createCategory = async () => {
    if (!catName.trim()) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName.trim(), parentId: catParentId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      setCatName('');
      setCatParentId('');
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  const startEditCategory = (c: CategoryItem) => {
    setEditCatId(c.id);
    setEditCatName(c.name);
    setEditCatParentId(c.parentId == null ? '' : String(c.parentId));
  };

  const saveCategory = async () => {
    if (!editCatId || !editCatName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${editCatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCatName.trim(), parentId: editCatParentId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      setEditCatId(null);
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Удалить категорию?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  // === АТРИБУТЫ - ГРУППЫ ===
  const createGroup = async () => {
    if (!groupName.trim()) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/attributes/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      setGroupName('');
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  const startEditGroup = (g: AttrGroup) => {
    setEditGroupId(g.id);
    setEditGroupName(g.name);
  };

  const saveGroup = async () => {
    if (!editGroupId || !editGroupName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/attributes/groups/${editGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editGroupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      setEditGroupId(null);
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  const deleteGroup = async (id: number) => {
    if (!confirm('Удалить группу атрибутов?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/attributes/groups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  // === АТРИБУТЫ - ЗНАЧЕНИЯ ===
  const createValue = async () => {
    if (!valueName.trim() || !valueGroupId) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/attributes/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: valueName.trim(), groupId: Number(valueGroupId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      setValueName('');
      setValueGroupId('');
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  const startEditValue = (v: AttrValue) => {
    setEditValueId(v.id);
    setEditValueName(v.name);
    setEditValueGroupId(String(v.groupId));
  };

  const saveValue = async () => {
    if (!editValueId || !editValueName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/attributes/values/${editValueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValueName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      setEditValueId(null);
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  const deleteValue = async (id: number) => {
    if (!confirm('Удалить значение атрибута?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/attributes/values/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  // === ПАРСИНГ JSON ===
  const handleJsonImport = async () => {
    if (!jsonInput.trim()) {
      setError('Введите JSON');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Убираем обёртку ```json ... ``` (ChatGPT, Gemini и т.д.)
      let raw = jsonInput.trim();
      const codeBlockMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/);
      if (codeBlockMatch) raw = codeBlockMatch[1].trim();
      raw = raw.replace(/\uFEFF/g, ''); // BOM
      // Заменяем «кавычки-ёлочки» на обычные " (при вставке из мессенджеров/редакторов)
      raw = raw.replace(/\u201C/g, '"').replace(/\u201D/g, '"').replace(/\u2018/g, "'").replace(/\u2019/g, "'");
      const data = JSON.parse(raw);

      // Заполняем основные поля
      if (data.name) setName(String(data.name));
      if (data.brandName) setBrandName(String(data.brandName));
      if (data.description) setDescription(String(data.description));
      if (data.price != null) setPrice(String(data.price));
      if (data.costPrice != null) setCostPrice(String(data.costPrice));
      if (data.oldPrice != null) setOldPrice(String(data.oldPrice));
      if (data.imageUrl) setImageUrl(String(data.imageUrl));
      if (typeof data.isActive === 'boolean') setIsActive(data.isActive);

      const created: string[] = [];
      const foundItems: string[] = [];

      // Автоматически создаём или находим категории
      if (Array.isArray(data.categories)) {
        const foundCategoryIds: number[] = [];
        let categoriesUpdated = false;
        
        for (const catName of data.categories) {
          const catNameStr = String(catName).trim();
          if (!catNameStr) continue;
          
          // Ищем существующую категорию (обновляем список, если были созданы новые)
          if (categoriesUpdated) {
            await loadData();
            categoriesUpdated = false;
          }
          
          let foundCategory = categories.find((c) => 
            c.name.toLowerCase().trim() === catNameStr.toLowerCase().trim()
          );
          
          if (foundCategory) {
            foundCategoryIds.push(foundCategory.id);
            foundItems.push(`Категория "${catNameStr}"`);
          } else {
            // Создаём новую категорию
            try {
              const res = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: catNameStr, parentId: null }),
              });
              const result = await res.json();
              if (res.ok && result?.category) {
                foundCategoryIds.push(result.category.id);
                created.push(`Категория "${catNameStr}"`);
                categoriesUpdated = true;
              } else {
                throw new Error(result?.error || 'Ошибка создания категории');
              }
            } catch (e: any) {
              console.error('Ошибка создания категории:', e);
              // Продолжаем работу, даже если не удалось создать
            }
          }
        }
        
        // Финальное обновление списка категорий
        if (categoriesUpdated) {
          await loadData();
        }
        
        setCategoryIds(foundCategoryIds);
      }

      // Автоматически создаём или находим атрибуты (группы и значения)
      if (data.attributes && typeof data.attributes === 'object' && !Array.isArray(data.attributes)) {
        const foundAttrValueIds: number[] = [];
        
        for (const [groupName, valuesRaw] of Object.entries(data.attributes)) {
          // Gemini и др. могут вернуть строку вместо массива — приводим к массиву
          const values = Array.isArray(valuesRaw)
            ? valuesRaw
            : valuesRaw != null && typeof valuesRaw === 'string'
              ? [valuesRaw]
              : [];
          if (values.length === 0) continue;
          
          const groupNameStr = String(groupName).trim();
          if (!groupNameStr) continue;
          
          // Ищем существующую группу атрибутов
          let group = attrGroups.find((g) => 
            g.name.toLowerCase().trim() === groupNameStr.toLowerCase().trim()
          );
          
          // Если группы нет, создаём её
          if (!group) {
            try {
              const res = await fetch('/api/admin/attributes/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: groupNameStr, sort: 0 }),
              });
              const result = await res.json();
              if (res.ok && result?.group) {
                created.push(`Группа атрибутов "${groupNameStr}"`);
                // Используем группу из ответа API напрямую
                group = {
                  id: result.group.id,
                  name: result.group.name,
                  slug: result.group.slug,
                  values: result.group.values || [],
                  sort: result.group.sort || 0,
                };
                // Обновляем список групп для последующих итераций
                await loadData();
                // Обновляем ссылку на группу из обновленного состояния
                const updatedGroup = attrGroups.find((g) => 
                  g.name.toLowerCase().trim() === groupNameStr.toLowerCase().trim()
                );
                if (updatedGroup) {
                  group = { ...updatedGroup, values: updatedGroup.values ?? [] };
                }
              } else {
                await loadData();
                const found = attrGroups.find((g) => 
                  g.name.toLowerCase().trim() === groupNameStr.toLowerCase().trim()
                );
                if (!found) {
                  console.error('Ошибка создания группы:', result?.error || 'Группа не найдена');
                  continue;
                }
                group = { ...found, values: found.values ?? [] };
                foundItems.push(`Группа атрибутов "${groupNameStr}"`);
              }
            } catch (e: any) {
              console.error('Ошибка создания группы атрибутов:', e);
              await loadData();
              const found = attrGroups.find((g) => 
                g.name.toLowerCase().trim() === groupNameStr.toLowerCase().trim()
              );
              if (!found) continue;
              group = { ...found, values: found.values ?? [] };
            }
          }
          
          if (!group) continue;
          const groupValues = group.values ?? [];
          
          // Обрабатываем значения атрибутов
          for (const valueName of values) {
            const valueNameStr = String(valueName).trim();
            if (!valueNameStr) continue;
            
            // Ищем существующее значение
            let value = groupValues.find((v) => 
              v.name.toLowerCase().trim() === valueNameStr.toLowerCase().trim()
            );
            
            if (value) {
              foundAttrValueIds.push(value.id);
              foundItems.push(`Атрибут "${groupNameStr}" → "${valueNameStr}"`);
            } else {
              // Создаём новое значение
              try {
                const res = await fetch('/api/admin/attributes/values', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: valueNameStr, groupId: group.id, sort: 0 }),
                });
                const result = await res.json();
                if (res.ok && result?.value) {
                  foundAttrValueIds.push(result.value.id);
                  created.push(`Атрибут "${groupNameStr}" → "${valueNameStr}"`);
                  await loadData();
                  const updatedGroup = attrGroups.find((g) => 
                    g.name.toLowerCase().trim() === groupNameStr.toLowerCase().trim()
                  );
                  if (updatedGroup) group = { ...updatedGroup, values: updatedGroup.values ?? [] };
                } else {
                  console.error('Ошибка создания значения:', result?.error);
                }
              } catch (e: any) {
                console.error('Ошибка создания значения атрибута:', e);
              }
            }
          }
        }
        
        setSelectedAttrValues(foundAttrValueIds);
      }

      // Формируем сообщение о результате
      const messages: string[] = [];
      if (created.length > 0) {
        messages.push(`✅ Создано: ${created.join(', ')}`);
      }
      if (foundItems.length > 0 && foundItems.length <= 5) {
        messages.push(`Найдено: ${foundItems.slice(0, 5).join(', ')}${foundItems.length > 5 ? '...' : ''}`);
      }
      
      if (messages.length > 0) {
        setError(messages.join('. '));
      } else {
        setError(null);
      }
    } catch (e: any) {
      setError(`Ошибка парсинга JSON: ${e?.message || 'Неверный формат JSON'}`);
    } finally {
      setLoading(false);
    }
  };

  // === ЗАГРУЗКА ИЗОБРАЖЕНИЯ ===
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError(null);
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

  // === ТОВАР ===
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const priceNum = Number(price);
      const costPriceNum = Number(costPrice);

      if (!name.trim()) {
        setError('Название товара обязательно');
        setLoading(false);
        return;
      }

      if (isNaN(priceNum) || priceNum <= 0) {
        setError('Укажите корректную цену');
        setLoading(false);
        return;
      }

      if (isNaN(costPriceNum) || costPriceNum <= 0) {
        setError('Укажите корректную себестоимость');
        setLoading(false);
        return;
      }

      const oldPriceNum = oldPrice ? Number(oldPrice) : null;
      if (oldPrice && (isNaN(oldPriceNum!) || oldPriceNum! <= 0)) {
        setError('Старая цена должна быть положительным числом');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brandName: brandName.trim() || null,
          description: description.trim(),
          price: priceNum,
          costPrice: costPriceNum,
          oldPrice: oldPriceNum,
          imageUrl: imageUrl.trim() || null,
          isActive,
          categoryIds,
          attributeValueIds: selectedAttrValues,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.error || 'Ошибка создания товара';
        const details = data?.details ? ` (${data.details})` : '';
        throw new Error(errorMsg + details);
      }

      router.replace('/admin/products');
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Создать товар</h1>
      </div>

      {/* Табы */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'categories'
              ? 'border-b-2 border-rose-500 text-rose-600 dark:text-rose-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Категории
        </button>
        <button
          onClick={() => setActiveTab('attributes')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'attributes'
              ? 'border-b-2 border-rose-500 text-rose-600 dark:text-rose-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Атрибуты
        </button>
        <button
          onClick={() => setActiveTab('product')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'product'
              ? 'border-b-2 border-rose-500 text-rose-600 dark:text-rose-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Создать товар
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Таб: Категории */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm font-medium mb-3 dark:text-white">Создать категорию</div>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Название"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
              />
              <select
                value={catParentId}
                onChange={(e) => setCatParentId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
              >
                <option value="">Без родителя</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={createCategory}
                disabled={!catName.trim()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white disabled:bg-slate-300"
              >
                Создать
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm font-medium mb-3 dark:text-white">Список категорий</div>
            <div className="divide-y dark:divide-neutral-800">
              {categories.map((c) => {
                const parent = c.parentId ? categoriesById.get(c.parentId) : null;
                const isEditing = editCatId === c.id;
                return (
                  <div key={c.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium dark:text-white">
                        {c.name} <span className="text-xs opacity-60">#{c.id}</span>
                      </div>
                      <div className="text-xs opacity-70 dark:text-gray-400">
                        slug: <span className="font-mono">{c.slug}</span>
                        {parent ? <> · parent: {parent.name}</> : null}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
                        />
                        <select
                          value={editCatParentId}
                          onChange={(e) => setEditCatParentId(e.target.value)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
                        >
                          <option value="">Без родителя</option>
                          {categories
                            .filter((x) => x.id !== c.id)
                            .map((x) => (
                              <option key={x.id} value={String(x.id)}>
                                {x.name}
                              </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={saveCategory}
                            className="rounded-xl bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditCatId(null)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditCategory(c)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => deleteCategory(c.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Таб: Атрибуты */}
      {activeTab === 'attributes' && (
        <div className="space-y-6">
          {/* Группы атрибутов */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-sm font-medium mb-3 dark:text-white">Группы атрибутов</div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Название группы (например: Тип кожи)"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
              />
              <button
                onClick={createGroup}
                disabled={!groupName.trim()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white disabled:bg-slate-300"
              >
                Создать группу
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {attrGroups.map((g) => {
                const isEditing = editGroupId === g.id;
                return (
                  <div key={g.id} className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
                        />
                        <button
                          onClick={saveGroup}
                          className="rounded-xl bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditGroupId(null)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="font-semibold dark:text-white">{g.name}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditGroup(g)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => deleteGroup(g.id)}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Значения в группе */}
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-slate-500 dark:text-gray-400">Значения:</div>
                      {(g.values || []).map((v) => {
                        const isEditingValue = editValueId === v.id;
                        return (
                          <div key={v.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-neutral-800">
                            {isEditingValue ? (
                              <div className="flex gap-2 flex-1">
                                <input
                                  value={editValueName}
                                  onChange={(e) => setEditValueName(e.target.value)}
                                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                                />
                                <button
                                  onClick={saveValue}
                                  className="rounded-lg bg-black px-2 py-1 text-xs text-white dark:bg-white dark:text-black"
                                >
                                  Сохранить
                                </button>
                                <button
                                  onClick={() => setEditValueId(null)}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-700"
                                >
                                  Отмена
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs dark:text-gray-300">{v.name}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => startEditValue(v)}
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-700"
                                  >
                                    Изменить
                                  </button>
                                  <button
                                    onClick={() => deleteValue(v.id)}
                                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Добавить значение */}
                      {editValueId === null && (
                        <div className="flex gap-2">
                          <input
                            value={valueGroupId === String(g.id) ? valueName : ''}
                            onChange={(e) => {
                              setValueName(e.target.value);
                              setValueGroupId(String(g.id));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && valueName.trim() && valueGroupId === String(g.id)) {
                                createValue();
                              }
                            }}
                            placeholder="Новое значение..."
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                          />
                          {valueGroupId === String(g.id) && valueName.trim() && (
                            <button
                              onClick={createValue}
                              className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white"
                            >
                              Добавить
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Таб: Создать товар */}
      {activeTab === 'product' && (
        <form onSubmit={onSubmit} className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
          {/* Поле для импорта JSON */}
          <div className="rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/50 p-4 dark:border-rose-800 dark:bg-rose-950/20">
            <div className="text-sm font-semibold mb-2 dark:text-white">Импорт из JSON (ChatGPT)</div>
            <div className="text-xs text-slate-600 mb-3 dark:text-gray-400">
              Вставьте JSON, полученный от ChatGPT после анализа фото товара
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs font-mono outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
              placeholder='{"name": "Название товара", "brandName": "COSRX", ...}'
            />
            <button
              type="button"
              onClick={handleJsonImport}
              disabled={!jsonInput.trim()}
              className="mt-2 rounded-xl bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Заполнить форму из JSON
            </button>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Категории (можно несколько)</div>
            <div className="rounded-xl border border-slate-200 p-3 max-h-56 overflow-auto space-y-2 dark:border-neutral-800">
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
                        <label htmlFor={inputId} className="cursor-pointer select-none text-sm dark:text-gray-300">
                          {c.name} <span className="text-xs text-gray-400">#{id}</span>
                        </label>
                      </div>
                    );
                  })
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">Категорий пока нет. Создайте в табе "Категории"</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Атрибуты</div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {attrGroups.map((g) => (
                <div key={g.id} className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800">
                  <div className="text-sm font-semibold mb-2 dark:text-white">{g.name}</div>
                  <div className="flex flex-col gap-2">
                    {(g.values || []).map((v) => {
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
                          <label htmlFor={inputId} className="cursor-pointer select-none text-sm dark:text-gray-300">
                            {v.name}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2 dark:text-gray-400">
              (Тип кожи / Назначение / Активы — можно расширять в табе "Атрибуты")
            </div>
          </div>

          {/* На мобильных text-base (16px), чтобы iOS не делал авто-зум при фокусе */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Название*</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Бренд</div>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
              placeholder="Например: COSRX"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Описание</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Цена*</div>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
                placeholder="например 8900"
              />
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Старая цена</div>
              <input
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
                placeholder="например 9500"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Себестоимость (опт) *</div>
            <input
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
              placeholder="3750"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Фото</div>
            
            {/* Превью: ограничиваем ширину, чтобы не растягивать страницу на мобильных */}
            {imagePreview && (
              <div className="mb-3 w-full max-w-full min-w-0 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="aspect-[4/3] relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Превью"
                    className="max-w-full h-full w-full object-contain"
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
                  id="image-upload"
                />
                <span
                  className={`inline-block rounded-xl border border-slate-200 px-4 py-2 text-sm cursor-pointer transition ${
                    uploadingImage
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-neutral-800 dark:text-gray-500'
                      : 'bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700'
                  }`}
                >
                  {uploadingImage ? 'Загрузка...' : '📷 Загрузить фото'}
                </span>
              </label>
              {uploadError && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{uploadError}</div>
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
                  if (trimmed) {
                    setImagePreview(trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed) ? trimmed : null);
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
            <label htmlFor="active" className="text-sm text-slate-700 dark:text-gray-300">
              Товар активен (виден в каталоге)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !price || !costPrice}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:bg-slate-300"
          >
            {loading ? 'Сохраняю...' : 'Создать'}
          </button>
        </form>
      )}
    </div>
  );
}
