'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Flame,
  TrendingUp,
  Wallet,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { buttonClasses } from '@/components/ui/Button';
import type { MonthlyBudgetPoint, YearlyBudgetSummary } from '@/lib/budget';
import { formatPeriode } from '@/lib/budget';
import { formatRupiah } from '@/lib/format';

interface YearlySpendingChartProps {
  summary: YearlyBudgetSummary;
  activePeriode: string;
}

export function YearlySpendingChart({
  summary,
  activePeriode,
}: YearlySpendingChartProps) {
  const [hoveredPeriode, setHoveredPeriode] = useState<string | null>(null);

  const activeMonthPart = activePeriode.slice(5, 7) || '01';
  const prevYearPeriode = `${summary.year - 1}-${activeMonthPart}`;
  const nextYearPeriode = `${summary.year + 1}-${activeMonthPart}`;

  const inspectedMonth: MonthlyBudgetPoint =
    summary.months.find((m) => m.periode === (hoveredPeriode ?? activePeriode)) ??
    summary.months[0];

  const scaleMax = summary.maxScaleValue > 0 ? summary.maxScaleValue : 1;
  const totalPersenTerpakai =
    summary.totalBudget > 0
      ? Math.round((summary.totalRealisasi / summary.totalBudget) * 100)
      : 0;

  return (
    <GlassCard className="p-4 sm:p-5 space-y-5">
      {/* Header & Pemilih Tahun */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-md bg-primary-50 text-primary-600 shrink-0">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Rekapitulasi Pengeluaran {summary.year}
            </h2>
            <p className="text-xs text-neutral-500">
              Evaluasi realisasi belanja komik vs anggaran bulanan sepanjang tahun
            </p>
          </div>
        </div>

        <div className="flex items-center self-start sm:self-auto gap-1.5">
          <Link
            href={`/budget?periode=${prevYearPeriode}`}
            aria-label={`Lihat tahun ${summary.year - 1}`}
            className={buttonClasses('secondary', 'sm')}
          >
            <ChevronLeft className="h-4 w-4 mr-0.5" />
            <span>{summary.year - 1}</span>
          </Link>
          <span className="px-3 py-1.5 rounded-md bg-primary-50/80 border border-primary-200/80 text-xs font-bold text-primary-700 tabular-nums">
            {summary.year}
          </span>
          <Link
            href={`/budget?periode=${nextYearPeriode}`}
            aria-label={`Lihat tahun ${summary.year + 1}`}
            className={buttonClasses('secondary', 'sm')}
          >
            <span>{summary.year + 1}</span>
            <ChevronRight className="h-4 w-4 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* 4 Mini-Highlight Statistik Tahunan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border border-neutral-200/70 bg-white p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
            <Wallet className="h-3.5 w-3.5 text-primary-500" aria-hidden="true" />
            <span>Total Belanja {summary.year}</span>
          </div>
          <p className="mt-1 text-sm sm:text-base font-bold text-neutral-900 tabular-nums truncate">
            {formatRupiah(summary.totalRealisasi)}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            {summary.activeMonthsCount} bulan bertransaksi
          </p>
        </div>

        <div className="rounded-md border border-neutral-200/70 bg-white p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span>Rata-rata / Bulan Aktif</span>
          </div>
          <p className="mt-1 text-sm sm:text-base font-bold text-neutral-900 tabular-nums truncate">
            {formatRupiah(summary.averageMonthlySpending)}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            {summary.activeMonthsCount > 0
              ? `Dari ${summary.activeMonthsCount} bulan aktif`
              : 'Belum ada pengeluaran'}
          </p>
        </div>

        <div className="rounded-md border border-neutral-200/70 bg-white p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
            <Flame className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
            <span>Puncak Pengeluaran</span>
          </div>
          <p className="mt-1 text-sm sm:text-base font-bold text-neutral-900 tabular-nums truncate">
            {summary.peakMonth ? formatRupiah(summary.peakMonth.realisasi) : 'Rp 0'}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            {summary.peakMonth
              ? `Bulan ${formatPeriode(summary.peakMonth.periode)}`
              : 'Belum ada transaksi'}
          </p>
        </div>

        <div className="rounded-md border border-neutral-200/70 bg-white p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
            {summary.totalSisaAman < 0 && summary.totalBudget > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            )}
            <span>Selisih Budget Tahunan</span>
          </div>
          <p
            className={`mt-1 text-sm sm:text-base font-bold tabular-nums truncate ${
              summary.totalBudget === 0
                ? 'text-neutral-600'
                : summary.totalSisaAman < 0
                ? 'text-rose-600'
                : 'text-emerald-600'
            }`}
          >
            {summary.totalBudget > 0
              ? formatRupiah(summary.totalSisaAman)
              : 'Belum diatur'}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
            {summary.totalBudget > 0
              ? `${totalPersenTerpakai}% dari ${formatRupiah(summary.totalBudget)}`
              : 'Atur budget tiap bulan'}
          </p>
        </div>
      </div>

      {/* Area Grafik Batang 12 Bulan */}
      <div className="rounded-lg border border-neutral-200/70 bg-white p-3.5 sm:p-4">
        <div
          className="grid grid-cols-12 gap-1.5 sm:gap-2.5 items-end h-44 pt-4"
          onMouseLeave={() => setHoveredPeriode(null)}
        >
          {summary.months.map((m) => {
            const isSelected = m.periode === activePeriode;
            const isInspected = m.periode === inspectedMonth.periode;
            const budgetHeightPct =
              summary.maxScaleValue > 0
                ? Math.min(100, Math.round((m.totalBudget / scaleMax) * 100))
                : 0;
            const realisasiHeightPct =
              summary.maxScaleValue > 0 && m.realisasi > 0
                ? Math.max(6, Math.min(100, Math.round((m.realisasi / scaleMax) * 100)))
                : 0;

            const barColorClass = getBarColorClass(m, isSelected);

            return (
              <Link
                key={m.periode}
                href={`/budget?periode=${m.periode}`}
                onMouseEnter={() => setHoveredPeriode(m.periode)}
                onFocus={() => setHoveredPeriode(m.periode)}
                aria-label={`${formatPeriode(m.periode)}: Realisasi ${formatRupiah(
                  m.realisasi
                )}, Budget ${formatRupiah(m.totalBudget)}`}
                className="group flex flex-col items-center h-full justify-end focus-visible:outline-none"
              >
                {/* Kolom visualisasi tinggi batang */}
                <div className="relative w-full max-w-[34px] flex-1 flex items-end justify-center rounded-t-lg">
                  {/* Track latar tipis */}
                  <div className="absolute inset-x-1 bottom-0 top-0 rounded-t-md bg-neutral-100/80 group-hover:bg-neutral-200/60 transition-colors" />

                  {/* Indikator batas budget bulanan (bila diatur) */}
                  {m.totalBudget > 0 && (
                    <div
                      style={{ height: `${budgetHeightPct}%` }}
                      className="absolute inset-x-0.5 bottom-0 rounded-t-md bg-neutral-200/75 border-t-2 border-dashed border-neutral-400/80 transition-all duration-300 pointer-events-none"
                    />
                  )}

                  {/* Batang realisasi pengeluaran */}
                  <div
                    style={{
                      height: m.realisasi > 0 ? `${realisasiHeightPct}%` : '3px',
                    }}
                    className={`relative z-10 w-full mx-1 rounded-t-md transition-all duration-300 ${barColorClass} ${
                      isInspected ? 'ring-2 ring-offset-1 ring-primary-400/70' : ''
                    }`}
                  />
                </div>

                {/* Label Bulan */}
                <span
                  className={`mt-2 text-[10px] sm:text-xs tabular-nums px-1.5 py-0.5 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary-600 text-white font-bold'
                      : isInspected
                      ? 'bg-neutral-200/80 text-neutral-900 font-semibold'
                      : 'text-neutral-500 font-medium group-hover:text-neutral-800'
                  }`}
                >
                  {m.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Panel Inspeksi Detail Bulan (Hover / Aktif) */}
        <div className="mt-4 pt-3 border-t border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-neutral-900">
              {formatPeriode(inspectedMonth.periode)}
              {inspectedMonth.periode === activePeriode && (
                <span className="ml-1.5 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700 border border-primary-200">
                  Sedang Dilihat
                </span>
              )}
            </span>
            <span className="text-neutral-600 tabular-nums">
              Realisasi:{' '}
              <strong className="text-neutral-900">
                {formatRupiah(inspectedMonth.realisasi)}
              </strong>
            </span>
            <span className="text-neutral-600 tabular-nums">
              Budget:{' '}
              <strong className="text-neutral-900">
                {inspectedMonth.totalBudget > 0
                  ? formatRupiah(inspectedMonth.totalBudget)
                  : 'Belum diatur'}
              </strong>
            </span>
            {inspectedMonth.totalBudget > 0 && (
              <span
                className={`font-semibold tabular-nums ${
                  inspectedMonth.sisaAman < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                ({inspectedMonth.sisaAman < 0 ? 'Over ' : 'Sisa '}
                {formatRupiah(Math.abs(inspectedMonth.sisaAman))})
              </span>
            )}
            {inspectedMonth.refundTotal > 0 && (
              <span className="text-emerald-600 tabular-nums">
                · Refund +{formatRupiah(inspectedMonth.refundTotal)}
              </span>
            )}
          </div>

          <span className="text-[11px] text-neutral-400 tabular-nums">
            {inspectedMonth.txnCount} transaksi · Klik batang untuk buka bulan
          </span>
        </div>
      </div>

      {/* Legenda Grafik */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
          <span>Aman (≤ Budget)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
          <span>Melebihi Budget</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
          <span>Tanpa Target Budget</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-xs bg-neutral-200 border-t-2 border-dashed border-neutral-500" />
          <span>Batas Target Budget</span>
        </span>
      </div>
    </GlassCard>
  );
}

function getBarColorClass(m: MonthlyBudgetPoint, isSelected: boolean): string {
  if (m.realisasi <= 0) {
    return isSelected ? 'bg-primary-300' : 'bg-neutral-300/70';
  }
  if (m.isOverBudget) {
    return 'bg-rose-500 group-hover:bg-rose-600';
  }
  if (m.totalBudget === 0) {
    return 'bg-amber-500 group-hover:bg-amber-600';
  }
  if (isSelected) {
    return 'bg-primary-600 group-hover:bg-primary-700';
  }
  return 'bg-emerald-500 group-hover:bg-emerald-600';
}
