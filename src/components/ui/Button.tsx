import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-700',
  secondary:
    'bg-white border border-neutral-300 text-neutral-800 hover:border-neutral-900',
  ghost: 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100',
  danger: 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-600 hover:border-rose-600 hover:text-white',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-card min-h-[36px] gap-1.5',
  md: 'px-4 py-2 text-sm rounded-card min-h-[44px] gap-2',
  lg: 'px-5 py-2.5 text-base rounded-card min-h-[48px] gap-2',
};

/**
 * Kelas tombol sebagai string, supaya `<Link>` bisa tampil seperti tombol tanpa
 * membungkus `<button>` di dalam `<a>` (nested interactive element, invalid HTML).
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = ''
): string {
  return `relative overflow-hidden inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed select-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', isLoading = false, disabled, className = '', children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      data-loading={isLoading ? 'true' : undefined}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span>Memproses...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
);

Button.displayName = 'Button';
