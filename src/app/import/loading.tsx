import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton, StatCardSkeleton } from '@/components/ui/Skeleton';

export default function ImportLoading() {
  return (
    <AppShell
      pageTitle="Impor Shopee"
      pageSubtitle="Sinkronisasi katalog komik sekali klik lewat userscript Tampermonkey"
    >
      <div className="space-y-6" role="status" aria-label="Memuat halaman impor">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <GlassCard className="p-5 lg:col-span-7 space-y-4">
            <Skeleton className="h-5 w-52 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-44 rounded-xl" />
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-5 space-y-4">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </GlassCard>
        </div>

        <div className="space-y-2.5">
          <Skeleton className="h-5 w-48 rounded-md" />
          <GlassCard className="divide-y divide-slate-100 p-0 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <Skeleton className="h-4 w-56 rounded-md" />
                <Skeleton className="h-4 w-36 rounded-md" />
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
