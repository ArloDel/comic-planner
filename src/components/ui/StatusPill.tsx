import React from 'react';
import type { ListingStatus } from '@/types/database';

export type { ExtendedStatus } from '@/lib/catalog';
import type { ExtendedStatus } from '@/lib/catalog';

export interface StatusStyle {
  label: string;
  badgeClasses: string;
  /** Kotak solid untuk grid volume / kartu status — lebih tegas dari pill. */
  boxClasses: string;
}

export const STATUS_STYLES: Record<ExtendedStatus, StatusStyle> = {
  wishlist: {
    label: 'Wishlist',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200',
    boxClasses: 'bg-primary-50 text-primary-800 border-primary-200 ring-1 ring-primary-500/20',
  },
  po: {
    label: 'Pre-Order',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200',
    boxClasses: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20',
  },
  dp: {
    label: 'DP Dibayar',
    badgeClasses: 'bg-violet-50 text-violet-800 border-violet-200',
    boxClasses: 'bg-violet-50 text-violet-800 border-violet-300 ring-1 ring-violet-500/20',
  },
  lunas: {
    label: 'Lunas',
    badgeClasses: 'bg-sky-50 text-sky-800 border-sky-200',
    boxClasses: 'bg-sky-50 text-sky-800 border-sky-300 ring-1 ring-sky-500/20',
  },
  diterima: {
    label: 'Punya',
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    boxClasses: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20',
  },
  batal: {
    label: 'Batal',
    badgeClasses: 'bg-rose-50 text-rose-700 border-rose-200',
    boxClasses: 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-500/20',
  },
  'belum ada': {
    label: 'Belum Ada',
    badgeClasses: 'bg-slate-50/90 text-slate-500 border-slate-300 border-dashed',
    boxClasses: 'bg-slate-100 text-slate-700 border-slate-200',
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

export function StatusPill({ status, className = '', size = 'md' }: StatusPillProps) {
  const config = statusStyle(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-tight shadow-sm select-none ${config.badgeClasses} ${sizeClasses} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      <span>{config.label}</span>
    </span>
  );
}

export function ListingStatusDot({ status }: { status: ListingStatus }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      PO
    </span>
  );
}
