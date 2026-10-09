import React from 'react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Ikon lucide — dirender dalam chip berwarna. */
  icon: React.ReactNode;
  iconTone?: 'primary' | 'amber' | 'emerald' | 'rose' | 'sky';
  /** Nilai negatif (mis. sisa aman < 0) → teks rose. */
  valueTone?: 'default' | 'emerald' | 'rose' | 'amber';
  /** Konten di bawah nilai (mis. ProgressBar). */
  children?: React.ReactNode;
  className?: string;
}

const iconChip: Record<NonNullable<StatCardProps['iconTone']>, string> = {
  primary: 'bg-primary-600/10 text-primary-600',
  amber: 'bg-amber-500/10 text-amber-600',
  emerald: 'bg-emerald-600/10 text-emerald-600',
  rose: 'bg-rose-600/10 text-rose-600',
  sky: 'bg-sky-600/10 text-sky-600',
};

const valueToneClasses: Record<NonNullable<StatCardProps['valueTone']>, string> = {
  default: 'text-slate-900',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
  amber: 'text-amber-600',
};

export function StatCard({
  label,
  value,
  icon,
  iconTone = 'primary',
  valueTone = 'default',
  children,
  className = '',
}: StatCardProps) {
  return (
    <GlassCard className={`p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p
            className={`mt-1.5 truncate text-2xl font-bold tabular-nums ${valueToneClasses[valueTone]}`}
          >
            {value}
          </p>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconChip[iconTone]}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </GlassCard>
  );
}
