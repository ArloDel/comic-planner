'use client';

import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onDebouncedChange?: (val: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  debounceMs?: number;
}

export function SearchBar({
  value: controlledValue,
  onDebouncedChange,
  onChange,
  onClear,
  debounceMs = 200,
  placeholder = 'Cari judul, seri, atau nomor volume...',
  className = '',
  ...props
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue);

  // Sinkronkan nilai jika controlledValue dari parent berubah secara eksternal (misal: tombol reset)
  useEffect(() => {
    setInternalValue(controlledValue);
  }, [controlledValue]);

  // Efek debounce timer
  useEffect(() => {
    if (!onDebouncedChange) return;
    const timer = setTimeout(() => {
      if (internalValue !== controlledValue) {
        onDebouncedChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onDebouncedChange, controlledValue]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextVal = e.target.value;
    setInternalValue(nextVal);
    onChange?.(e);
  }

  function handleClear() {
    setInternalValue('');
    onDebouncedChange?.('');
    onClear?.();
  }

  return (
    <div className={`relative w-full ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-white border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 pl-10 pr-9 py-2.5 rounded-card transition-colors duration-150 focus:outline-none focus:border-neutral-900"
        {...props}
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Hapus pencarian"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
