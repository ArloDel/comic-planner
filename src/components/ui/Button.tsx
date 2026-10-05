import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, disabled, className = '', children, ...props }, ref) => {
    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-soft focus-visible:ring-primary-500',
      secondary: 'bg-white/80 backdrop-blur border border-slate-200 text-slate-700 hover:border-primary-300 hover:bg-white focus-visible:ring-primary-400',
      ghost: 'text-primary-700 hover:bg-primary-50 focus-visible:ring-primary-400',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-soft',
    }[variant];

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[36px]',
      md: 'px-4 py-2 text-sm rounded-xl min-h-[44px]',
      lg: 'px-5 py-2.5 text-base rounded-xl min-h-[48px]',
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Memproses...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
