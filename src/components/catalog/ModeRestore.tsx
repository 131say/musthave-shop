"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MODE_STORAGE_KEY = "musthave_mode";

// Компонент для восстановления режима из localStorage при первой загрузке
export default function ModeRestore() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Проверяем, есть ли уже параметр expert в URL
    const hasExpertParam = searchParams.get("expert") === "1";
    
    // Если параметра нет, проверяем localStorage
    if (!hasExpertParam && typeof window !== "undefined") {
      const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
      
      // Если был сохранён Expert, восстанавливаем его
      if (savedMode === "expert") {
        const params = new URLSearchParams(searchParams.toString());
        params.set("expert", "1");
        router.replace(`/catalog?${params.toString()}`);
      }
    }
  }, []); // Только при монтировании

  return null;
}



