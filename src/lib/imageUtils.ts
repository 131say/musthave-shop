// src/lib/imageUtils.ts
// Утилиты для работы с вариантами изображений

type ImageVariant = 'thumb' | 'card' | 'large';

/**
 * Получает URL варианта изображения на основе базового URL
 * Если imageUrl уже содержит вариант (например, /images/products/123-abc-large.jpg),
 * заменяет его на нужный вариант.
 * Если imageUrl не содержит вариант (старые файлы), возвращает оригинал
 * (для обратной совместимости со старыми файлами).
 */
export function getImageVariant(imageUrl: string | null | undefined, variant: ImageVariant): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null;
  }

  // Если это внешний URL (начинается с http:// или https://), возвращаем как есть
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Если это не путь к изображению продукта, возвращаем как есть
  if (!imageUrl.startsWith('/images/products/')) {
    return imageUrl;
  }

  // Извлекаем базовое имя файла (без варианта)
  // Формат новых файлов: /images/products/1234567890-abc123-variant.jpg
  // Формат старых файлов: /images/products/1234567890-abc123.jpg
  const match = imageUrl.match(/^(\/images\/products\/\d+-[a-z0-9]+)(?:-(\w+))?\.(jpg|png|webp)$/i);
  
  if (match) {
    const [, basePath, existingVariant, ext] = match;
    
    // Если уже есть вариант, заменяем его
    if (existingVariant) {
      return `${basePath}-${variant}.${ext}`;
    }
    
    // Если варианта нет (старый файл), пытаемся найти вариант с таким же базовым именем
    // Но для обратной совместимости возвращаем оригинал, если вариант не найден
    // В будущем можно добавить проверку существования файла
    return imageUrl; // Возвращаем оригинал для старых файлов
  }

  // Если не удалось распарсить, возвращаем оригинал
  return imageUrl;
}

/**
 * Получает URL для карточки товара (400x400)
 */
export function getCardImage(imageUrl: string | null | undefined): string | null {
  return getImageVariant(imageUrl, 'card');
}

/**
 * Получает URL для миниатюры (200x200)
 */
export function getThumbImage(imageUrl: string | null | undefined): string | null {
  return getImageVariant(imageUrl, 'thumb');
}

/**
 * Получает URL для большого изображения (1200x1200)
 */
export function getLargeImage(imageUrl: string | null | undefined): string | null {
  return getImageVariant(imageUrl, 'large');
}
