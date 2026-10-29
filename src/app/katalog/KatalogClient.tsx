'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  BookOpen,
  Edit2,
  Trash2,
  Layers,
  ArrowUpDown,
  Filter,
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
import { ComicCardSkeleton, ModalSkeleton } from '@/components/ui/Skeleton';
import { formatRupiahOrNull } from '@/lib/format';
import { isPlanStatus, isShippingStatus } from '@/lib/plans';
import { replaceQueryParams } from '@/lib/url';
import type { ItemType } from '@/types/database';
import {
  summarizeSeries,
  type ExtendedStatus,
  type KatalogItemWithDetails,
} from '@/lib/catalog';

const ItemModal = dynamic(
  () => import('@/components/katalog/ItemModal').then((m) => m.ItemModal),
  { loading: () => <ModalSkeleton /> }
);
const DeleteModal = dynamic(
  () => import('@/components/katalog/DeleteModal').then((m) => m.DeleteModal),
  { loading: () => <ModalSkeleton /> }
);
const OrderTrackingModal = dynamic(
  () => import('@/components/plans/OrderTrackingModal').then((m) => m.OrderTrackingModal),
  { loading: () => <ModalSkeleton /> }
);

const INITIAL_BATCH_SIZE = 20;

type TipeFilter = ItemType | 'semua';
type SortBy = 'terbaru' | 'judul' | 'seri' | 'harga';
type StatusFilter = ExtendedStatus | 'semua' | 'dikirim';

