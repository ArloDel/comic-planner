import React from 'react';

interface BrandMarkProps {
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Logo ComicPlan versi minimal: satu volume komik bergaris tinta dengan
 * pita bookmark ai-iro. Selaras dengan `src/app/icon.svg` dan beradaptasi
 * otomatis dengan mode terang/gelap.
 */
export function BrandMark({ size = 'md', className = '' }: BrandMarkProps) {
  const sizeClass = size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center select-none text-neutral-900 ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="7" y="4" width="18" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M11 4.5V27.5" stroke="currentColor" strokeWidth="2" />
        <path d="M18 4V12L20.5 10.25L23 12V4" className="fill-primary-600" />
      </svg>
    </div>
  );
}
