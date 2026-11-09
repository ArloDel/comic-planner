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
      className={`rounded-lg border border-rose-200 border-l-2 border-l-rose-600 bg-white p-4 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-600" aria-hidden="true" />
        <div className="min-w-0 text-sm text-neutral-700">
          <p className="font-medium text-rose-700">{title}</p>
          {children && <div className="mt-1 space-y-1.5">{children}</div>}
        </div>
      </div>
    </div>
  );
}
