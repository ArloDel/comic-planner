import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** `compact` untuk select filter di baris toolbar, penuh untuk form. */
  compact?: boolean;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, id, compact = false, options, children, className = '', ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const widthClass = compact ? 'w-auto' : 'w-full';
    const sizeClass = compact
      ? 'px-2.5 py-1.5 text-xs rounded-card min-h-[36px]'
      : 'px-3 py-2.5 text-sm rounded-card min-h-[44px]';

    return (
      <div className={widthClass}>
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-neutral-600 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={`${widthClass} bg-white border text-neutral-900 transition-colors duration-150 focus:outline-none focus:border-neutral-900 disabled:bg-neutral-50 disabled:cursor-not-allowed ${sizeClass} ${
            error ? 'border-rose-400' : 'border-neutral-300'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {hint && !error && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
        {error && (
          <p role="alert" className="mt-1 text-xs text-rose-600 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
