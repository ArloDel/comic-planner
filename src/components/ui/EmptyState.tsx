import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Button, buttonClasses } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** CTA sebagai tombol dengan handler `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
  /** CTA sebagai `<Link>` ke route internal — dipakai bila aksinya pindah halaman. */
  href?: string;
  hrefLabel?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  href,
  hrefLabel,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white/40 backdrop-blur ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-400 mb-3 shadow-inner">
        {icon || <BookOpen className="h-7 w-7" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {href && hrefLabel && (
        <div className="mt-4">
          <Link href={href} className={buttonClasses('secondary', 'sm')}>
            {hrefLabel}
          </Link>
        </div>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
