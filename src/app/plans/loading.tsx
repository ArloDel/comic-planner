import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PlanCardSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function PlansLoading() {
  return (
    <AppShell
      pageTitle="Rencana Belanja"
      pageSubtitle="Alur status Wishlist → Sedang Dikirim → Selesai, dengan riwayat tiap perubahan"
    >
      <div className="space-y-6" role="status" aria-label="Memuat rencana belanja">
        {/* Header: search + action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>

        {/* Filter chips & sorting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-full shrink-0" />
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <Skeleton className="h-8 w-52 rounded-lg" />
          </div>
        </div>

        {/* Plans list skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
