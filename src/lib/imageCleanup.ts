// src/lib/imageCleanup.ts
// Утилиты для очистки старых файлов изображений

import fs from 'fs/promises';
import path from 'path';

/**
 * Извлекает базовое имя файла из URL варианта изображения
 * Пример: /images/products/1234567890-abc123-large.jpg -> 1234567890-abc123
 */
function extractBaseName(imageUrl: string): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null;
  }

  // Только для локальных файлов
  if (!imageUrl.startsWith('/images/products/')) {
    return null;
  }

  // Формат: /images/products/1234567890-abc123-variant.jpg
  const match = imageUrl.match(/^\/images\/products\/(\d+-[a-z0-9]+)(?:-(\w+))?\.(jpg|png|webp)$/i);
  
  if (match) {
    return match[1]; // базовое имя без варианта
  }

  // Старый формат без варианта: /images/products/1234567890-abc123.jpg
  const oldMatch = imageUrl.match(/^\/images\/products\/(\d+-[a-z0-9]+)\.(jpg|png|webp)$/i);
  if (oldMatch) {
    return oldMatch[1];
  }

  return null;
}

/**
 * Удаляет все варианты изображения (thumb, card, large) по базовому имени
 */
export async function deleteImageVariants(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const baseName = extractBaseName(imageUrl);
  if (!baseName) {
    return; // Внешний URL или не удалось распарсить
  }

  const productsDir = path.join(process.cwd(), 'public', 'images', 'products');
  const variants = ['thumb', 'card', 'large'];
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];

  // Пытаемся удалить все возможные комбинации вариантов и расширений
  const deletePromises: Promise<void>[] = [];

  for (const variant of variants) {
    for (const ext of extensions) {
      const fileName = `${baseName}-${variant}.${ext}`;
      const filePath = path.join(productsDir, fileName);
      
      deletePromises.push(
        fs.unlink(filePath).catch((err: any) => {
          // Игнорируем ошибки "файл не найден"
          if (err.code !== 'ENOENT') {
            console.error(`Error deleting ${fileName}:`, err);
          }
        })
      );
    }
  }

  // Также пытаемся удалить старый файл без варианта (для обратной совместимости)
  for (const ext of extensions) {
    const fileName = `${baseName}.${ext}`;
    const filePath = path.join(productsDir, fileName);
    
    deletePromises.push(
      fs.unlink(filePath).catch((err: any) => {
        if (err.code !== 'ENOENT') {
          console.error(`Error deleting ${fileName}:`, err);
        }
      })
    );
  }

  await Promise.all(deletePromises);
}
