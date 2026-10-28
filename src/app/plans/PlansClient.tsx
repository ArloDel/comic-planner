'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Pencil,
  Plus,
  XCircle,
  PackageCheck,
  History,
  Link2,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterChip } from '@/components/ui/FilterChip';
import { Select } from '@/components/ui/Select';
import { StatusPill } from '@/components/ui/StatusPill';
import { CoverImage } from '@/components/ui/CoverImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalSkeleton, PlanCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import {
  comparePlans,
  isShippingStatus,
  nextStatuses,
  priorityLabel,
  type PlanHistoryEntry,
  type PlanSortBy,
  type PlanStatus,
} from '@/lib/plans';
import { formatRupiah } from '@/lib/format';
import { replaceQueryParams } from '@/lib/url';
import type { ListingStatus, ItemType } from '@/types/database';

const PlanModal = dynamic(
  () => import('@/components/plans/PlanModal').then((m) => m.PlanModal),
  { loading: () => <ModalSkeleton /> }
);
const TransitionModal = dynamic(
  () => import('@/components/plans/TransitionModal').then((m) => m.TransitionModal),
  { loading: () => <ModalSkeleton /> }
);
const OrderTrackingModal = dynamic(
  () => import('@/components/plans/OrderTrackingModal').then((m) => m.OrderTrackingModal),
  { loading: () => <ModalSkeleton /> }
);
const StatusTimeline = dynamic(
  () => import('@/components/plans/StatusTimeline').then((m) => m.StatusTimeline),
  {
    loading: () => (
      <div className="space-y-2 py-1">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    ),
  }
);

const INITIAL_PLAN_BATCH = 15;

