"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const REF_STORAGE_KEY = "musthave_referral_ref";

/**
 * Компонент для сохранения реферального кода из URL в localStorage
 * Сохраняет ref при заходе на сайт, чтобы использовать при регистрации/заказе
 * 
 * Правило: не перезаписывает существующий ref (защита от случайной перепривязки)
 */
export default function ReferralRefHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const ref = searchParams.get("ref");
    
    if (ref && ref.trim()) {
      // Проверяем, есть ли уже сохранённый ref
      const existingRef = localStorage.getItem(REF_STORAGE_KEY);
      
      // Не перезаписываем, если ref уже сохранён (защита от случайной перепривязки)
      // Перезапись возможна только если пользователь вручную ввёл код
      if (!existingRef) {
        localStorage.setItem(REF_STORAGE_KEY, ref.trim());
      }
    }
  }, [searchParams]);

  return null; // Компонент не рендерит ничего
}
