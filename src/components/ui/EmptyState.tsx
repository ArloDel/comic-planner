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
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-neutral-300 bg-white ${className}`}
    >
      <div className="flex items-center justify-center text-neutral-300 mb-4 [&_svg]:h-8 [&_svg]:w-8">
        {icon || <BookOpen className="h-7 w-7" />}
      </div>
      <h3 className="text-base font-medium text-neutral-900">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-neutral-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {href && hrefLabel && (
        <div className="mt-5">
          <Link href={href} className={buttonClasses('secondary', 'sm')}>
            {hrefLabel}
          </Link>
        </div>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
