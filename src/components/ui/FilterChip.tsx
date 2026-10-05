import React from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  className?: string;
}

export function FilterChip({ label, active, onClick, count, className = '' }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 select-none min-h-[32px] ${
        active
          ? 'border-primary-300 bg-primary-600/10 text-primary-700 font-semibold shadow-xs ring-1 ring-primary-500/20'
          : 'border-slate-200 bg-white/70 backdrop-blur text-slate-600 hover:bg-white hover:text-slate-900'
      } ${className}`}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
            active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
