import React from 'react';

export function BackdropDecor() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-slate-50">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-rose-100/50 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
    </div>
  );
}
