import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WarningBannerProps {
  title?: string;
  /** Deskripsi utama warning (mis. "Sisa aman −Rp 20.000..."). */
  children?: React.ReactNode;
  className?: string;
}

export function WarningBanner({
  title = 'Sisa aman minus',
  children,
  className = '',
}: WarningBannerProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur p-4 shadow-soft ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-600" aria-hidden="true" />
        <div className="min-w-0 text-sm text-rose-700">
          <p className="font-semibold">{title}</p>
          {children && <div className="mt-1 space-y-1.5">{children}</div>}
        </div>
      </div>
    </div>
  );
}
