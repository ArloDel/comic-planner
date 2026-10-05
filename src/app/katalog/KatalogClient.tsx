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
import { StatusPill, type ExtendedStatus } from '@/components/ui/StatusPill';
import { CoverImage } from '@/components/ui/CoverImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { ItemModal } from '@/components/katalog/ItemModal';
import { DeleteModal } from '@/components/katalog/DeleteModal';
import type { ItemType, PlanStatus } from '@/types/database';

export interface KatalogItemWithDetails {
  id: string;
  judul: string;
  seri: string | null;
  volume: number | null;
  penerbit: string | null;
  tipe: ItemType | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  plan_status: ExtendedStatus;
  estimasi_harga?: number;
  listing_harga?: number | null;
}

interface KatalogClientProps {
  initialItems: KatalogItemWithDetails[];
}

export function KatalogClient({ initialItems }: KatalogClientProps) {
  const router = useRouter();

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExtendedStatus | 'semua'>('semua');
  const [tipeFilter, setTipeFilter] = useState<ItemType | 'semua'>('semua');
  const [sortBy, setSortBy] = useState<'terbaru' | 'judul' | 'seri' | 'harga'>('terbaru');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KatalogItemWithDetails | null>(null);
  const [deletingItem, setDeletingItem] = useState<KatalogItemWithDetails | null>(null);

  // Status counts for filter chips
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      semua: initialItems.length,
      'belum ada': 0,
      wishlist: 0,
      po: 0,
      dp: 0,
      lunas: 0,
      diterima: 0,
      batal: 0,
    };

    initialItems.forEach((item) => {
      const st = item.plan_status;
      if (counts[st] !== undefined) {
        counts[st]++;
      }
    });

    return counts;
  }, [initialItems]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = [...initialItems];

    // 1. Search text (judul, seri, volume, penerbit)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.judul.toLowerCase().includes(q) ||
          (item.seri && item.seri.toLowerCase().includes(q)) ||
          (item.volume !== null && String(item.volume).includes(q)) ||
          (item.penerbit && item.penerbit.toLowerCase().includes(q))
      );
    }

    // 2. Status filter
    if (statusFilter !== 'semua') {
      result = result.filter((item) => item.plan_status === statusFilter);
    }

    // 3. Tipe filter
    if (tipeFilter !== 'semua') {
      result = result.filter((item) => item.tipe === tipeFilter);
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === 'terbaru') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'judul') {
        return a.judul.localeCompare(b.judul, 'id');
      }
      if (sortBy === 'seri') {
        const seriCompare = (a.seri || '').localeCompare(b.seri || '', 'id');
        if (seriCompare !== 0) return seriCompare;
        return (a.volume || 0) - (b.volume || 0);
      }
      if (sortBy === 'harga') {
        return (b.estimasi_harga || 0) - (a.estimasi_harga || 0);
      }
      return 0;
    });

    return result;
  }, [initialItems, search, statusFilter, tipeFilter, sortBy]);

  function formatRupiah(amount?: number | null) {
    if (!amount || amount <= 0) return null;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

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
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Cari judul, seri, atau penerbit..."
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto shadow-glass"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Tambah Item</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="space-y-3">
        {/* Status Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <FilterChip
            label="Semua"
            active={statusFilter === 'semua'}
            onClick={() => setStatusFilter('semua')}
            count={statusCounts.semua}
          />
          <FilterChip
            label="Belum Ada"
            active={statusFilter === 'belum ada'}
            onClick={() => setStatusFilter('belum ada')}
            count={statusCounts['belum ada']}
          />
          <FilterChip
            label="Wishlist"
            active={statusFilter === 'wishlist'}
            onClick={() => setStatusFilter('wishlist')}
            count={statusCounts.wishlist}
          />
          <FilterChip
            label="PO"
            active={statusFilter === 'po'}
            onClick={() => setStatusFilter('po')}
            count={statusCounts.po}
          />
          <FilterChip
            label="DP"
            active={statusFilter === 'dp'}
            onClick={() => setStatusFilter('dp')}
            count={statusCounts.dp}
          />
          <FilterChip
            label="Lunas"
            active={statusFilter === 'lunas'}
            onClick={() => setStatusFilter('lunas')}
            count={statusCounts.lunas}
          />
          <FilterChip
            label="Punya"
            active={statusFilter === 'diterima'}
            onClick={() => setStatusFilter('diterima')}
            count={statusCounts.diterima}
          />
        </div>

        {/* Secondary Filters (Tipe & Sorting) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Tipe:
            </span>
            <select
              value={tipeFilter}
              onChange={(e) => setTipeFilter(e.target.value as any)}
              className="bg-white/80 backdrop-blur border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="semua">Semua Tipe</option>
              <option value="manga">Manga</option>
              <option value="manhua">Manhua</option>
              <option value="manhwa">Manhwa</option>
              <option value="komik lokal">Komik Lokal</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              Urutkan:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white/80 backdrop-blur border border-slate-200 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="terbaru">Terbaru Ditambahkan</option>
              <option value="judul">Judul (A-Z)</option>
              <option value="seri">Seri & Volume</option>
              <option value="harga">Estimasi Harga Tertinggi</option>
            </select>
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
              ? '+ Tambah Komik Pertama'
              : 'Reset Filter'
          }
          onAction={() => {
            if (initialItems.length === 0) {
              setIsCreateOpen(true);
            } else {
              setSearch('');
              setStatusFilter('semua');
              setTipeFilter('semua');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
          {filteredItems.map((item) => {
            const displayPrice =
              formatRupiah(item.estimasi_harga) ||
              formatRupiah(item.listing_harga);

            return (
              <GlassCard
                key={item.id}
                className="group relative flex flex-col p-2.5 sm:p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-glass-lg"
              >
                {/* Cover & Overlay Status */}
                <div className="relative w-full">
                  <CoverImage
                    src={item.cover_url}
                    alt={item.judul}
                    title={item.judul}
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
                </div>

                {/* Content details */}
                <div className="mt-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title */}
                    <h3
                      className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-primary-700 transition-colors"
                      title={item.judul}
                    >
                      {item.judul}
                    </h3>

                    {/* Series & Volume metadata */}
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

                    {/* Publisher */}
                    {item.penerbit && (
                      <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                        {item.penerbit}
                      </p>
                    )}
                  </div>

                  {/* Bottom info: Price & Actions */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      {displayPrice || (
                        <span className="text-[10px] font-normal text-slate-400">
                          Belum ada harga
                        </span>
                      )}
                    </span>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        aria-label={`Edit ${item.judul}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        aria-label={`Hapus ${item.judul}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Item Modal (Create) */}
      <ItemModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Item Modal (Edit) */}
      {editingItem && (
        <ItemModal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onSuccess={handleRefresh}
          initialData={{
            id: editingItem.id,
            judul: editingItem.judul,
            seri: editingItem.seri,
            volume: editingItem.volume,
            penerbit: editingItem.penerbit,
            tipe: editingItem.tipe,
            cover_url: editingItem.cover_url,
            status: editingItem.plan_status,
            estimasi_harga: editingItem.estimasi_harga,
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <DeleteModal
          isOpen={Boolean(deletingItem)}
          onClose={() => setDeletingItem(null)}
          onSuccess={handleRefresh}
          item={{
            id: deletingItem.id,
            judul: deletingItem.judul,
            seri: deletingItem.seri,
          }}
        />
      )}
    </div>
  );
}
