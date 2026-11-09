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
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors duration-150 select-none min-h-[32px] ${
        active
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
      } ${className}`}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className={`tabular-nums ${active ? 'text-neutral-300' : 'text-neutral-400'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
