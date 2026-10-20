'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterChip } from '@/components/ui/FilterChip';
import { Select } from '@/components/ui/Select';
import { StatusPill } from '@/components/ui/StatusPill';
import { CoverImage } from '@/components/ui/CoverImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemModal } from '@/components/katalog/ItemModal';
import { DeleteModal } from '@/components/katalog/DeleteModal';
import { formatRupiahOrNull } from '@/lib/format';
import { PLAN_STATUSES, STATUS_LABELS, isPlanStatus } from '@/lib/plans';
import { replaceQueryParams } from '@/lib/url';
import type { ItemType } from '@/types/database';
import {
  summarizeSeries,
  type ExtendedStatus,
  type KatalogItemWithDetails,
} from '@/lib/catalog';

type TipeFilter = ItemType | 'semua';
type SortBy = 'terbaru' | 'judul' | 'seri' | 'harga';
type StatusFilter = ExtendedStatus | 'semua';

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
  ...PLAN_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

const EMPTY_COUNTS: Record<StatusFilter, number> = {
  semua: 0,
  'belum ada': 0,
  wishlist: 0,
  po: 0,
  dp: 0,
  lunas: 0,
  diterima: 0,
  batal: 0,
};

function parseStatusFilter(raw?: string): StatusFilter {
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
}

export function KatalogClient({ initialItems, initialFilters }: KatalogClientProps) {
  const router = useRouter();

  // Filter & Search states (diinisialisasi dari URL query params)
  const [search, setSearch] = useState(initialFilters?.q ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(initialFilters?.status)
  );
  const [tipeFilter, setTipeFilter] = useState<TipeFilter>(() =>
    parseTipeFilter(initialFilters?.tipe)
  );
  const [sortBy, setSortBy] = useState<SortBy>(() => parseSortBy(initialFilters?.sort));

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KatalogItemWithDetails | null>(null);
  const [deletingItem, setDeletingItem] = useState<KatalogItemWithDetails | null>(null);

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

    replaceQueryParams({
      q: qVal,
      status: statusVal,
      tipe: tipeVal,
      sort: sortVal,
    });
  }

  const statusCounts = useMemo(() => {
    const counts = { ...EMPTY_COUNTS, semua: initialItems.length };

    for (const item of initialItems) {
      if (counts[item.plan_status] !== undefined) {
        counts[item.plan_status] += 1;
      }
    }

    return counts;
  }, [initialItems]);

  const seriesSummaries = useMemo(() => summarizeSeries(initialItems), [initialItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return initialItems
      .filter((item) => {
        if (q && !matchesSearch(item, q)) return false;
        if (statusFilter !== 'semua' && item.plan_status !== statusFilter) return false;
        if (tipeFilter !== 'semua' && item.tipe !== tipeFilter) return false;
        return true;
      })
      .sort(compareBy(sortBy));
  }, [initialItems, search, statusFilter, tipeFilter, sortBy]);

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

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto shadow-glass"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Tambah Item</span>
        </Button>
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
              active={statusFilter === value}
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
              options={SORT_OPTIONS}
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
          actionLabel={initialItems.length === 0 ? '+ Tambah Komik Pertama' : 'Reset Filter'}
          onAction={() => {
            if (initialItems.length === 0) {
              setIsCreateOpen(true);
            } else {
              updateFilters({ q: '', status: 'semua', tipe: 'semua' });
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
          {filteredItems.map((item) => (
            <GlassCard
              key={item.id}
              className="group relative flex flex-col p-2.5 sm:p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-glass-lg"
            >
              <div className="relative w-full">
                <CoverImage src={item.cover_url} alt={item.judul} title={item.judul} />

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
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    {displayPrice(item) ?? (
                      <span className="text-[10px] font-normal text-slate-400">
                        Belum ada harga
                      </span>
                    )}
                  </span>

                  <div className="flex items-center">
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
              </div>
            </GlassCard>
          ))}
        </div>
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
