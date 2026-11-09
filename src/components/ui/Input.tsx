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
          <label htmlFor={inputId} className="block text-xs font-medium text-neutral-600 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={`w-full bg-white border text-sm text-neutral-900 placeholder:text-neutral-400 px-3 py-2.5 rounded-card transition-colors duration-150 focus:outline-none focus:border-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed ${
            error ? 'border-rose-400' : 'border-neutral-300'
          } ${className}`}
          {...props}
        />
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

Input.displayName = 'Input';