export interface PlanListingRef {
  id: string;
  marketplace: string;
  nama_toko: string | null;
  url: string | null;
  harga: number;
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
  created_at: string;
  updated_at: string;
  item: PlanItemRef | null;
  listing: PlanListingRef | null;
  history: PlanHistoryEntry[];
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

export type PlanStatusFilter = PlanStatus | 'semua';

const PLAN_SORT_OPTIONS: { value: PlanSortBy; label: string }[] = [
  { value: 'prioritas', label: 'Prioritas Tertinggi (P1–P5)' },
  { value: 'terbaru', label: 'Terbaru Ditambahkan' },
];

interface PlansClientProps {
  initialPlans: PlanWithDetails[];
  items: PlanItemOption[];
  initialSearch?: string;
  initialStatus?: PlanStatusFilter;
  initialSort?: PlanSortBy;
}

const ACTION_LABELS: Record<PlanStatus, string> = {
  wishlist: 'Kembalikan ke Wishlist',
  po: 'Pesan & Lacak Resi',
  dp: 'Lacak / Selesaikan',
  lunas: 'Lacak / Selesaikan',
  diterima: 'Lacak / Selesaikan Pesanan',
  batal: 'Batalkan Rencana',
};

const ACTION_ICONS: Record<PlanStatus, React.ComponentType<{ className?: string }>> = {
  wishlist: ListChecks,
  po: Truck,
  dp: Truck,
  lunas: Truck,
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

export function PlansClient({
  initialPlans,
  items,
  initialSearch = '',
  initialStatus = 'semua',
  initialSort = 'prioritas',
}: PlansClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<PlanStatusFilter>(initialStatus);
  const [sortBy, setSortBy] = useState<PlanSortBy>(initialSort);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PLAN_BATCH);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithDetails | null>(null);
  const [transition, setTransition] = useState<{ plan: PlanWithDetails; to: PlanStatus } | null>(
    null
  );
  const [trackingPlan, setTrackingPlan] = useState<PlanWithDetails | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [bulkModalPlans, setBulkModalPlans] = useState<PlanWithDetails[] | null>(null);

  function toggleSelectPlan(id: string) {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPlansList = useMemo(() => {
    return initialPlans.filter((p) => selectedPlanIds.has(p.id));
  }, [initialPlans, selectedPlanIds]);

  const selectedTotalPrice = useMemo(() => {
    return selectedPlansList.reduce((sum, p) => sum + (p.estimasi_harga || 0), 0);
  }, [selectedPlansList]);

  const commonStoreName = useMemo(() => {
    const stores = Array.from(new Set(selectedPlansList.map((p) => p.listing?.nama_toko).filter(Boolean)));
    return stores.length === 1 ? stores[0] : null;
  }, [selectedPlansList]);

  const [trackingMap, setTrackingMap] = useState<
    Record<string, { courier: string; resi: string; statusText?: string; isDelivered?: boolean }>
  >({});

  function refreshTrackingMap() {
    if (typeof window === 'undefined') return;
    const map: Record<string, { courier: string; resi: string; statusText?: string; isDelivered?: boolean }> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('comicplan_tracking_')) {
          const planId = key.replace('comicplan_tracking_', '');
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (val.resi) {
            map[planId] = {
              courier: val.courier || 'spx',
              resi: val.resi,
              statusText:
                val.tracking?.statusText ||
                (val.tracking?.isDelivered ? 'Telah Tiba' : 'Sedang Dikirim'),
              isDelivered: Boolean(val.tracking?.isDelivered),
            };
          }
        }
      }
    } catch {
      // Ignored
    }
    setTrackingMap(map);
  }

  useEffect(() => {
    refreshTrackingMap();
  }, []);

  function isPlanInDelivery(plan: PlanWithDetails) {
    return isShippingStatus(plan.status) || Boolean(trackingMap[plan.id]?.resi);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const plan of initialPlans) {
      if (plan.status === 'wishlist' && trackingMap[plan.id]?.resi) {
        fetch('/api/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_id: plan.id,
            courier: trackingMap[plan.id].courier || 'spx',
            resi: trackingMap[plan.id].resi,
          }),
        })
          .then(() => router.refresh())
          .catch(() => {});
      }
    }
  }, [initialPlans, trackingMap, router]);

  function updateFilters(next: {
    q?: string;
    status?: PlanStatusFilter;
    sort?: PlanSortBy;
  }) {
    const qVal = next.q !== undefined ? next.q : search;
    const statusVal = next.status !== undefined ? next.status : statusFilter;
    const sortVal = next.sort !== undefined ? next.sort : sortBy;

    setSearch(qVal);
    setStatusFilter(statusVal);
    setSortBy(sortVal);
    setVisibleCount(INITIAL_PLAN_BATCH);
    replaceQueryParams({ q: qVal, status: statusVal, sort: sortVal });
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      semua: initialPlans.length,
      wishlist: 0,
      po: 0,
      diterima: 0,
      batal: 0,
    };

    for (const plan of initialPlans) {
      const inDelivery = isPlanInDelivery(plan);
      if (inDelivery) {
        result.po += 1;
      } else if (plan.status === 'wishlist') {
        result.wishlist += 1;
      } else if (plan.status === 'diterima') {
        result.diterima += 1;
      } else if (plan.status === 'batal') {
        result.batal += 1;
      }
    }

    return result;
  }, [initialPlans, trackingMap]);

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

    if (statusFilter === 'po') {
      result = result.filter((plan) => isPlanInDelivery(plan));
    } else if (statusFilter === 'wishlist') {
      result = result.filter((plan) => plan.status === 'wishlist' && !trackingMap[plan.id]?.resi);
    } else if (statusFilter !== 'semua') {
      result = result.filter((plan) => plan.status === statusFilter);
    }

    return result.sort(comparePlans(sortBy));
  }, [initialPlans, search, statusFilter, sortBy, trackingMap]);

  const visiblePlans = useMemo(
    () => filteredPlans.slice(0, visibleCount),
    [filteredPlans, visibleCount]
  );
  const hasMore = visibleCount < filteredPlans.length;

  useEffect(() => {
    if (!hasMore) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + INITIAL_PLAN_BATCH, filteredPlans.length));
        }
      },
      { rootMargin: '250px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filteredPlans.length]);

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
            onChange={(e) => updateFilters({ q: e.target.value })}
            onClear={() => updateFilters({ q: '' })}
            placeholder="Cari judul, seri, atau toko…"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={isSelectionMode ? 'primary' : 'secondary'}
            onClick={() => {
              setIsSelectionMode((prev) => !prev);
              if (isSelectionMode) setSelectedPlanIds(new Set());
            }}
            title="Pilih beberapa buku sekaligus untuk memesan & melacak dengan 1 nomor resi bersama"
            className={`w-full sm:w-auto shadow-glass ${
              isSelectionMode ? 'bg-primary-600 text-white border-primary-600' : ''
            }`}
          >
            <CheckSquare className="h-4 w-4 mr-1.5" />
            <span>{isSelectionMode ? 'Selesai Memilih' : 'Pilih Beberapa'}</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto shadow-glass"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Tambah Rencana</span>
          </Button>
        </div>
      </div>

      {/* Filter chips & Sorting */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <FilterChip
            label="Semua"
            active={statusFilter === 'semua'}
            onClick={() => updateFilters({ status: 'semua' })}
            count={counts.semua}
          />
          <FilterChip
            label="Wishlist"
            active={statusFilter === 'wishlist'}
            onClick={() => updateFilters({ status: 'wishlist' })}
            count={counts.wishlist}
          />
          <FilterChip
            label="🚚 Sedang Dikirim"
            active={statusFilter === 'po'}
            onClick={() => updateFilters({ status: 'po' })}
            count={counts.po}
          />
          <FilterChip
            label="🎉 Selesai"
            active={statusFilter === 'diterima'}
            onClick={() => updateFilters({ status: 'diterima' })}
            count={counts.diterima}
          />
          <FilterChip
            label="Batal"
            active={statusFilter === 'batal'}
            onClick={() => updateFilters({ status: 'batal' })}
            count={counts.batal}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            Urutkan:
          </span>
          <Select
            compact
            aria-label="Urutkan rencana"
            value={sortBy}
            onChange={(e) => updateFilters({ sort: e.target.value as PlanSortBy })}
            options={PLAN_SORT_OPTIONS}
          />
        </div>
      </div>

      {/* Toolbar Mode Pemilihan Massal */}
      {isSelectionMode && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-indigo-600" />
              <span>Mode Pilih Massal: {selectedPlanIds.size} komik dipilih</span>
            </span>
            {selectedPlanIds.size > 0 && (
              <span className="text-indigo-700">
                · Estimasi: <strong>{formatRupiah(selectedTotalPrice)}</strong>
                {commonStoreName && <span className="ml-1 text-indigo-600 font-semibold">(Toko: {commonStoreName})</span>}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const visibleIds = filteredPlans.map((p) => p.id);
                const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedPlanIds.has(id));
                if (allSelected) {
                  setSelectedPlanIds(new Set());
                } else {
                  setSelectedPlanIds(new Set(visibleIds));
                }
              }}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline cursor-pointer"
            >
              {filteredPlans.length > 0 && filteredPlans.every((p) => selectedPlanIds.has(p.id))
                ? 'Batal Pilih Semua'
                : 'Pilih Semua di Tampilan Ini'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedPlanIds(new Set());
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-800 font-bold hover:bg-indigo-100/60 transition-colors cursor-pointer text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

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
              ? 'Tambahkan rencana pertama dari item katalog, lalu majukan statusnya dari Wishlist sampai Selesai.'
              : 'Coba ubah kata kunci pencarian atau pilih filter status lain.'
          }
          actionLabel={
            initialPlans.length === 0 ? '+ Tambah Rencana Pertama' : 'Reset Filter'
          }
          onAction={() => {
            if (initialPlans.length === 0) {
              setIsCreateOpen(true);
            } else {
              updateFilters({ q: '', status: 'semua' });
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {visiblePlans.map((plan) => {
            const expanded = expandedId === plan.id;
            const inDelivery = isPlanInDelivery(plan);
            const effectiveStatus: PlanStatus = inDelivery && plan.status === 'wishlist' ? 'po' : plan.status;
            const legal = nextStatuses(effectiveStatus);

            return (
              <GlassCard
                key={plan.id}
                className={`overflow-hidden transition-all duration-200 hover:shadow-glass-lg ${
                  selectedPlanIds.has(plan.id)
                    ? 'ring-2 ring-primary-500 bg-primary-50/20 border-primary-300 shadow-glass-md'
                    : ''
                }`}
              >
                {/* Baris utama */}
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-3.5">
                  {/* Checkbox jika mode seleksi aktif */}
                  {isSelectionMode && (
                    <div className="pt-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedPlanIds.has(plan.id)}
                        onChange={() => toggleSelectPlan(plan.id)}
                        aria-label={`Pilih ${plan.item?.judul ?? 'rencana'}`}
                        className="h-5 w-5 rounded-md border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </div>
                  )}
                  {/* Cover thumbnail menggunakan CoverImage dengan lazy IntersectionObserver + shimmer */}
                  {plan.item?.cover_url && (
                    <CoverImage
                      src={plan.item.cover_url}
                      alt={plan.item.judul}
                      title={plan.item.judul}
                      className="h-20 w-14 shrink-0 rounded-lg"
                    />
                  )}

                  {/* Info utama */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={effectiveStatus} size="sm" />
                      {trackingMap[plan.id]?.resi && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                          <Truck className="h-3 w-3" />
                          <span className="truncate max-w-[10rem]">
                            {trackingMap[plan.id].courier.toUpperCase()}: {trackingMap[plan.id].resi}
                          </span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingPlan(plan)}
                        title={`Ubah prioritas (${priorityLabel(plan.prioritas)}) & estimasi harga`}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${priorityTone(
                          plan.prioritas
                        )}`}
                      >
                        <span>P{plan.prioritas}</span>
                        <span className="font-medium opacity-75">
                          {priorityLabel(plan.prioritas)}
                        </span>
                      </button>
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
                  </div>

                  {/* Harga & aksi */}
                  <div className="shrink-0 sm:text-right">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatRupiah(plan.estimasi_harga)}
                    </p>

                    {/* Aksi status */}
                    <div className="mt-2 flex flex-wrap sm:justify-end gap-1.5">
                      {legal.map((to) => {
                        const Icon = ACTION_ICONS[to];

                        if (to === 'po' || to === 'diterima') {
                          return (
                            <button
                              key={to}
                              type="button"
                              onClick={() => setTrackingPlan(plan)}
                              title={ACTION_LABELS[to]}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 min-h-[36px] text-[11px] font-semibold transition-colors ${
                                to === 'diterima'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span>{ACTION_LABELS[to]}</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={to}
                            type="button"
                            onClick={() => setTransition({ plan, to })}
                            title={ACTION_LABELS[to]}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 min-h-[36px] text-[11px] font-semibold transition-colors ${
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
                        onClick={() => setEditingPlan(plan)}
                        aria-label={`Edit prioritas dan estimasi ${plan.item?.judul ?? 'rencana'}`}
                        title="Edit prioritas & estimasi harga"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/70 px-2.5 py-1 min-h-[36px] text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : plan.id)}
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Sembunyikan riwayat' : 'Lihat riwayat status'}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/70 px-2.5 py-1 min-h-[36px] text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
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

          {hasMore && (
            <div ref={loadMoreRef} className="space-y-3 pt-1">
              <PlanCardSkeleton />
              <div className="flex justify-center pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setVisibleCount((prev) =>
                      Math.min(prev + INITIAL_PLAN_BATCH, filteredPlans.length)
                    )
                  }
                >
                  Muat Lebih Banyak ({filteredPlans.length - visibleCount} tersisa)
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isCreateOpen && (
        <PlanModal
          key="create-plan"
          isOpen
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleRefresh}
          items={items}
        />
      )}

      {editingPlan && (
        <PlanModal
          key={editingPlan.id}
          isOpen
          onClose={() => setEditingPlan(null)}
          onSuccess={handleRefresh}
          items={items}
          initialPlan={editingPlan}
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
        />
      )}

      {/* Floating Bottom Action Bar saat ada komik yang dipilih */}
      {selectedPlanIds.size > 0 && (
        <div className="fixed bottom-5 left-4 right-4 z-40 max-w-2xl mx-auto rounded-2xl bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/80 p-3.5 sm:px-5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400 font-bold text-sm">
              {selectedPlanIds.size}
            </span>
            <div>
              <p className="text-xs font-bold text-white leading-tight">
                {selectedPlanIds.size} Komik Terpilih
              </p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Total Estimasi: <span className="text-emerald-400 font-semibold">{formatRupiah(selectedTotalPrice)}</span>
                {commonStoreName && <span className="ml-1">· Toko: {commonStoreName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedPlanIds(new Set())}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Kosongkan
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const selectedPlans = initialPlans.filter((p) => selectedPlanIds.has(p.id));
                setBulkModalPlans(selectedPlans);
              }}
              className="shadow-glass text-xs font-bold bg-primary-600 hover:bg-primary-500"
            >
              <Truck className="h-3.5 w-3.5 mr-1.5" />
              <span>Pesan &amp; Lacak Bersama ({selectedPlanIds.size})</span>
            </Button>
          </div>
        </div>
      )}

      {trackingPlan && (
        <OrderTrackingModal
          isOpen
          onClose={() => setTrackingPlan(null)}
          planId={trackingPlan.id}
          itemTitle={trackingPlan.item?.judul ?? 'Komik'}
          volume={trackingPlan.item?.volume}
          currentStatus={trackingPlan.status}
          onOrderCompleted={() => {
            refreshTrackingMap();
            handleRefresh();
          }}
        />
      )}

      {bulkModalPlans && (
        <OrderTrackingModal
          isOpen
          onClose={() => setBulkModalPlans(null)}
          bulkPlans={bulkModalPlans.map((p) => ({
            id: p.id,
            judul: p.item?.judul ?? 'Komik',
            volume: p.item?.volume,
            estimasi_harga: p.estimasi_harga,
            nama_toko: p.listing?.nama_toko || p.listing?.marketplace,
            cover_url: p.item?.cover_url,
            currentStatus: p.status,
          }))}
          onOrderCompleted={() => {
            setBulkModalPlans(null);
            setIsSelectionMode(false);
            setSelectedPlanIds(new Set());
            refreshTrackingMap();
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
