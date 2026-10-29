'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

interface CoverImageProps {
  src?: string | null;
  alt: string;
  title?: string;
  className?: string;
  priority?: boolean;
}

export function CoverImage({
  src,
  alt,
  title,
  className = '',
  priority = false,
}: CoverImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const widthClass = /\bw-\S+/.test(className) ? '' : 'w-full';
  const aspectClass = /\b(aspect-|h-)\S+/.test(className) ? '' : 'aspect-[2/3]';
  const isCompact = /\bw-(10|12|14|16)\b/.test(className);

  // Jika URL tidak valid, belum diatur, atau terjadi error load
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
        className={`${aspectClass} ${widthClass} rounded-xl bg-gradient-to-br from-slate-100 to-indigo-100/60 border border-slate-200/60 flex flex-col items-center justify-center p-2 text-center select-none overflow-hidden ${className}`}
      >
        <BookOpen className={`${isCompact ? 'h-4 w-4' : 'h-8 w-8 mb-1'} text-primary-400 opacity-70`} />
        {initials && !isCompact ? (
          <span className="text-xs font-bold text-primary-700 tracking-wider line-clamp-1">
            {initials}
          </span>
        ) : null}
        {title && !isCompact ? (
          <span className="mt-1 text-[10px] text-slate-500 line-clamp-2 px-1 leading-tight">
            {title}
          </span>
        ) : null}
      </div>
    );
  }

  // Cek apakah gambar merupakan data URI atau blob lokal (unoptimized)
  const isLocalOrData = src.startsWith('data:') || src.startsWith('blob:');

  return (
    <div
      className={`relative ${aspectClass} ${widthClass} overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60 ${className}`}
    >
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 skeleton-shimmer bg-slate-200/70 z-10"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={
          isCompact
            ? '64px'
            : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw'
        }
        priority={priority}
        unoptimized={isLocalOrData}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`object-cover transition-all duration-300 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
        }`}
      />
    </div>
  );
}
