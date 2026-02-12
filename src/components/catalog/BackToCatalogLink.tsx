"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";

export default function BackToCatalogLink({ 
  className, 
  children 
}: { 
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [href, setHref] = useState("/catalog");

  useEffect(() => {
    try {
      // Получаем сохраненные параметры каталога из localStorage
      const savedParams = localStorage.getItem("musthave_catalog_params");
      if (savedParams) {
        const params = JSON.parse(savedParams);
        const urlParams = new URLSearchParams();
        
        // Восстанавливаем все параметры
        Object.entries(params).forEach(([key, value]) => {
          if (value && typeof value === "string") {
            urlParams.set(key, value);
          }
        });
        
        const queryString = urlParams.toString();
        setHref(queryString ? `/catalog?${queryString}` : "/catalog");
      }
    } catch (e) {
      // Если ошибка - просто используем /catalog
      setHref("/catalog");
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children || "← Назад в каталог"}
    </a>
  );
}

