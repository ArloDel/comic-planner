import React from 'react';

export type { ExtendedStatus } from '@/lib/catalog';
import type { ExtendedStatus } from '@/lib/catalog';

export interface StatusStyle {
  label: string;
  badgeClasses: string;
  /** Kotak untuk grid volume / kartu status — lebih tegas dari pill. */
  boxClasses: string;
}

const SHIPPING: StatusStyle = {
  label: 'Sedang Dikirim',
  badgeClasses: 'text-primary-700',
  boxClasses: 'bg-primary-50 text-primary-800 border-primary-300',
};

export const STATUS_STYLES: Record<ExtendedStatus, StatusStyle> = {
  wishlist: {
    label: 'Wishlist',
    badgeClasses: 'text-neutral-600',
    boxClasses: 'bg-white text-neutral-900 border-neutral-900',
  },
  po: SHIPPING,
  dp: SHIPPING,
  lunas: SHIPPING,
  diterima: {
    label: 'Selesai',
    badgeClasses: 'text-emerald-700',
    boxClasses: 'bg-neutral-900 text-white border-neutral-900',
  },
  batal: {
    label: 'Batal',
    badgeClasses: 'text-rose-600',
    boxClasses: 'bg-white text-rose-600 border-rose-300 line-through',
  },
  'belum ada': {
    label: 'Belum Ada',
    badgeClasses: 'text-neutral-400',
    boxClasses: 'bg-white text-neutral-400 border-neutral-200 border-dashed',
  },
};

export function statusStyle(status: ExtendedStatus): StatusStyle {
  return STATUS_STYLES[status] ?? STATUS_STYLES['belum ada'];
}

interface StatusPillProps {
  status: ExtendedStatus;
  className?: string;
  size?: 'sm' | 'md';
}

/** Status sebagai titik + teks berwarna tinta; latar putih agar terbaca di atas sampul. */
export function StatusPill({ status, className = '', size = 'md' }: StatusPillProps) {
  const config = statusStyle(status);
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white font-medium select-none ${config.badgeClasses} ${sizeClasses} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
