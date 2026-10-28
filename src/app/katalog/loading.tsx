import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ComicCardSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function KatalogLoading() {
  return (
    <AppShell
      pageTitle="Katalog Komik"
      pageSubtitle="Memuat daftar koleksi komik dan status perolehan…"
    >
      <div className="space-y-6" role="status" aria-label="Memuat katalog komik">
        {/* Top search & button bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <Skeleton className="h-10 w-full sm:w-36 rounded-xl" />
        </div>

        {/* Series chips bar */}
        <div className="flex items-center gap-2 overflow-hidden">
          <Skeleton className="h-6 w-24 rounded-full shrink-0" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-28 rounded-full shrink-0" />
          ))}
        </div>

        {/* Filter chips & sorting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-8 w-44 rounded-lg" />
          </div>
        </div>

        {/* Items Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
          {Array.from({ length: 10 }, (_, i) => (
            <ComicCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
