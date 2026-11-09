import React from 'react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Ikon lucide — tampil kecil dan tenang di samping label. */
  icon: React.ReactNode;
  iconTone?: 'primary' | 'amber' | 'emerald' | 'rose' | 'sky';
  /** Nilai negatif (mis. sisa aman < 0) → teks rose. */
  valueTone?: 'default' | 'emerald' | 'rose' | 'amber';
  /** Konten di bawah nilai (mis. ProgressBar). */
  children?: React.ReactNode;
  className?: string;
}

const iconToneClasses: Record<NonNullable<StatCardProps['iconTone']>, string> = {
  primary: 'text-neutral-400',
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
  sky: 'text-neutral-400',
};

const valueToneClasses: Record<NonNullable<StatCardProps['valueTone']>, string> = {
  default: 'text-neutral-900',
  emerald: 'text-emerald-700',
  rose: 'text-rose-600',
  amber: 'text-amber-700',
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
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span
          className={`inline-flex shrink-0 [&_svg]:h-4 [&_svg]:w-4 ${iconToneClasses[iconTone]}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <p className="truncate">{label}</p>
      </div>
      <p
        className={`mt-3 truncate text-2xl sm:text-[1.75rem] font-medium leading-none tabular-nums ${valueToneClasses[valueTone]}`}
      >
        {value}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </GlassCard>
  );
}
