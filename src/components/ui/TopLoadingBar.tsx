'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type Listener = (activeCount: number) => void;

let activeTasks = 0;
let domLoadingActive = false;
let routeLoading = false;
let routeTimeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function notify() {
  const total = activeTasks + (routeLoading ? 1 : 0) + (domLoadingActive ? 1 : 0);
  listeners.forEach((fn) => fn(total));
}

/**
 * Mulai animasi YouTube-style top loading bar secara imperatif.
 */
export function triggerLoadingStart() {
  activeTasks += 1;
  notify();
}

/**
 * Selesaikan satu proses loading aktif.
 */
export function triggerLoadingDone() {
  activeTasks = Math.max(0, activeTasks - 1);
  notify();
}

/**
 * Mulai loading khusus perpindahan rute halaman.
 */
export function triggerRouteLoadingStart() {
  if (routeTimeout) clearTimeout(routeTimeout);
  routeLoading = true;
  notify();
  // Safety timeout agar tidak menggantung jika navigasi dibatalkan
  routeTimeout = setTimeout(() => {
    routeLoading = false;
    notify();
  }, 8000);
}

/**
 * Selesaikan loading perpindahan rute halaman.
 */
export function triggerRouteLoadingDone() {
  if (routeTimeout) {
    clearTimeout(routeTimeout);
    routeTimeout = null;
  }
  if (routeLoading) {
    routeLoading = false;
    notify();
  }
}

/**
 * Komponen internal pemantau perubahan URL (Pathname & SearchParams).
 */
function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    triggerRouteLoadingDone();
  }, [pathname, searchParams]);

  return null;
}

/**
 * YouTube-style Top Progress Bar (Global).
 * Otomatis menyala saat:
 * 1. Klik link navigasi antar halaman
 * 2. Request fetch / Server Action berlangsung
 * 3. Elemen dengan atribut `data-loading="true"` (seperti Button isLoading) aktif di DOM
 */
export function TopLoadingBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Subscribe ke perubahan jumlah proses loading aktif
  useEffect(() => {
    const handleUpdate: Listener = (count) => {
      setIsActive(count > 0);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  // Intercept klik Link internal, window.fetch, dan pantau elemen [data-loading="true"]
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleDocumentClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        const currentFull = window.location.pathname + window.location.search;
        const nextFull = url.pathname + url.search;
        if (currentFull !== nextFull) {
          triggerRouteLoadingStart();
        }
      } catch {
        // Abaikan URL tidak valid
      }
    }

    // Intercept global fetch agar semua API request & Server Actions memicu loading bar
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      triggerLoadingStart();
      try {
        return await originalFetch.apply(this, args);
      } finally {
        triggerLoadingDone();
      }
    };

    // Pantau elemen dengan atribut data-loading="true" (Button / Modal / Form)
    const checkDomLoading = () => {
      const hasLoadingEl = Boolean(document.querySelector('[data-loading="true"]'));
      if (hasLoadingEl !== domLoadingActive) {
        domLoadingActive = hasLoadingEl;
        notify();
      }
    };

    const observer = new MutationObserver(checkDomLoading);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-loading'],
    });

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      window.fetch = originalFetch;
      observer.disconnect();
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, []);

  // Efek trickle progress ala YouTube
  useEffect(() => {
    let trickleInterval: ReturnType<typeof setInterval> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    if (isActive) {
      setVisible(true);
      setProgress((prev) => (prev <= 0 || prev >= 100 ? 22 : prev));

      trickleInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          const remaining = 92 - prev;
          const step = Math.max(1.2, remaining * 0.14);
          return Math.min(92, Number((prev + step).toFixed(1)));
        });
      }, 220);
    } else {
      setProgress((prev) => (prev > 0 ? 100 : 0));
      hideTimer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setProgress(0), 200);
      }, 240);
    }

    return () => {
      if (trickleInterval) clearInterval(trickleInterval);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isActive]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>

      <div
        role="progressbar"
        aria-label="Memuat proses"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-hidden={!visible}
        className={`pointer-events-none fixed top-0 left-0 right-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="h-full yt-indeterminate-bar yt-loading-bar-glow transition-all duration-200 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          {/* Ujung kanan bercahaya (YouTube tip flare) */}
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-indigo-300/70 to-white opacity-90 blur-[1px]" />
        </div>
      </div>
    </>
  );
}

/**
 * Komponen Loading Bar Lokal (untuk ditempel di bagian atas Modal atau Kartu).
 */
export function InlineLoadingBar({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isLoading) {
      setVisible(true);
      setProgress(25);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return Math.min(90, prev + Math.max(1.5, (90 - prev) * 0.15));
        });
      }, 200);
    } else {
      setProgress((prev) => (prev > 0 ? 100 : 0));
      timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setProgress(0), 200);
      }, 220);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-0 left-0 right-0 z-20 h-[3px] overflow-hidden transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="h-full yt-indeterminate-bar yt-loading-bar-glow transition-all duration-200 ease-out relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-white/90" />
      </div>
    </div>
  );
}
