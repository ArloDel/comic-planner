import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  solid?: boolean;
  children: React.ReactNode;
}

/**
 * Panel dasar. Nama dipertahankan demi kompatibilitas; tampilannya kini datar:
 * putih, garis rambut netral, tanpa blur maupun bayangan.
 */
export function GlassCard({ solid = false, className = '', children, ...props }: GlassCardProps) {
  const baseClasses = solid
    ? 'bg-white border border-neutral-200 rounded-glass'
    : 'bg-white border border-neutral-200 rounded-lg';

  return (
    <div className={`${baseClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}
