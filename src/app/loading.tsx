import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton, StatCardSkeleton, TransactionRowSkeleton } from '@/components/ui/Skeleton';

export default function GlobalLoading() {
  return (
    <AppShell
      pageTitle="Dashboard"
      pageSubtitle="Memuat ringkasan anggaran & aktivitas terbaru…"
    >
      <div
        role="status"
        aria-label="Memuat halaman"
        className="fixed top-0 left-0 right-0 z-[100] h-[3px] overflow-hidden"
      >
        <div className="h-full w-4/5 yt-indeterminate-bar yt-loading-bar-glow transition-all duration-300" />
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <section className="space-y-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <TransactionRowSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
