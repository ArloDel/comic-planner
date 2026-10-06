import React from 'react';

interface ProgressBarProps {
  /** 0..100 — di-clamp otomatis. */
  percent: number;
  tone?: 'primary' | 'emerald' | 'rose' | 'amber' | 'sky';
  className?: string;
  /** Label kiri/kanan di bawah bar (mis. "Dibayar" / "Rp 45.000"). */
  leftLabel?: React.ReactNode;
  rightLabel?: React.ReactNode;
}

const toneClasses: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  primary: 'bg-primary-600',
  emerald: 'bg-emerald-600',
  rose: 'bg-rose-600',
  amber: 'bg-amber-500',
  sky: 'bg-sky-600',
};

export function ProgressBar({
  percent,
  tone = 'primary',
  className = '',
  leftLabel,
  rightLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`w-full ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${toneClasses[tone]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {(leftLabel || rightLabel) && (
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>{leftLabel}</span>
          <span className="tabular-nums">{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
