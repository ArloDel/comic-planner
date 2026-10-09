'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface ToastState {
  title: string;
  description?: string;
  tone: 'success' | 'error';
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return {
    toast,
    showToast: (t: ToastState) => setToast(t),
    dismissToast: () => setToast(null),
  };
}

export function ToastHost({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  if (!toast) return null;

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="fixed top-4 inset-x-4 lg:left-auto lg:right-4 lg:w-80 z-[60] flex items-start gap-2.5 rounded-xl border border-white/60 bg-white/90 backdrop-blur-xl p-3.5 shadow-glass-lg"
    >
      {toast.tone === 'success' ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-slate-500">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
