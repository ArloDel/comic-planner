import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SeriLoading() {
  return (
    <AppShell
      pageTitle="Memuat Seri…"
      pageSubtitle="Memuat tracker progres volume seri komik"
    >
      <div className="space-y-6" role="status" aria-label="Memuat detail seri">
        <Skeleton className="h-4 w-36 rounded-md" />

        {/* Series Hero Card Skeleton */}
        <GlassCard className="p-5 sm:p-6 space-y-5" solid>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-8 w-56 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-7 w-28 rounded-full" />
            ))}
          </div>
        </GlassCard>

        {/* Volume Visual Tracker Grid Skeleton */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <GlassCard className="p-4 sm:p-5">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 sm:gap-2.5">
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Detailed Volumes List Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-52 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Array.from({ length: 6 }, (_, i) => (
              <GlassCard key={i} className="p-3.5 flex items-center gap-3.5">
                <Skeleton className="w-14 aspect-[2/3] shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
