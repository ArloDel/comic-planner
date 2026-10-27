'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { InlineLoadingBar } from './TopLoadingBar';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  isLoading = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // `onClose` sering inline arrow di pemanggil; disimpan di ref supaya effect
  // utama tidak re-run (dan fokus tidak pindah-pindah) tiap render.
  const onCloseRef = useRef(onClose);
  const [hasChildLoading, setHasChildLoading] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    focusables()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  // Pantau jika ada tombol/elemen di dalam modal yang sedang loading ([data-loading="true"])
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const checkLoading = () => {
      const loadingEl = panelRef.current?.querySelector('[data-loading="true"]');
      setHasChildLoading(Boolean(loadingEl));
    };

    checkLoading();
    const observer = new MutationObserver(checkLoading);
    observer.observe(panelRef.current, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-loading'],
    });

    return () => observer.disconnect();
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={() => onCloseRef.current()}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={panelRef}
        className={`relative overflow-hidden w-full ${maxWidthClasses} bg-white/90 backdrop-blur-xl border border-white/80 shadow-glass-lg rounded-glass p-5 sm:p-6 z-10 my-auto`}
      >
        <InlineLoadingBar isLoading={isLoading || hasChildLoading} />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-xs text-slate-500 leading-normal">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Tutup"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
