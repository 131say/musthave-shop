'use client';

import { useState } from 'react';

export default function ProductImage({ 
  imageUrl, 
  alt, 
  className 
}: { 
  imageUrl: string | null; 
  alt: string; 
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (!imageUrl || !imageUrl.startsWith('/') || imgError) {
    return (
      <div className={`flex items-center justify-center ${className || ''}`}>
        <div className="text-[10px] text-slate-400 dark:text-gray-500">фото</div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      className={className || 'h-full w-full object-cover'}
      onError={() => {
        setImgError(true);
      }}
      loading="lazy"
    />
  );
}
