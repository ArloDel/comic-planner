'use client';

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface CoverImageProps {
  src?: string | null;
  alt: string;
  title?: string;
  className?: string;
}

export function CoverImage({ src, alt, title, className = '' }: CoverImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If no source or error occurred, render styled fallback
  if (!src || error) {
    const initials = title
      ? title
          .split(' ')
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
          .toUpperCase()
      : '';

    return (
      <div
        className={`aspect-[2/3] w-full rounded-xl bg-gradient-to-br from-slate-100 to-indigo-100/60 border border-slate-200/60 flex flex-col items-center justify-center p-3 text-center select-none overflow-hidden ${className}`}
      >
        <BookOpen className="h-8 w-8 text-primary-400 mb-1 opacity-70" />
        {initials ? (
          <span className="text-xs font-bold text-primary-700 tracking-wider line-clamp-1">
            {initials}
          </span>
        ) : null}
        {title ? (
          <span className="mt-1 text-[10px] text-slate-500 line-clamp-2 px-1 leading-tight">
            {title}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60 ${className}`}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200/70" />}
      {/* Using standard img for external marketplace images without requiring domain whitelist in next.config.ts */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
      />
    </div>
  );
}
