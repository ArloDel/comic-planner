'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';

interface CoverImageProps {
  src?: string | null;
  alt: string;
  title?: string;
  className?: string;
}

export function CoverImage({ src, alt, title, className = '' }: CoverImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const widthClass = /\bw-\S+/.test(className) ? '' : 'w-full';
  const aspectClass = /\b(aspect-|h-)\S+/.test(className) ? '' : 'aspect-[2/3]';
  const isCompact = /\bw-(10|12|14|16)\b/.test(className);

  useEffect(() => {
    if (!src || inView) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src, inView]);

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

  return (
    <div
      ref={containerRef}
      className={`relative ${aspectClass} ${widthClass} overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60 ${className}`}
    >
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 skeleton-shimmer bg-slate-200/70"
        />
      )}
      {inView && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`h-full w-full object-cover transition-all duration-300 ${
            loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
          }`}
        />
      )}
    </div>
  );
}
