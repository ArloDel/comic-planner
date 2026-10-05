import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, id, options, children, className = '', ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={`w-full bg-white/80 backdrop-blur border text-sm text-slate-900 px-3.5 py-2.5 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:border-primary-400 focus:ring-primary-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'
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
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
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
