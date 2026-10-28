import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton, StatCardSkeleton, TransactionRowSkeleton } from '@/components/ui/Skeleton';

export default function BudgetLoading() {
  return (
    <AppShell
      pageTitle="Budget & Transaksi"
      pageSubtitle="Realisasi pengeluaran dan sisa aman tiap bulan"
    >
      <div className="space-y-6" role="status" aria-label="Memuat budget dan transaksi">
        {/* Periode nav skeleton */}
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>

        {/* 3 Budget summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Transactions list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-xl" />
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
