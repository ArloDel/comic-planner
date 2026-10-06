'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Plus,
  ShoppingCart,
  Wallet,
  XCircle,
  PackageCheck,
  History,
  Link2,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterChip } from '@/components/ui/FilterChip';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlanModal } from '@/components/plans/PlanModal';
import { TransitionModal } from '@/components/plans/TransitionModal';
import { StatusTimeline } from '@/components/plans/StatusTimeline';
import {
  PLAN_STATUSES,
  STATUS_LABELS,
  isHoldingBudget,
  nextStatuses,
  priorityLabel,
  type PlanHistoryEntry,
  type PlanStatus,
} from '@/lib/plans';
import { daysUntil, formatRupiah, formatTanggal } from '@/lib/format';
import type { ListingStatus, ItemType } from '@/types/database';

export interface PlanListingRef {
  id: string;
  marketplace: string;
  nama_toko: string | null;
  url: string | null;
  harga: number;
  deadline_po: string | null;
  status: ListingStatus;
}

export interface PlanItemRef {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  cover_url: string | null;
  tipe: ItemType | null;
}

export interface PlanWithDetails {
  id: string;
  item_id: string;
  listing_id: string | null;
  prioritas: number;
  estimasi_harga: number;
  status: PlanStatus;
  deadline_po: string | null;
  created_at: string;
  updated_at: string;
  item: PlanItemRef | null;
  listing: PlanListingRef | null;
  history: PlanHistoryEntry[];
  sudah_dibayar: number;
}

export interface PlanItemOption {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  listings: PlanListingRef[];
  /** Estimasi dari plan aktif item ini, dipakai pre-fill form. */
  estimasi_harga?: number;
}

interface PlansClientProps {
  initialPlans: PlanWithDetails[];
  items: PlanItemOption[];
  commitment: number;
}

const ACTION_LABELS: Record<PlanStatus, string> = {
  wishlist: 'Kembalikan ke Wishlist',
  po: 'Masuk PO',
  dp: 'Bayar DP',
  lunas: 'Tandai Lunas',
  diterima: 'Terima Barang',
  batal: 'Batalkan Rencana',
};

const ACTION_ICONS: Record<PlanStatus, React.ComponentType<{ className?: string }>> = {
  wishlist: ListChecks,
  po: ShoppingCart,
  dp: Wallet,
  lunas: Check,
  diterima: PackageCheck,
  batal: XCircle,
};

function priorityTone(prioritas: number): string {
  if (prioritas <= 1) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (prioritas === 2) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (prioritas === 3) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (prioritas === 4) return 'bg-slate-50 text-slate-500 border-slate-200';
  return 'bg-slate-50 text-slate-400 border-slate-200';
}

