import React from 'react';
import type { PlanStatus, ListingStatus } from '@/types/database';

export type ExtendedStatus = PlanStatus | 'belum ada';

interface StatusPillProps {
  status: ExtendedStatus;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  ExtendedStatus,
  { label: string; badgeClasses: string }
> = {
  wishlist: {
    label: 'Wishlist',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  po: {
    label: 'Pre-Order',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  dp: {
    label: 'DP Dibayar',
    badgeClasses: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  lunas: {
    label: 'Lunas',
    badgeClasses: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  diterima: {
    label: 'Punya',
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  batal: {
    label: 'Batal',
    badgeClasses: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  'belum ada': {
    label: 'Belum Ada',
    badgeClasses: 'bg-slate-50/90 text-slate-500 border-slate-300 border-dashed',
  },
};

export function StatusPill({ status, className = '', size = 'md' }: StatusPillProps) {
  const config = statusConfig[status] || statusConfig['belum ada'];
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
