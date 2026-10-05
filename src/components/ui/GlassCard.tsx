import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  solid?: boolean;
  children: React.ReactNode;
}

export function GlassCard({ solid = false, className = '', children, ...props }: GlassCardProps) {
  const baseClasses = solid
    ? 'bg-white/85 backdrop-blur-xl border border-white/60 shadow-glass-lg rounded-glass'
    : 'bg-white/70 backdrop-blur-xl border border-white/60 shadow-glass rounded-2xl';

  return (
    <div className={`${baseClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}
