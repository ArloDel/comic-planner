import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton, StatCardSkeleton, TransactionRowSkeleton } from '@/components/ui/Skeleton';

export default function BudgetLoading() {
  return (
    <AppShell
      pageTitle="Budget & Transaksi"
      pageSubtitle="Realisasi pengeluaran, sisa aman tiap bulan, dan rekapitulasi tahunan"
    >
      <div className="space-y-6" role="status" aria-label="Memuat budget dan transaksi">
        {/* Periode nav skeleton */}
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>

        {/* 3 Budget summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Yearly spending chart skeleton */}
        <GlassCard className="p-4 sm:p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-56 rounded-md" />
              <Skeleton className="h-3.5 w-72 rounded-md" />
            </div>
            <Skeleton className="h-8 w-40 rounded-md" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
          <Skeleton className="h-56 w-full rounded-lg" />
        </GlassCard>

        {/* Transactions list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <TransactionRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