const TIPE_OPTIONS: { value: TipeFilter; label: string }[] = [
  { value: 'semua', label: 'Semua Tipe' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhua', label: 'Manhua' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'komik lokal', label: 'Komik Lokal' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'terbaru', label: 'Terbaru Ditambahkan' },
  { value: 'judul', label: 'Judul (A-Z)' },
  { value: 'seri', label: 'Seri & Volume' },
  { value: 'harga', label: 'Estimasi Harga Tertinggi' },
];

const STATUS_FILTERS: { value: ExtendedStatus; label: string }[] = [
  { value: 'belum ada', label: 'Belum Ada' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'po', label: '🚚 Sedang Dikirim' },
  { value: 'diterima', label: '🎉 Selesai' },
  { value: 'batal', label: 'Batal' },
];

const EMPTY_COUNTS: Record<StatusFilter, number> = {
  semua: 0,
  dikirim: 0,
  'belum ada': 0,
  wishlist: 0,
  po: 0,
  dp: 0,
  lunas: 0,
  diterima: 0,
  batal: 0,
};

function parseStatusFilter(raw?: string): StatusFilter {
  if (raw === 'dikirim') return 'po';
  if (raw === 'belum ada') return 'belum ada';
  if (raw && isPlanStatus(raw)) return raw;
  return 'semua';
}

function parseTipeFilter(raw?: string): TipeFilter {
  if (TIPE_OPTIONS.some((opt) => opt.value === raw)) return raw as TipeFilter;
  return 'semua';
}

function parseSortBy(raw?: string): SortBy {
  if (SORT_OPTIONS.some((opt) => opt.value === raw)) return raw as SortBy;
  return 'terbaru';
}

function compareBy(sortBy: SortBy) {
  return (a: KatalogItemWithDetails, b: KatalogItemWithDetails) => {
    switch (sortBy) {
      case 'judul':
        return a.judul.localeCompare(b.judul, 'id');
      case 'seri': {
        const seriCompare = (a.seri || '').localeCompare(b.seri || '', 'id');
        return seriCompare !== 0 ? seriCompare : (a.volume || 0) - (b.volume || 0);
      }
      case 'harga':
        return (b.estimasi_harga || 0) - (a.estimasi_harga || 0);
      case 'terbaru':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  };
}

interface KatalogClientProps {
  initialItems: KatalogItemWithDetails[];
  initialFilters?: {
    q?: string;
    status?: string;
    tipe?: string;
    sort?: string;
  };
  readOnly?: boolean;
}

export function KatalogClient({
  initialItems,
  initialFilters,
  readOnly = false,
}: KatalogClientProps) {
  const router = useRouter();
  const visibleSortOptions = useMemo(
    () => (readOnly ? SORT_OPTIONS.filter((opt) => opt.value !== 'harga') : SORT_OPTIONS),
    [readOnly]
  );

  // Filter & Search states (diinisialisasi dari URL query params)
  const [search, setSearch] = useState(initialFilters?.q ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(initialFilters?.status)
  );
  const [tipeFilter, setTipeFilter] = useState<TipeFilter>(() =>
    parseTipeFilter(initialFilters?.tipe)
  );
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy(initialFilters?.sort));
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KatalogItemWithDetails | null>(null);
  const [deletingItem, setDeletingItem] = useState<KatalogItemWithDetails | null>(null);
  const [trackingModalItem, setTrackingModalItem] = useState<KatalogItemWithDetails | null>(null);
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

  function updateFilters(next: {
    q?: string;
    status?: StatusFilter;
    tipe?: TipeFilter;
    sort?: SortBy;
  }) {
    const qVal = next.q !== undefined ? next.q : search;
    const statusVal = next.status !== undefined ? next.status : statusFilter;
    const tipeVal = next.tipe !== undefined ? next.tipe : tipeFilter;
    const sortVal = next.sort !== undefined ? next.sort : sortBy;

    setSearch(qVal);
    setStatusFilter(statusVal);
    setTipeFilter(tipeVal);
    setSortBy(sortVal);
    setVisibleCount(INITIAL_BATCH_SIZE);

    replaceQueryParams({
      q: qVal,
      status: statusVal,
      tipe: tipeVal,
      sort: sortVal,
    });
  }

  function isItemInDelivery(item: KatalogItemWithDetails): boolean {
    return (
      isShippingStatus(item.plan_status) ||
      (item.plan_id ? Boolean(trackingMap[item.plan_id]?.resi) : false)
    );
  }

  const statusCounts = useMemo(() => {
    const counts = { ...EMPTY_COUNTS, semua: initialItems.length };

    for (const item of initialItems) {
      if (isItemInDelivery(item)) {
        counts.po += 1;
      } else if (item.plan_status === 'wishlist') {
        counts.wishlist += 1;
      } else if (counts[item.plan_status] !== undefined) {
        counts[item.plan_status] += 1;
      }
    }

    return counts;
  }, [initialItems, trackingMap]);

  const seriesSummaries = useMemo(() => summarizeSeries(initialItems), [initialItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return initialItems
      .filter((item) => {
        if (q && !matchesSearch(item, q)) return false;
        if (statusFilter === 'po' || (statusFilter as string) === 'dikirim') {
          if (!isItemInDelivery(item)) return false;
        } else if (statusFilter === 'wishlist') {
          if (item.plan_status !== 'wishlist' || (item.plan_id && Boolean(trackingMap[item.plan_id]?.resi))) {
            return false;
          }
        } else if (statusFilter !== 'semua' && item.plan_status !== statusFilter) {
          return false;
        }
        if (tipeFilter !== 'semua' && item.tipe !== tipeFilter) return false;
        return true;
      })
      .sort(compareBy(sortBy));
  }, [initialItems, search, statusFilter, tipeFilter, sortBy, trackingMap]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount]
  );
  const hasMore = visibleCount < filteredItems.length;

  useEffect(() => {
    if (!hasMore) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + INITIAL_BATCH_SIZE, filteredItems.length));
        }
      },
      { rootMargin: '250px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filteredItems.length]);

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={search}
            onChange={(e) => updateFilters({ q: e.target.value })}
            onClear={() => updateFilters({ q: '' })}
            placeholder="Cari judul, seri, atau penerbit…"
          />
        </div>

        {!readOnly ? (
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto shadow-glass"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Tambah Item</span>
          </Button>
        ) : (
          <span className="inline-flex items-center self-start sm:self-auto rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
            Mode Publik · Hanya Baca
          </span>
        )}
      </div>

      {/* Series Summary Bar */}
      {seriesSummaries.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-700 mr-1">
            <Layers className="h-3.5 w-3.5 text-primary-500" aria-hidden="true" />
            Seri Koleksi:
          </span>
          {seriesSummaries.map(({ seri, totalVolumes }) => (
            <Link
              key={seri}
              href={`/katalog/seri/${encodeURIComponent(seri)}`}
              title={`Buka tracker volume seri ${seri}`}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-slate-200/80 bg-white/80 hover:bg-primary-50 hover:border-primary-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            >
              <span className="truncate max-w-[160px]">{seri}</span>
              <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                ({totalVolumes} vol)
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <FilterChip
            label="Semua"
            active={statusFilter === 'semua'}
            onClick={() => updateFilters({ status: 'semua' })}
            count={statusCounts.semua}
          />
          {STATUS_FILTERS.map(({ value, label }) => (
            <FilterChip
              key={value}
              label={label}
              active={statusFilter === value || (value === 'po' && (statusFilter as string) === 'dikirim')}
              onClick={() => updateFilters({ status: value })}
              count={statusCounts[value]}
            />
          ))}
        </div>

        {/* Secondary Filters (Tipe & Sorting) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Tipe:
            </span>
            <Select
              compact
              aria-label="Filter tipe komik"
              value={tipeFilter}
              onChange={(e) => updateFilters({ tipe: e.target.value as TipeFilter })}
              options={TIPE_OPTIONS}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              Urutkan:
            </span>
            <Select
              compact
              aria-label="Urutkan item"
              value={sortBy}
              onChange={(e) => updateFilters({ sort: e.target.value as SortBy })}
              options={visibleSortOptions}
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8 text-primary-400" />}
          title={
            initialItems.length === 0
              ? 'Katalog Komik Masih Kosong'
              : 'Tidak Ada Item yang Sesuai Filter'
          }
          description={
            initialItems.length === 0
              ? 'Mulai tambahkan komik pertama Anda secara manual atau gunakan fitur impor Shopee.'
              : 'Coba ubah kata kunci pencarian atau sesuaikan filter status.'
          }
          actionLabel={
            initialItems.length === 0
              ? readOnly
                ? undefined
                : '+ Tambah Komik Pertama'
              : 'Reset Filter'
          }
          onAction={
            initialItems.length === 0 && readOnly
              ? undefined
              : () => {
                  if (initialItems.length === 0) {
                    setIsCreateOpen(true);
                  } else {
                    updateFilters({ q: '', status: 'semua', tipe: 'semua' });
                  }
                }
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
            {visibleItems.map((item, idx) => (
              <GlassCard
                key={item.id}
                className="group relative flex flex-col p-2.5 sm:p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-glass-lg"
              >
                <div className="relative w-full">
                  <CoverImage
                    src={item.cover_url}
                    alt={item.judul}
                    title={item.judul}
                    priority={idx < 5}
                  />

                  {/* Status Pill Badge overlay on top-left */}
                  <div className="absolute top-2 left-2 z-10">
                    <StatusPill
                      status={item.plan_status}
                      size="sm"
                      className="backdrop-blur-md bg-white/90 shadow-2xs"
                    />
                  </div>

                  {/* Tipe tag overlay on top-right */}
                  {item.tipe && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="rounded-md bg-slate-900/60 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        {item.tipe}
                      </span>
                    </div>
                  )}

                  {/* Tracking Badge overlay on bottom */}
                  {item.plan_id && trackingMap[item.plan_id] && (
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                      <span className="inline-flex items-center gap-1 w-full justify-center rounded-lg bg-indigo-950/85 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold text-indigo-200 border border-indigo-400/30 shadow-xs">
                        <Truck className="h-2.5 w-2.5 text-indigo-400 shrink-0 animate-pulse" />
                        <span className="truncate">
                          {trackingMap[item.plan_id].isDelivered ? 'Paket Tiba' : 'Dalam Pengiriman'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-primary-700 transition-colors"
                      title={item.judul}
                    >
                      {item.judul}
                    </h3>

                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 font-medium">
                      {item.seri ? (
                        <Link
                          href={`/katalog/seri/${encodeURIComponent(item.seri)}`}
                          className="hover:text-primary-600 hover:underline flex items-center gap-1 text-slate-600 font-semibold truncate max-w-[130px]"
                          title={`Lihat seluruh volume seri ${item.seri}`}
                        >
                          <Layers className="h-3 w-3 shrink-0 text-primary-500" />
                          <span className="truncate">{item.seri}</span>
                        </Link>
                      ) : (
                        <span>Non-seri</span>
                      )}

                      {item.volume !== null && (
                        <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] font-bold text-slate-700">
                          Vol {item.volume}
                        </span>
                      )}
                    </div>

                    {item.penerbit && (
                      <p className="mt-0.5 text-[10px] text-slate-400 truncate">{item.penerbit}</p>
                    )}

                    {/* Tombol Lacak Pesanan Langsung jika Item Memiliki Tracking Aktif */}
                    {item.plan_id && trackingMap[item.plan_id] && (
                      <button
                        type="button"
                        onClick={() => setTrackingModalItem(item)}
                        title="Klik untuk melihat detail pelacakan kurir Binderbyte"
                        className="mt-2 w-full inline-flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-indigo-50/90 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors text-[10px] font-bold shadow-2xs group/btn cursor-pointer"
                      >
                        <span className="flex items-center gap-1 truncate">
                          <Truck className="h-3 w-3 shrink-0 text-indigo-600 group-hover/btn:scale-110 transition-transform" />
                          <span className="truncate">
                            {trackingMap[item.plan_id].courier.toUpperCase()}: {trackingMap[item.plan_id].resi}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-[8px] px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                            trackingMap[item.plan_id].isDelivered
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {trackingMap[item.plan_id].isDelivered ? 'Tiba' : 'Lacak'}
                        </span>
                      </button>
                    )}
                  </div>

                  {!readOnly && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {displayPrice(item) ?? (
                          <span className="text-[10px] font-normal text-slate-400">
                            Belum ada harga
                          </span>
                        )}
                      </span>

                      <div className="flex items-center">
                        {item.plan_id && !trackingMap[item.plan_id] && item.plan_status !== 'diterima' && item.plan_status !== 'batal' && (
                          <IconAction
                            label={`Mulai lacak pesanan ${item.judul}`}
                            onClick={() => setTrackingModalItem(item)}
                          >
                            <Truck className="h-3.5 w-3.5 text-indigo-600" />
                          </IconAction>
                        )}
                        <IconAction
                          label={`Edit ${item.judul}`}
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </IconAction>
                        <IconAction
                          label={`Hapus ${item.judul}`}
                          onClick={() => setDeletingItem(item)}
                          tone="danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconAction>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}

            {hasMore &&
              Array.from({ length: Math.min(5, filteredItems.length - visibleCount) }).map(
                (_, idx) => <ComicCardSkeleton key={`skeleton-more-${idx}`} />
              )}
          </div>

          {hasMore && (
            <div ref={loadMoreRef} className="flex flex-col items-center justify-center pt-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setVisibleCount((prev) => Math.min(prev + INITIAL_BATCH_SIZE, filteredItems.length))
                }
              >
                Muat Lebih Banyak ({filteredItems.length - visibleCount} tersisa)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal di-remount per item (key) supaya form mulai dari state kosong
          setiap kali dibuka, tanpa effect yang menyalin props ke state. */}
      {isCreateOpen && (
        <ItemModal key="create" isOpen onClose={() => setIsCreateOpen(false)} onSuccess={handleRefresh} />
      )}

      {editingItem && (
        <ItemModal
          key={editingItem.id}
          isOpen
          onClose={() => setEditingItem(null)}
          onSuccess={handleRefresh}
          initialData={toItemFormData(editingItem)}
        />
      )}

      {deletingItem && (
        <DeleteModal
          isOpen
          onClose={() => setDeletingItem(null)}
          onSuccess={handleRefresh}
          item={{ id: deletingItem.id, judul: deletingItem.judul, seri: deletingItem.seri }}
        />
      )}

      {trackingModalItem && trackingModalItem.plan_id && (
        <OrderTrackingModal
          key={trackingModalItem.id}
          isOpen
          onClose={() => setTrackingModalItem(null)}
          planId={trackingModalItem.plan_id}
          itemTitle={trackingModalItem.judul}
          volume={trackingModalItem.volume}
          currentStatus={
            trackingModalItem.plan_status !== 'belum ada'
              ? trackingModalItem.plan_status
              : 'wishlist'
          }
          initialCourier={trackingMap[trackingModalItem.plan_id]?.courier || 'spx'}
          initialResi={trackingMap[trackingModalItem.plan_id]?.resi || ''}
          onOrderCompleted={() => {
            refreshTrackingMap();
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}

function matchesSearch(item: KatalogItemWithDetails, q: string): boolean {
  return (
    item.judul.toLowerCase().includes(q) ||
    (item.seri?.toLowerCase().includes(q) ?? false) ||
    (item.volume !== null && String(item.volume).includes(q)) ||
    (item.penerbit?.toLowerCase().includes(q) ?? false)
  );
}

/** Estimasi plan lebih relevan; fallback ke harga listing termurah. */
function displayPrice(item: KatalogItemWithDetails): string | null {
  return formatRupiahOrNull(item.estimasi_harga) ?? formatRupiahOrNull(item.listing_harga);
}

function toItemFormData(item: KatalogItemWithDetails) {
  return {
    id: item.id,
    judul: item.judul,
    seri: item.seri,
    volume: item.volume,
    penerbit: item.penerbit,
    tipe: item.tipe,
    cover_url: item.cover_url,
    status: item.plan_status,
    estimasi_harga: item.estimasi_harga,
  };
}

interface IconActionProps {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}

function IconAction({ label, onClick, tone = 'default', children }: IconActionProps) {
  const toneClasses =
    tone === 'danger'
      ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
      : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${toneClasses}`}
    >
      {children}
    </button>
  );
}
