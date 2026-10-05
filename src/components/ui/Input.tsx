import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={`w-full bg-white/80 backdrop-blur border text-sm text-slate-900 placeholder:text-slate-400 px-3.5 py-2.5 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:border-primary-400 focus:ring-primary-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'
          } ${className}`}
          {...props}
        />
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

Input.displayName = 'Input';
