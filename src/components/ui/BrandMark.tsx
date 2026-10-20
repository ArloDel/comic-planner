import React from 'react';

interface BrandMarkProps {
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Logo vektor ComicPlan (buku manga berpanel + pita bookmark + tanda centang
 * planner). Selaras dengan `src/app/icon.svg` (favicon).
 */
export function BrandMark({ size = 'md', className = '' }: BrandMarkProps) {
  const sizeClass = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden shadow-soft select-none ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <defs>
          <linearGradient id="cp-brand-bg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="55%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#3730a3" />
          </linearGradient>
          <linearGradient id="cp-brand-page" x1="18" y1="16" x2="46" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
        </defs>

        <rect width="64" height="64" fill="url(#cp-brand-bg)" />
        <rect
          x="1"
          y="1"
          width="62"
          height="62"
          rx="14"
          stroke="#ffffff"
          strokeOpacity="0.22"
          strokeWidth="1.5"
        />

        {/* Back comic volume */}
        <rect
          x="22"
          y="13"
          width="24"
          height="34"
          rx="4"
          transform="rotate(6 22 13)"
          fill="#a5b4fc"
          fillOpacity="0.35"
        />

        {/* Main comic book cover */}
        <rect x="17" y="15" width="26" height="34" rx="4.5" fill="url(#cp-brand-page)" />

        {/* Spine groove */}
        <path
          d="M22 15.5V48.5"
          stroke="#6366f1"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Manga panel lines */}
        <rect x="25.5" y="20" width="13.5" height="8" rx="1.75" fill="#4f46e5" fillOpacity="0.16" />
        <rect x="25.5" y="30.5" width="6" height="9" rx="1.5" fill="#4f46e5" fillOpacity="0.12" />
        <rect x="33" y="30.5" width="6" height="9" rx="1.5" fill="#4f46e5" fillOpacity="0.12" />

        {/* Bookmark ribbon */}
        <path d="M35.5 15V24.5L38 22.7L40.5 24.5V15H35.5Z" fill="#4f46e5" />

        {/* Planner check badge */}
        <circle cx="43" cy="44" r="9" fill="#312e81" />
        <circle cx="43" cy="44" r="7.5" fill="#ffffff" />
        <path
          d="M39.8 44.1L42.1 46.4L46.5 41.8"
          stroke="#4f46e5"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