export function PlansClient({ initialPlans, items, commitment }: PlansClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'semua' | 'hold'>('semua');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [transition, setTransition] = useState<{ plan: PlanWithDetails; to: PlanStatus } | null>(
    null
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      semua: initialPlans.length,
      hold: initialPlans.filter((plan) => isHoldingBudget(plan.status)).length,
    };

    for (const status of PLAN_STATUSES) {
      result[status] = initialPlans.filter((plan) => plan.status === status).length;
    }

    return result;
  }, [initialPlans]);

  const filteredPlans = useMemo(() => {
    let result = [...initialPlans];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (plan) =>
          (plan.item?.judul ?? '').toLowerCase().includes(q) ||
          (plan.item?.seri ?? '').toLowerCase().includes(q) ||
          (plan.listing?.nama_toko ?? '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'hold') {
      result = result.filter((plan) => isHoldingBudget(plan.status));
    } else if (statusFilter !== 'semua') {
      result = result.filter((plan) => plan.status === statusFilter);
    }

    return result;
  }, [initialPlans, search, statusFilter]);

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header: search + tambah */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Cari judul, seri, atau toko..."
          />
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto shadow-glass"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Tambah Rencana</span>
        </Button>
      </div>

      {/* Ringkasan hold budget */}
      <GlassCard className="p-4" solid>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Wallet className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Hold Budget (Komitmen)
              </p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {formatRupiah(commitment)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Σ (estimasi − sudah dibayar) untuk {counts.hold} plan berstatus PO atau DP.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 sm:text-right sm:max-w-[15rem] leading-relaxed">
            Hold dilepas otomatis saat plan dibatalkan, karena komitmen hanya menghitung status PO
            dan DP.
          </p>
        </div>
      </GlassCard>

      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip
          label="Semua"
          active={statusFilter === 'semua'}
          onClick={() => setStatusFilter('semua')}
          count={counts.semua}
        />
        <FilterChip
          label="Hold Budget"
          active={statusFilter === 'hold'}
          onClick={() => setStatusFilter('hold')}
          count={counts.hold}
        />
        {PLAN_STATUSES.map((status) => (
          <FilterChip
            key={status}
            label={STATUS_LABELS[status]}
            active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            count={counts[status]}
          />
        ))}
      </div>

      {/* Daftar plan */}
      {filteredPlans.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-8 w-8 text-primary-400" />}
          title={
            initialPlans.length === 0
              ? 'Belum Ada Rencana Belanja'
              : 'Tidak Ada Rencana yang Sesuai Filter'
          }
          description={
            initialPlans.length === 0
              ? 'Tambahkan rencana pertama dari item katalog, lalu majukan statusnya dari Wishlist sampai Diterima.'
              : 'Coba ubah kata kunci pencarian atau pilih filter status lain.'
          }
          actionLabel={
            initialPlans.length === 0 ? '+ Tambah Rencana Pertama' : 'Reset Filter'
          }
          onAction={() => {
            if (initialPlans.length === 0) {
              setIsCreateOpen(true);
            } else {
              setSearch('');
              setStatusFilter('semua');
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => {
            const expanded = expandedId === plan.id;
            const legal = nextStatuses(plan.status);
            const sisaDeadline =
              plan.status === 'po' ? daysUntil(plan.deadline_po) : null;

            return (
              <GlassCard
                key={plan.id}
                className="overflow-hidden transition-shadow duration-200 hover:shadow-glass-lg"
              >
                {/* Baris utama */}
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-3.5">
                  {/* Cover thumbnail */}
                  {plan.item?.cover_url && (
                    // Marketplace images come from arbitrary hosts, so plain
                    // <img> is intentional here (same reasoning as CoverImage).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={plan.item.cover_url}
                      alt={plan.item.judul}
                      loading="lazy"
                      className="h-20 w-14 shrink-0 rounded-lg object-cover border border-slate-200/70 bg-slate-100"
                    />
                  )}

                  {/* Info utama */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={plan.status} size="sm" />

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${priorityTone(
                          plan.prioritas
                        )}`}
                        title={`Prioritas: ${priorityLabel(plan.prioritas)}`}
                      >
                        <span>P{plan.prioritas}</span>
                        <span className="font-medium opacity-75">
                          {priorityLabel(plan.prioritas)}
                        </span>
                      </span>

                      {isHoldingBudget(plan.status) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Wallet className="h-3 w-3" />
                          <span>Hold</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
                      {plan.item?.judul ?? 'Item tidak ditemukan'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {plan.item?.seri && (
                        <span className="font-semibold text-slate-600">{plan.item.seri}</span>
                      )}
                      {plan.item?.volume !== null && plan.item?.volume !== undefined && (
                        <span className="rounded bg-slate-100 px-1 py-0.5 font-bold text-slate-700">
                          Vol {plan.item.volume}
                        </span>
                      )}

                      {plan.listing ? (
                        <a
                          href={plan.listing.url ?? '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          <Link2 className="h-3 w-3" />
                          <span className="max-w-[10rem] truncate">
                            {plan.listing.nama_toko || plan.listing.marketplace}
                          </span>
                        </a>
                      ) : (
                        <span className="text-slate-400">Tanpa listing</span>
                      )}
                    </div>

                    {/* Deadline PO */}
                    {plan.status === 'po' && (
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                          sisaDeadline !== null && sisaDeadline < 0
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : sisaDeadline !== null && sisaDeadline <= 3
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>
                          Deadline {formatTanggal(plan.deadline_po)}
                          {sisaDeadline !== null && (
                            <span className="font-bold">
                              {sisaDeadline < 0
                                ? ` · lewat ${Math.abs(sisaDeadline)} hari`
                                : sisaDeadline === 0
                                  ? ' · hari ini'
                                  : ` · ${sisaDeadline} hari lagi`}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Sisa komitmen */}
                    {isHoldingBudget(plan.status) && (
                      <p className="text-[11px] text-slate-500">
                        Sisa komitmen:{' '}
                        <span className="font-bold text-slate-700 tabular-nums">
                          {formatRupiah(Math.max(plan.estimasi_harga - plan.sudah_dibayar, 0))}
                        </span>{' '}
                        <span className="text-slate-400">
                          (estimasi {formatRupiah(plan.estimasi_harga)} − dibayar{' '}
                          {formatRupiah(plan.sudah_dibayar)})
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Harga & aksi */}
                  <div className="shrink-0 sm:text-right">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatRupiah(plan.estimasi_harga)}
                    </p>

                    {/* Hanya transisi legal yang ditampilkan; tetap diverifikasi ulang di server */}
                    <div className="mt-2 flex flex-wrap sm:justify-end gap-1.5">
                      {legal.map((to) => {
                        const Icon = ACTION_ICONS[to];

                        return (
                          <button
                            key={to}
                            type="button"
                            onClick={() => setTransition({ plan, to })}
                            title={ACTION_LABELS[to]}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                              to === 'batal'
                                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{ACTION_LABELS[to]}</span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : plan.id)}
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Sembunyikan riwayat' : 'Lihat riwayat status'}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Riwayat</span>
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Riwayat status (expanded) */}
                {expanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-3.5 py-3 sm:px-4">
                    <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Riwayat Perubahan Status
                    </h4>
                    <StatusTimeline entries={plan.history} />
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Terminal state hint */}
      {initialPlans.some((plan) => plan.status === 'batal') && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] text-emerald-800">
          <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Plan batal tetap tersimpan sebagai riwayat, tapi tidak lagi menahan budget karena
            di luar status PO/DP.
          </span>
        </p>
      )}

      {/* Dirender hanya saat terbuka supaya form me-remount dengan state baru. */}
      {isCreateOpen && (
        <PlanModal
          isOpen
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleRefresh}
          items={items}
        />
      )}

      {transition && (
        <TransitionModal
          isOpen
          onClose={() => setTransition(null)}
          onSuccess={handleRefresh}
          planId={transition.plan.id}
          judul={transition.plan.item?.judul ?? 'Rencana'}
          from={transition.plan.status}
          to={transition.to}
          defaultDeadline={transition.plan.listing?.deadline_po ?? null}
          estimasiHarga={transition.plan.estimasi_harga}
          sudahDibayar={transition.plan.sudah_dibayar}
        />
      )}
    </div>
  );
}