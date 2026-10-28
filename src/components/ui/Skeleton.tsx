import React from 'react';
import { GlassCard } from './GlassCard';

interface SkeletonProps {
  className?: string;
}

/**
 * Komponen primitif Skeleton dengan efek shimmer halus.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded-lg bg-slate-200/70 ${className}`}
    />
  );
}

/**
 * Skeleton untuk StatCard (dipakai di Dashboard, Budget, Impor).
 */
export function StatCardSkeleton() {
  return (
    <GlassCard className="p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-24 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-32 rounded-lg" />
      <Skeleton className="h-3 w-40 rounded-md" />
    </GlassCard>
  );
}

/**
 * Skeleton untuk kartu komik vertikal di Katalog & Dashboard Publik (rasio cover 2:3).
 */
export function ComicCardSkeleton() {
  return (
    <GlassCard className="flex flex-col p-2.5 sm:p-3 space-y-2.5">
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-xl">
        <Skeleton className="h-full w-full rounded-xl" />
        <Skeleton className="absolute top-2 left-2 h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5 pt-0.5">
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-3.5 w-2/3 rounded-md" />
      </div>
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-20 rounded-md" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
    </GlassCard>
  );
}

/**
 * Skeleton untuk kartu horizontal di halaman Rencana Belanja.
 */
export function PlanCardSkeleton() {
  return (
    <GlassCard className="p-3.5 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3.5">
        <Skeleton className="h-20 w-14 shrink-0 rounded-lg" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4 max-w-md rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-3.5 w-14 rounded-md" />
          </div>
        </div>
        <div className="shrink-0 sm:text-right space-y-2">
          <Skeleton className="h-5 w-24 sm:ml-auto rounded-md" />
          <div className="flex flex-wrap sm:justify-end gap-1.5">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/**
 * Skeleton untuk baris transaksi atau aktivitas.
 */
export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
      <div className="space-y-1.5 flex-1 min-w-0">
        <Skeleton className="h-4 w-48 max-w-full rounded-md" />
        <Skeleton className="h-3 w-32 rounded-md" />
      </div>
      <Skeleton className="h-5 w-24 shrink-0 rounded-md" />
    </div>
  );
}

/**
 * Skeleton untuk Timeline Pelacakan Kurir di OrderTrackingModal saat sedang fetch API Binderbyte.
 */
export function TrackingTimelineSkeleton() {
  return (
    <div role="status" aria-label="Memuat informasi pelacakan" className="mt-5 space-y-3.5">
      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32 rounded-md" />
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>
        <Skeleton className="h-6 w-36 rounded-md" />
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white border border-slate-200">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-40 rounded-md" />
        <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="h-3.5 w-5/6 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton fallback saat komponen Modal dinamis (next/dynamic) sedang diunduh.
 */
export function ModalSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 p-5 sm:p-6 shadow-glass-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="space-y-3 py-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
